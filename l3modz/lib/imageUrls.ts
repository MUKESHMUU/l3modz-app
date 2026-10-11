export function isCloudinaryUrl(value: string) {
  try {
    return new URL(value).hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

export function hasNewCloudinaryUrl(value: string, existingValue?: string) {
  return isCloudinaryUrl(value) && value !== existingValue;
}
