import React from 'react';
import favicon from '../images/favicon.png';
import { auth, twitterProvider } from './firebase';
import { signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';

const API_URL = process.env.REACT_APP_API_URL || 'https://twitterunifinal.onrender.com';

function LoginPage() {
	const handleTwitterLogin = async () => {
		try {
			const result = await signInWithPopup(auth, twitterProvider);
			// Firebase user
			const firebaseUser = result.user;
			// Twitter OAuth1 credentials
			const credential = twitterProvider.credentialFromResult
				? twitterProvider.credentialFromResult(result)
				: null;
			const accessToken = credential?.accessToken || null;
			const accessSecret = credential?.secret || null;
			// Extra provider info
			const info = getAdditionalUserInfo(result);
			const screenName = info?.username || firebaseUser?.reloadUserInfo?.screenName || firebaseUser?.displayName || 'user';

			// Firebase ID token
			const idToken = await firebaseUser.getIdToken();

			// Send to backend to create session (JWT cookie)
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

			// Reload page to fetch session user
			window.location.reload();
		} catch (err) {
			console.error('Firebase Twitter login failed:', err);
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
