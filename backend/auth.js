const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const jwt = require('jsonwebtoken');

function setupPassport() {
  passport.use(new OAuth2Strategy({
    authorizationURL: 'https://twitter.com/i/oauth2/authorize',
    tokenURL: 'https://api.twitter.com/2/oauth2/token',
    clientID: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    callbackURL: process.env.TWITTER_CALLBACK_URL,
    scope: ['tweet.read', 'users.read', 'like.write', 'like.read'],
    state: true,  // Habilitar state para seguridad
    pkce: true    // Habilitar PKCE para seguridad
  },
  (accessToken, refreshToken, profile, done) => {
    // Para OAuth 2.0, necesitamos hacer una llamada adicional para obtener el perfil
    // Por ahora, creamos un usuario básico
    const user = {
      id: 'temp-id',
      username: 'twitter_user',
      displayName: 'Twitter User',
      photo: null,
      accessToken,
      refreshToken
    };
    return done(null, user);
  }
  ));
}

module.exports = setupPassport;
