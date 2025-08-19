import React, { useEffect } from 'react';
import favicon from '../images/favicon.png';
import { auth, twitterProvider } from './firebase';
import { getAdditionalUserInfo, TwitterAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';

const API_URL = process.env.REACT_APP_API_URL || 'https://twitterunifinal.onrender.com';

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
				await fetch(`${API_URL}/auth/firebase`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
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
				window.location.replace('/');
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
		await fetch(`${API_URL}/auth/firebase`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
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
	};

	const handleTwitterLogin = async () => {
		try {
			// Asegurar estado limpio
			try { await signOut(auth); } catch {}
			await signInWithRedirect(auth, twitterProvider);
		} catch (err) {
			console.error('Twitter redirect start failed:', err?.code, err?.message);
			alert('Twitter login failed. Please try again.');
		}
	};

	return (
		<div className="login-container">
			<div className="login-background">
				<div className="login-panel">
					<div className="login-header">
						<h1>TWITTER MISSIONS</h1>
						<div className="header-separator"></div>
					</div>
					
					<div className="login-content">
						<div className="icon-circle">
							<img src={favicon} alt="Logo" style={{ width: '50px', height: '50px' }} />
						</div>
						<h1>Twitter Missions</h1>
						<p className="login-subtitle">Complete missions and earn points on Twitter</p>
						<button className="twitter-login-btn" onClick={handleTwitterLogin}>
							<i className="fab fa-twitter"></i>
							Login with Twitter
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default LoginPage;
