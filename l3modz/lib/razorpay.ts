import Razorpay from 'razorpay';
import { validateProductionEnv, getEnvValue } from './env';

validateProductionEnv();

const keyId = getEnvValue('RAZORPAY_KEY_ID') || getEnvValue('NEXT_PUBLIC_RAZORPAY_KEY_ID');
const keySecret = getEnvValue('RAZORPAY_KEY_SECRET') || getEnvValue('RAZORPAY_SECRET');

// Log presence of keys for debugging (do not log secrets)
console.info('[Razorpay] key_id present:', Boolean(keyId));
console.info('[Razorpay] key_secret present:', Boolean(keySecret));

if (!keyId || !keySecret) {
  throw new Error('Razorpay keys are not configured');
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export default razorpay;
