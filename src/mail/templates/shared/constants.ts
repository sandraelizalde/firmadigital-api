import { config } from 'dotenv';
config();

const baseUrl = process.env.FRONTEND_URL!;

export const brand = {
  name: 'Elizalde&Asociados',
  logoUrl: `${baseUrl}/images/logo-full-white.webp`,
  websiteUrl: baseUrl,
  whatsappNumber: '593988455424',
  whatsappDisplay: '098 845 5424',
  supportEmail: 'gerencia@elizaldeasociados.com',
  colors: {
    tealDark: '#c1a875',
    tealLight: '#3d4147',
    white: '#FFFFFF',
    bg: '#F3F7F9',
    text: '#374151',
    textLight: '#6b7280',
  },
};
