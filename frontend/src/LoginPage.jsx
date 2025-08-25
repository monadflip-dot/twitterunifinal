import React, { useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, twitterProvider } from './firebase';
import favicon from '../images/favicon.png';

const API_URL = 'https://www.pfcwhitelist.xyz';

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

	// Clear Firebase auth state to resolve token issues
	const clearAuthState = async () => {
		try {
			console.log('🧹 Clearing Firebase auth state...');
			await signOut(auth);
			console.log('✅ Auth state cleared');
		} catch (error) {
			console.log('⚠️ Error clearing auth state:', error);
		}
	};

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

	// Check if user already has an active Twitter session
	const checkExistingTwitterSession = async () => {
		try {
			console.log('🔍 Checking for existing Twitter session...');
			
			// Check if we have a stored JWT token
			const existingToken = localStorage.getItem('jwt_token');
			if (existingToken) {
				console.log('✅ Found existing JWT token, checking validity...');
				
				// Verify token with backend
				const response = await fetch('/api/user', {
					headers: {
						'Authorization': `Bearer ${existingToken}`
					}
				});
				
				if (response.ok) {
					console.log('✅ Existing token is valid, user already authenticated');
					return true;
				} else {
					console.log('⚠️ Existing token expired, removing...');
					localStorage.removeItem('jwt_token');
				}
			}
			
			// Check if Firebase has an active user
			const currentUser = auth.currentUser;
			if (currentUser && currentUser.providerData.some(provider => provider.providerId === 'twitter.com')) {
				console.log('✅ Found active Firebase user with Twitter provider');
				return true;
			}
			
			console.log('❌ No active Twitter session found');
			return false;
		} catch (error) {
			console.error('💥 Error checking existing session:', error);
			return false;
		}
	};

	const handleTwitterLogin = async () => {
		try {
			console.log('🐦 Starting Twitter OAuth 2.0 login...');
			
			// Check for existing session first
			const hasExistingSession = await checkExistingTwitterSession();
			if (hasExistingSession) {
				console.log('🔄 Using existing session, redirecting to dashboard...');
				window.location.reload();
				return;
			}
			
			// Start OAuth 2.0 flow - this will detect existing Twitter session
			console.log('🔗 Starting OAuth 2.0 authorization flow...');
			
			// Get authorization URL from backend
			const authResponse = await fetch('/api/auth/twitter/authorize');
			
			if (!authResponse.ok) {
				throw new Error('Failed to get authorization URL');
			}
			
			const authData = await authResponse.json();
			console.log('🔗 OAuth 2.0 authorization URL received');
			
			// Redirect user to Twitter authorization
			// Twitter will detect existing session and only ask for app authorization
			window.location.href = authData.authUrl;
			
		} catch (err) {
			console.error('💥 Twitter OAuth 2.0 login failed:', err);
			alert('Error en el login de Twitter: ' + err.message);
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
						
						{/* Botón de reset para problemas de autenticación */}
						<button 
							className="reset-btn" 
							onClick={clearAuthState}
							style={{
								marginTop: '10px',
								padding: '8px 16px',
								backgroundColor: '#666',
								color: 'white',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '12px'
							}}
						>
							🔄 Reset Auth State
						</button>
					</div>
				</div>
				<div className="bottom-left"></div>
				<div className="bottom-right"></div>
			</div>
		</div>
	);
}
