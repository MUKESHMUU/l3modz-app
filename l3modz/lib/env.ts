const REQUIRED_PRODUCTION_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  //'NEXTAUTH_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'SHIPROCKET_EMAIL',
  'SHIPROCKET_PASSWORD',
  //'CRON_SECRET',
] as const;

let productionEnvValidated = false;

export function getEnvValue(name: string) {
  return String(process.env[name] || '').trim();
}

export function requireEnv(name: string) {
  const value = getEnvValue(name);
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function validateProductionEnv() {
  if (productionEnvValidated || process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing = REQUIRED_PRODUCTION_ENV_VARS.filter((name) => !getEnvValue(name));
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  productionEnvValidated = true;
}
