import crypto from 'crypto';

export interface ValidatedUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function validateInitData(initData: string): { isValid: boolean; user?: ValidatedUser } {
  // Mock mode for local development without Telegram WebApp
  if (process.env.NODE_ENV !== 'production' && (!initData || initData.startsWith('mock'))) {
    return {
      isValid: true,
      user: {
        id: 123456789, // Mock ID
        first_name: 'Mock',
        username: 'mock_user'
      }
    };
  }

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  if (!hash) {
    return { isValid: false };
  }

  urlParams.delete('hash');
  
  // Sort parameters alphabetically by key
  const paramsList: string[] = [];
  urlParams.forEach((value, key) => {
    paramsList.push(`${key}=${value}`);
  });
  paramsList.sort();
  
  const dataCheckString = paramsList.join('\n');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set in environment variables");
    return { isValid: false };
  }

  // Create secret key
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  
  // Create calculated hash
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (calculatedHash === hash) {
    const userStr = urlParams.get('user');
    if (userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr)) as ValidatedUser;
        return { isValid: true, user };
      } catch (e) {
        return { isValid: false };
      }
    }
    return { isValid: false };
  }

  return { isValid: false };
}
