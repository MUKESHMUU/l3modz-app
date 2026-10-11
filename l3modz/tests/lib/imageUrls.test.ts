import { hasNewCloudinaryUrl, isCloudinaryUrl, isR2ImageUrl, publicImageUrl, publicImageUrls } from '@/lib/imageUrls';

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

  it('never exposes legacy Cloudinary URLs from public image responses', () => {
    expect(publicImageUrl('https://res.cloudinary.com/demo/image/upload/legacy.png')).toBe('');
    expect(publicImageUrl('https://images.l3modz.com/products/new.png')).toBe('https://images.l3modz.com/products/new.png');
    expect(publicImageUrls(['https://res.cloudinary.com/demo/legacy.png', 'https://images.l3modz.com/products/new.png']))
      .toEqual(['https://images.l3modz.com/products/new.png']);
  });

  it('recognizes only scoped public R2 image URLs', () => {
    expect(isR2ImageUrl('https://images.l3modz.com/categories/keytags.png')).toBe(true);
    expect(isR2ImageUrl('https://images.l3modz.com/products/keytags.png')).toBe(true);
    expect(isR2ImageUrl('https://images.l3modz.com/keytags.png')).toBe(false);
    expect(isR2ImageUrl('/accessories.png')).toBe(false);
  });
});
