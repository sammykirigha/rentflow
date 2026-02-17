import { config } from 'dotenv';

config();

const smsConfig = {
  apiKey: process.env.AT_API_KEY || '',
  username: process.env.AT_USERNAME || '',
  senderId: process.env.AT_SENDER_ID || 'RENTFLOW',
};

export default smsConfig;
