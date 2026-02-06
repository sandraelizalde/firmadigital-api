import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.ENVIRONMENT || 'development',

  signProvider: {
    baseUrlNatural: process.env.SIGN_PROVIDER_BASE_URL_NATURAL,
    baseUrlJuridica: process.env.SIGN_PROVIDER_BASE_URL_JURIDICA,
    user: process.env.SIGN_PROVIDER_USER,
    password: process.env.SIGN_PROVIDER_PASSWORD,
    authUsername: process.env.SIGN_PROVIDER_AUTH_USERNAME,
    authPassword: process.env.SIGN_PROVIDER_AUTH_PASSWORD,
    authUsernameBiometria: process.env.SIGN_PROVIDER_AUTH_USERNAME_BIOMETRIA,
    authPasswordBiometria: process.env.SIGN_PROVIDER_AUTH_PASSWORD_BIOMETRIA,
    callback: process.env.SIGN_PROVIDER_CALLBACK,
  },

  uanataca: {
    baseUrl: process.env.UANATACA_BASE_URL,
    username: process.env.UANATACA_USERNAME,
    password: process.env.UANATACA_PASSWORD,
  },

  emailVerification: {
    apiUrl: process.env.EMAIL_VERIFICATION_API_URL,
    apiKey: process.env.EMAIL_VERIFICATION_API_KEY,
  },
}));
