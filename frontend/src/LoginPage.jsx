import React, { useEffect } from 'react';
import favicon from '../images/favicon.png';
import { auth, twitterProvider } from './firebase';
import { getAdditionalUserInfo, TwitterAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signInWithPopup } from 'firebase/auth';

function LoginPage() {
	// Procesar resultado de redirect si existe
	useEffect(() => {
		(async () => {
			try {
				const result = await getRedirectResult(auth);
				if (result) {
					console.log('✅ Twitter login successful via redirect');
					// No need to do anything else, Firebase auth state will handle the rest
				}
			} catch (e) {
				console.error('Firebase Twitter redirect failed:', e?.code, e?.message);
			}
		})();
	}, []);

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
			console.log('✅ Popup login successful');
			// No need to do anything else, Firebase auth state will handle the rest
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
