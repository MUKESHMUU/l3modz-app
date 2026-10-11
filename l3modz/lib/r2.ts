import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import { requireEnv } from './env';

const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

let r2Client: S3Client | undefined;

function getR2Client() {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      },
    });
  }
  return r2Client;
}

function hasValidImageSignature(buffer: Buffer, contentType: string) {
  if (contentType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === 'image/jpeg') {
    return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  }
  if (contentType === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

export function validateImageBuffer(buffer: Buffer, contentType: string) {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error('Only JPG, PNG, and WEBP images are allowed');
  }
  if (!hasValidImageSignature(buffer, contentType)) {
    throw new Error('The uploaded file is not a valid image');
  }
}

export async function uploadImageToR2(
  buffer: Buffer,
  contentType: string,
  scope: 'products' | 'categories' = 'products'
) {
  validateImageBuffer(buffer, contentType);

  const publicBaseUrl = requireEnv('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const extension = ALLOWED_IMAGE_TYPES.get(contentType);
  const key = `${scope}/${new Date().toISOString().slice(0, 10)}/${checksum}-${randomUUID()}${extension}`;

  await putR2Object(key, buffer, contentType, checksum);

  return {
    url: `${publicBaseUrl}/${key}`,
    key,
    checksum,
    contentType,
    size: buffer.length,
  };
}

export async function putR2Object(
  key: string,
  buffer: Buffer,
  contentType: string,
  checksum = createHash('sha256').update(buffer).digest('hex')
) {
  await getR2Client().send(new PutObjectCommand({
    Bucket: requireEnv('R2_BUCKET_NAME'),
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: { sha256: checksum },
  }));
}

export async function headR2Object(key: string) {
  return getR2Client().send(new HeadObjectCommand({
    Bucket: requireEnv('R2_BUCKET_NAME'),
    Key: key,
  }));
}

export function getR2PublicUrl(key: string) {
  return `${requireEnv('R2_PUBLIC_BASE_URL').replace(/\/+$/, '')}/${key}`;
}
