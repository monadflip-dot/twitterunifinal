import React, { useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, twitterProvider } from './firebase';
import favicon from './assets/favicon.png';

const API_URL = import.meta.env.VITE_API_URL || 'https://www.pfcwhitelist.xyz';

export default function LoginPage() {
	useEffect(() => {
		// Handle redirect result if user came from redirect
		const handleRedirectResult = async () => {
			try {
				const result = await getRedirectResult(auth);
				if (result) {
					console.log('🔄 Redirect result received, processing...');
					await handleResult(result);
				}
			} catch (error) {
				console.error('Error handling redirect result:', error);
			}
		};

		handleRedirectResult();
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
			console.log('🔄 Redirecting to:', `${API_URL}/auth/twitter`);
			window.location.href = `${API_URL}/auth/twitter`;
			
		} catch (error) {
			console.error('💥 Error in handleResult:', error);
			alert('Error during authentication. Please try again.');
		}
	};

	const handleTwitterLogin = async () => {
		try {
			console.log('🐦 Starting Twitter login...');
			
			// Try popup first (better UX)
			try {
				console.log('🔄 Attempting popup login...');
				const result = await signInWithPopup(auth, twitterProvider);
				console.log('✅ Popup login successful');
				await handleResult(result);
			} catch (popupError) {
				console.log('⚠️ Popup failed, falling back to redirect:', popupError?.code);
				
				// Fallback to redirect
				console.log('🔄 Falling back to redirect login...');
				await signInWithRedirect(auth, twitterProvider);
			}
		} catch (err) {
			console.error('💥 Twitter login failed:', err?.code, err?.message);
			alert('Twitter login failed. Please try again.');
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
