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
			
			// Verificar si ya tenemos un JWT token válido
			const existingToken = localStorage.getItem('jwt_token');
			if (existingToken) {
				console.log('✅ User already has JWT token, redirecting to dashboard');
				window.location.replace('/dashboard');
				return;
			}
			
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
					console.log('✅ JWT token stored, redirecting to dashboard');
					window.location.replace('/dashboard');
				}
			} catch (e) {
				console.error('Auth state sync failed:', e?.code, e?.message);
			}
		});
		return () => unsub();
	}, []);

	const handleResult = async (result) => {
		const firebaseUser = result.user;
		let accessToken = null;
		let accessSecret = null;
		try {
			const cred = TwitterAuthProvider.credentialFromResult(result);
			accessToken = cred?.accessToken || null;
			accessSecret = cred?.secret || null;
		} catch (e) {
			console.warn('No Twitter credential extracted:', e?.message || e);
		}
		const info = getAdditionalUserInfo(result);
		const screenName = info?.username || firebaseUser?.reloadUserInfo?.screenName || firebaseUser?.displayName || 'user';
		const idToken = await firebaseUser.getIdToken();
		const response = await fetch(`${API_URL}/api/auth`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				idToken,
				twitterAccessToken: accessToken,
				twitterAccessSecret: accessSecret,
				profile: {
					uid: firebaseUser.uid,
					displayName: firebaseUser.displayName,
					photoURL: firebaseUser.photoURL,
					email: firebaseUser.email,
					screenName
				}
			})
		});
		
		if (response.ok) {
			const data = await response.json();
			// Store JWT token in localStorage
			localStorage.setItem('jwt_token', data.token);
			console.log('✅ Login successful, JWT token stored');
			// Redirigir al dashboard en lugar de hacer reload
			window.location.replace('/dashboard');
		} else {
			console.error('❌ Auth failed:', response.status);
			alert('Authentication failed. Please try again.');
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
			
			console.log('🚀 Starting Twitter login...');
			
			// Popup primero (mejor UX). Si falla, fallback a redirect
			const result = await signInWithPopup(auth, twitterProvider);
			console.log('✅ Popup login successful, processing result...');
			await handleResult(result);
			// No hacer reload, handleResult ya redirige
		} catch (err) {
			console.error('❌ Popup login failed, falling back to redirect:', err?.code, err?.message);
			try {
				await signInWithRedirect(auth, twitterProvider);
			} catch (e) {
				console.error('❌ Redirect login also failed:', e);
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
