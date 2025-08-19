const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const jwt = require('jsonwebtoken');

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure Twitter OAuth 2.0 strategy
passport.use(new OAuth2Strategy({
  authorizationURL: 'https://twitter.com/i/oauth2/authorize',
  tokenURL: 'https://api.twitter.com/2/oauth2/token',
  clientID: TWITTER_CLIENT_ID,
  clientSecret: TWITTER_CLIENT_SECRET,
  callbackURL: TWITTER_CALLBACK_URL,
  scope: ['tweet.read', 'tweet.write', 'users.read', 'like.write', 'like.read', 'retweet.write', 'follows.write', 'offline.access'],
  state: true,  // Enable state for security
  pkce: true    // Enable PKCE for security
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // For OAuth 2.0, we need to make an additional call to get the profile
    // For now, create a basic user
    const user = {
      id: 'twitter_user_' + Date.now(),
      username: 'twitter_user',
      displayName: 'Twitter User',
      photo: null,
      accessToken: accessToken,
      refreshToken: refreshToken
    };
    
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
