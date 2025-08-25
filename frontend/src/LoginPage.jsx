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
			
			const idToken = result.credential?.accessToken;
			const accessToken = result.credential?.accessToken;
			const accessSecret = result.credential?.accessSecret;
			
			if (!idToken) {
				alert('No se pudo obtener el token de Firebase. Por favor, intenta de nuevo.');
				return;
			}
			
			console.log('📱 Sending auth request to backend...');
			const response = await fetch(`${API_URL}/api/auth/firebase`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					idToken,
					twitterAccessToken: accessToken,
					twitterAccessSecret: accessSecret,
					profile: {
						screenName: result.user?.displayName,
						displayName: result.user?.displayName,
						photoURL: result.user?.photoURL,
						id: result.user?.uid
					}
				})
			});
			
			console.log('📡 Backend response status:', response.status);
			
			if (response.ok) {
				const data = await response.json();
				console.log('✅ Backend auth response:', data);
				
				if (data.success) {
					// Store the JWT token from backend response
					if (data.token) {
						localStorage.setItem('jwt_token', data.token);
						console.log('✅ JWT token stored in localStorage');
						console.log('🎫 Token (first 50 chars):', data.token.substring(0, 50) + '...');
					} else {
						console.log('⚠️ No token received from backend');
					}
					
					alert('¡Autenticación exitosa!');
					window.location.reload();
				} else if (data.action === 'redirect_to_twitter') {
					console.log('🔄 Redirecting to Twitter OAuth...');
					window.location.href = `${API_URL}/auth/twitter`;
				} else {
					alert('Error en la autenticación: ' + (data.message || 'Error desconocido'));
				}
			} else {
				const errorText = await response.text();
				console.error('❌ Backend auth failed:', response.status, errorText);
				alert('Error en la autenticación del backend. Por favor, intenta de nuevo.');
			}
		} catch (error) {
			console.error('💥 Error in handleResult:', error);
			alert('Error durante la autenticación. Por favor, intenta de nuevo.');
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
