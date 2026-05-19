import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '';

// Log presence of keys for debugging (do not log secrets)
console.info('[Razorpay] key_id present:', Boolean(keyId));
console.info('[Razorpay] key_secret present:', Boolean(keySecret));

const razorpay = new Razorpay({
  key_id: keyId || 'dummy_key',
  key_secret: keySecret || 'dummy_secret',
});

export default razorpay;
