import Razorpay from 'razorpay';
import { getEnvValue } from './env';
import { createLogger } from './logger';

const logger = createLogger('razorpay');

let razorpayClient: Razorpay | null = null;

function getKeyId() {
  return getEnvValue('RAZORPAY_KEY_ID') || getEnvValue('NEXT_PUBLIC_RAZORPAY_KEY_ID');
}

function getKeySecret() {
  return getEnvValue('RAZORPAY_KEY_SECRET') || getEnvValue('RAZORPAY_SECRET');
}

export function getRazorpayClient() {
  if (razorpayClient) return razorpayClient;

  const keyId = getKeyId();
  const keySecret = getKeySecret();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured');
  }

  logger.debug('razorpay_client_initialized', {
    hasKeyId: Boolean(keyId),
    hasKeySecret: Boolean(keySecret),
  });

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
}
