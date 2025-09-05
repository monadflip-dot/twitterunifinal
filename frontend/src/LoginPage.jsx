import React, { useEffect } from 'react';
import favicon from '../images/favicon.png';
import { auth, twitterProvider } from './firebase';
import { getAdditionalUserInfo, TwitterAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup } from 'firebase/auth';

function LoginPage() {
	// Procesar resultado de redirect si existe
	useEffect(() => {
		(async () => {
			try {
				const result = await getRedirectResult(auth);
				if (result) {
					console.log('✅ Twitter login successful via redirect');
					await handleResult(result);
				}
			} catch (e) {
				console.error('Firebase Twitter redirect failed:', e?.code, e?.message);
			}
		})();
	}, []);

	const handleResult = async (result) => {
		try {
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
			
			// Get Firebase ID token
			const idToken = await firebaseUser.getIdToken();
			
			console.log('🔑 Exchanging Firebase token for JWT...');
			
			// Call our auth API to get JWT token
			const response = await fetch('/api/auth', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
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
				console.log('✅ JWT token stored, authentication successful');
				
				// Reload the page to trigger App.jsx auth check
				window.location.reload();
			} else {
				const errorData = await response.json();
				console.error('❌ Auth API failed:', response.status, errorData);
				alert(`Authentication failed: ${errorData.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('❌ Error processing login result:', error);
			alert('Error processing login. Please try again.');
		}
	};

	const handleTwitterLogin = async () => {
		try {
			// Limpia posibles estados previos de Firebase redirect
			try {
				Object.keys(window.localStorage || {}).forEach((k) => {
					if (k.startsWith('firebase:')) localStorage.removeItem(k);
				});
				console.log('🧹 Firebase localStorage cleaned');
			} catch {}
			
			console.log('🚀 Starting Twitter login...');
			console.log('🔍 Current Firebase auth state:', auth.currentUser ? 'User logged in' : 'No user');
			
			// Popup primero (mejor UX). Si falla, fallback a redirect
			const result = await signInWithPopup(auth, twitterProvider);
			console.log('✅ Popup login successful, processing result...');
			console.log('👤 User data from popup:', result.user?.displayName, result.user?.uid);
			await handleResult(result);
		} catch (err) {
			console.error('❌ Popup login failed:', err?.code, err?.message);
			console.error('🔍 Full error object:', err);
			
			// Detectar errores específicos de OAuth
			if (err?.code === 'auth/popup-closed-by-user') {
				alert('Login popup was closed. Please try again.');
				return;
			}
			
			if (err?.code === 'auth/account-exists-with-different-credential') {
				alert('This account is already linked to another login method. Please use the original method.');
				return;
			}
			
			if (err?.code === 'auth/operation-not-allowed') {
				alert('Twitter login is not enabled. Please contact support.');
				return;
			}
			
			console.log('🔄 Falling back to redirect login...');
			try {
				await signInWithRedirect(auth, twitterProvider);
				console.log('✅ Redirect login initiated');
			} catch (e) {
				console.error('❌ Redirect login also failed:', e?.code, e?.message);
				console.error('🔍 Full redirect error:', e);
				
				// Mensaje más específico para el usuario
				if (e?.code === 'auth/network-request-failed') {
					alert('Network error. Please check your internet connection and try again.');
				} else if (e?.code === 'auth/too-many-requests') {
					alert('Too many login attempts. Please wait a few minutes and try again.');
				} else if (e?.code === 'auth/popup-blocked') {
					alert('Popup was blocked. Please allow popups for this site and try again.');
				} else {
					alert(`Twitter login failed: ${e?.message || 'Unknown error'}. Please try again or contact support.`);
				}
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
