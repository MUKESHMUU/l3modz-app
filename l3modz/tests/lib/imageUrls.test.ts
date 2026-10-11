import { hasNewCloudinaryUrl, isCloudinaryUrl } from '@/lib/imageUrls';

describe('image URL policy', () => {
  it('identifies Cloudinary URLs without treating malformed values as Cloudinary', () => {
    expect(isCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/example.png')).toBe(true);
    expect(isCloudinaryUrl('/file.svg')).toBe(false);
    expect(isCloudinaryUrl('not a URL')).toBe(false);
  });

  it('allows an unchanged historical Cloudinary URL but rejects a new one', () => {
    const existing = 'https://res.cloudinary.com/demo/image/upload/legacy.png';
    expect(hasNewCloudinaryUrl(existing, existing)).toBe(false);
    expect(hasNewCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/new.png', existing)).toBe(true);
    expect(hasNewCloudinaryUrl('https://images.l3modz.com/categories/new.png', existing)).toBe(false);
  });
});
