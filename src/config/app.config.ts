import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.ENVIRONMENT || 'development',

  signProvider: {
    baseUrlNatural: process.env.SIGN_PROVIDER_BASE_URL_NATURAL,
    baseUrlJuridica: process.env.SIGN_PROVIDER_BASE_URL_JURIDICA,
    biometriaUrl: process.env.SIGN_PROVIDER_BIOMETRIA_URL,
    generarLinkBiometriaUrl: process.env.SIGN_PROVIDER_GENERAR_LINK_BIOMETRIA_URL,
    user: process.env.SIGN_PROVIDER_USER,
    password: process.env.SIGN_PROVIDER_PASSWORD,
    authUsernameBiometria: process.env.SIGN_PROVIDER_AUTH_USERNAME_BIOMETRIA,
    authPasswordBiometria: process.env.SIGN_PROVIDER_AUTH_PASSWORD_BIOMETRIA,
    callback: process.env.SIGN_PROVIDER_CALLBACK,
  },

  uanataca: {
    baseUrl: process.env.UANATACA_BASE_URL,
    username: process.env.UANATACA_USERNAME,
    password: process.env.UANATACA_PASSWORD,
  },

  uanatacaToken: {
    // UUIDs de tipos de envío del proveedor Uanataca
    shippingUuids: {
      retiroOficina: process.env.UANATACA_SHIPPING_UUID_RETIRO_OFICINA || '591b23e8-db22-485e-884f-0ec8ca1e5b52',
      envioEcuadorContinental: process.env.UANATACA_SHIPPING_UUID_ECUADOR_CONTINENTAL || '1ca5c108-cb25-4c52-85b5-0d4e8202b1be',
      envioGalapagos: process.env.UANATACA_SHIPPING_UUID_GALAPAGOS || 'afb41ea2-c6d1-4130-916a-fa9a3417eab7',
    },
    // Oficina por defecto para retiro
    officeDefault: process.env.UANATACA_OFFICE_DEFAULT || 'QUITO',
    // Costo del envío del token físico en centavos (sobre el precio del plan)
    // retiroOficina: $7.00 (sin IVA — cobro fijo)
    // envioEcuadorContinental: $4.00 + 15% IVA = $4.60
    // envioGalapagos: $6.00 + 15% IVA = $6.90
    deliveryFees: {
      retiroOficinaCents: parseInt(process.env.UANATACA_FEE_RETIRO_OFICINA_CENTS || '700', 10),
      envioEcuadorContinentalCents: parseInt(process.env.UANATACA_FEE_ECUADOR_CONTINENTAL_CENTS || '400', 10),
      envioGalapagosCents: parseInt(process.env.UANATACA_FEE_GALAPAGOS_CENTS || '400', 10),
      ivaRate: parseFloat(process.env.UANATACA_DELIVERY_IVA_RATE || '0.15'),
    },
  },

  emailVerification: {
    apiUrl: process.env.EMAIL_VERIFICATION_API_URL,
    apiKey: process.env.EMAIL_VERIFICATION_API_KEY,
  },

  wasabi: {
    endpoint: process.env.WASABI_ENDPOINT,
    region: process.env.WASABI_REGION,
    accessKeyId: process.env.WASABI_ACCESS_KEY,
    secretAccessKey: process.env.WASABI_SECRET_KEY,
    bucket: process.env.WASABI_BUCKET_NAME,
  },
}));
