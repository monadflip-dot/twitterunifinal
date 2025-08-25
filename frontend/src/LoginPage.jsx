import React, { useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, twitterProvider } from './firebase';
import favicon from '../images/favicon.png';

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
			
			// Get Twitter access token from Firebase result
			const credential = result.credential;
			const accessToken = credential?.accessToken;
			const accessSecret = credential?.secret;
			
			console.log('🔑 Twitter access token obtained:', !!accessToken);
			
			if (!accessToken) {
				console.log('⚠️ No Twitter access token, user needs to reconnect Twitter');
				alert('Twitter access token not found. Please try logging in again.');
				return;
			}
			
			// Get user profile from Twitter
			const profile = {
				id_str: result.user.providerData[0]?.uid,
				screen_name: result.user.providerData[0]?.screenName,
				name: result.user.providerData[0]?.displayName,
				photoURL: result.user.providerData[0]?.photoURL
			};
			
			console.log('👤 User profile:', profile);
			
			// Get Firebase ID token
			const idToken = await result.user.getIdToken();
			
			// Send to backend for JWT generation
			const response = await fetch('/api/auth/firebase', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					idToken,
					twitterAccessToken: accessToken,
					twitterAccessSecret: accessSecret,
					profile
				}),
			});
			
			if (response.ok) {
				const data = await response.json();
				console.log('✅ Backend authentication successful');
				
				// Save JWT token
				localStorage.setItem('jwt_token', data.token);
				
				// Redirect to dashboard or reload page
				window.location.reload();
				
			} else {
				console.error('❌ Backend authentication failed:', response.status);
				const errorData = await response.json();
				alert('Authentication failed: ' + (errorData.error || 'Unknown error'));
			}
			
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
