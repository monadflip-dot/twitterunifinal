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
				console.log('⚠️ Popup failed, error details:', popupError);
				console.log('⚠️ Error code:', popupError?.code);
				console.log('⚠️ Error message:', popupError?.message);
				
				// Check if it's an OAuth error
				if (popupError?.code === 'auth/popup-closed-by-user') {
					console.log('ℹ️ User closed popup, no action needed');
					return;
				}
				
				if (popupError?.code === 'auth/unauthorized-domain') {
					alert('Error: Dominio no autorizado. Contacta al administrador.');
					return;
				}
				
				// Only clear auth state if there's a token/authentication error
				if (popupError?.code === 'auth/invalid-credential' || 
					popupError?.code === 'auth/user-token-expired' ||
					popupError?.message?.includes('token')) {
					console.log('🔄 Clearing auth state due to token error...');
					await clearAuthState();
				}
				
				// Fallback to redirect for other errors
				console.log('🔄 Falling back to redirect login...');
				try {
					await signInWithRedirect(auth, twitterProvider);
				} catch (redirectError) {
					console.error('💥 Redirect also failed:', redirectError);
					alert('Error en el login de Twitter. Por favor, intenta de nuevo.');
				}
			}
		} catch (err) {
			console.error('💥 Twitter login failed:', err?.code, err?.message);
			
			// Provide more specific error messages
			if (err?.code === 'auth/unauthorized-domain') {
				alert('Error: Este dominio no está autorizado para usar Twitter login.');
			} else if (err?.code === 'auth/network-request-failed') {
				alert('Error de conexión. Verifica tu internet e intenta de nuevo.');
			} else {
				alert('Error en el login de Twitter: ' + (err?.message || 'Error desconocido'));
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
