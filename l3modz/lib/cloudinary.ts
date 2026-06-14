import { v2 as cloudinary } from 'cloudinary';
import { logConfigurationError } from './securityLogger';

// Validate Cloudinary configuration
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

if (process.env.NODE_ENV === 'production') {
  if (!cloudName || !apiKey || !apiSecret) {
    const missing: string[] = [];
    if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!apiKey) missing.push('CLOUDINARY_API_KEY');
    if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
    
    const message = `Missing Cloudinary configuration: ${missing.join(', ')}`;
    logConfigurationError('Cloudinary', message, 'error');
    throw new Error(message);
  }
}

// Only configure with real values; warn if missing in non-production
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
} else if (process.env.NODE_ENV !== 'production') {
  // Log warning in development but allow startup
  logConfigurationError('Cloudinary', 'Configuration incomplete, image uploads may fail', 'warning');
}

export default cloudinary;
