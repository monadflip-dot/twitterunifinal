const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const jwt = require('jsonwebtoken');

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure Twitter strategy
passport.use(new TwitterStrategy({
  consumerKey: TWITTER_CLIENT_ID,
  consumerSecret: TWITTER_CLIENT_SECRET,
  callbackURL: TWITTER_CALLBACK_URL,
  includeEmail: true,
  includeStatus: false,
  includeEntities: false
}, async (token, tokenSecret, profile, done) => {
  try {
    // Create or find user
    const user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      photo: profile.photos?.[0]?.value,
      accessToken: token,
      accessTokenSecret: tokenSecret
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
