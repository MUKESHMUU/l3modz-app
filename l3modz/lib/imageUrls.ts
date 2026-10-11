export function isCloudinaryUrl(value: string) {
  try {
    return new URL(value).hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

export function isR2ImageUrl(value: string) {
  try {
    return new URL(value).hostname === 'images.l3modz.com' &&
      /^\/(products|categories)\//.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

export function hasNewCloudinaryUrl(value: string, existingValue?: string) {
  return isCloudinaryUrl(value) && value !== existingValue;
}

export function publicImageUrl(value: unknown) {
  const image = String(value || '').trim();
  return isCloudinaryUrl(image) ? '' : image;
}

export function publicImageUrls(values: unknown) {
  return Array.isArray(values) ? values.map(publicImageUrl).filter(Boolean) : [];
}
