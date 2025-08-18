const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

function setupPassport() {
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: process.env.TWITTER_CALLBACK_URL,
    passReqToCallback: false,
    session: true
  },
  (token, tokenSecret, profile, done) => {
    // Guardar los tokens en el usuario para usarlos luego
    const user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      photo: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
      token,
      tokenSecret,
    };
    return done(null, user);
  }
  ));
}

module.exports = setupPassport;
