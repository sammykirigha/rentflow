import { config } from 'dotenv';

config();

const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  passkey: process.env.MPESA_PASSKEY || '',
  shortcode: process.env.MPESA_SHORTCODE || '',
  callbackUrl: process.env.MPESA_CALLBACK_URL || '',
  validationUrl: process.env.MPESA_VALIDATION_URL || '',
  confirmationUrl: process.env.MPESA_CONFIRMATION_URL || '',
  environment: (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
};

export default mpesaConfig;
