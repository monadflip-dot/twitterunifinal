import React, { useEffect } from 'react';
import favicon from '../images/favicon.png';
import { auth, twitterProvider } from './firebase';
import { getAdditionalUserInfo, TwitterAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signInWithPopup } from 'firebase/auth';

const API_URL = process.env.REACT_APP_API_URL || '';

function LoginPage() {
	// Procesar resultado de redirect si existe
	useEffect(() => {
		(async () => {
			try {
				const result = await getRedirectResult(auth);
				if (result) {
					await handleResult(result);
					window.location.reload();
				}
			} catch (e) {
				console.error('Firebase Twitter redirect failed:', e?.code, e?.message);
			}
		})();
	}, []);

	// Fallback: si ya hay usuario autenticado en Firebase pero no se procesó el resultado
	useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
			if (!firebaseUser) return;
			try {
				const idToken = await firebaseUser.getIdToken();
				const response = await fetch(`${API_URL}/api/auth`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						idToken,
						profile: {
							uid: firebaseUser.uid,
							displayName: firebaseUser.displayName,
							photoURL: firebaseUser.photoURL,
							email: firebaseUser.email
						}
					})
				});
				
				if (response.ok) {
					const data = await response.json();
					// Store JWT token in localStorage
					localStorage.setItem('jwt_token', data.token);
				}
				window.location.replace('/');
			} catch (e) {
				console.error('Auth state sync failed:', e?.code, e?.message);
			}
		});
		return () => unsub();
	}, []);

	const handleResult = async (result) => {
		try {
			console.log('🔐 Firebase auth result received');
			console.log('👤 User:', result.user?.displayName);
			console.log('🔑 Access token exists:', !!result.credential?.accessToken);
			
			// 🔍 NEW: Always redirect to backend Twitter OAuth
			// Firebase Auth with Twitter doesn't reliably provide access tokens
			// So we'll use our backend's direct Twitter OAuth flow
			console.log('🔄 Firebase auth successful, redirecting to backend Twitter OAuth...');
			
			// Store basic user info temporarily
			if (result.user) {
				localStorage.setItem('temp_user_info', JSON.stringify({
					uid: result.user.uid,
					displayName: result.user.displayName,
					photoURL: result.user.photoURL,
					email: result.user.email
				}));
			}
			
			// Redirect to backend Twitter OAuth
			window.location.href = `${API_URL}/auth/twitter`;
			
		} catch (error) {
			console.error('💥 Error in handleResult:', error);
			alert('Error during authentication. Please try again.');
		}
	};

	const handleTwitterLogin = async () => {
		try {
			// Limpia posibles estados previos de Firebase redirect
			try {
				Object.keys(window.localStorage || {}).forEach((k) => {
					if (k.startsWith('firebase:')) localStorage.removeItem(k);
				});
			} catch {}
			// Popup primero (mejor UX). Si falla, fallback a redirect
			const result = await signInWithPopup(auth, twitterProvider);
			await handleResult(result);
			window.location.reload();
		} catch (err) {
			console.error('Popup login failed, falling back to redirect:', err?.code, err?.message);
			try {
				await signInWithRedirect(auth, twitterProvider);
			} catch (e) {
				alert('Twitter login failed. Please try again.');
			}
		}
	};

	return (
		<div className="login-container">
			<div className="login-background wooden-panel">
				<div className="login-panel">
					<div className="login-header">
						<h1>PENGUIN FISHING CLUB</h1>
					</div>
					
					<div className="login-content">
						<div className="icon-circle">
							<img src={favicon} alt="Logo" style={{ width: '50px', height: '50px' }} />
						</div>
						<p className="login-subtitle">whitelist missions</p>
						<p className="login-description">Complete missions and win whitelist for Penguin fishing club mint.</p>
						<button className="twitter-login-btn" onClick={handleTwitterLogin}>
							<i className="fab fa-twitter"></i>
							Login with Twitter
						</button>
					</div>
				</div>
				<div className="bottom-left"></div>
				<div className="bottom-right"></div>
			</div>
		</div>
	);
}

export default LoginPage;
