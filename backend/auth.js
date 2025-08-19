const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL;

// Configure Twitter OAuth 2.0 strategy
passport.use(new OAuth2Strategy({
  authorizationURL: 'https://twitter.com/i/oauth2/authorize',
  tokenURL: 'https://api.twitter.com/2/oauth2/token',
  clientID: TWITTER_CLIENT_ID,
  clientSecret: TWITTER_CLIENT_SECRET,
  callbackURL: TWITTER_CALLBACK_URL,
  scope: 'tweet.read users.read like.write like.read retweet.write follows.write',
  state: true,
  pkce: true
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Create user object with Twitter data
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
    console.error('OAuth callback error:', error);
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
