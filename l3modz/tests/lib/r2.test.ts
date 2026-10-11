const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: jest.fn((input) => input),
  S3Client: jest.fn(() => ({ send: mockSend })),
}));

describe('R2 image storage provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.R2_ACCOUNT_ID = 'account';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_BUCKET_NAME = 'l3modz-products';
    process.env.R2_PUBLIC_BASE_URL = 'https://images.l3modz.com';
  });

  it('uploads a valid image with server-side metadata and returns its public URL', async () => {
    const { uploadImageToR2 } = await import('@/lib/r2');
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const result = await uploadImageToR2(bytes, 'image/png', 'categories');

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      Bucket: 'l3modz-products',
      ContentType: 'image/png',
      Body: bytes,
      CacheControl: 'public, max-age=31536000, immutable',
      Key: expect.stringMatching(/^categories\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{64}-/),
    }));
    expect(result.url).toMatch(/^https:\/\/images\.l3modz\.com\/categories\//);
    expect(result.checksum).toHaveLength(64);
  });

  it('rejects a file whose bytes do not match its declared image type', async () => {
    const { uploadImageToR2 } = await import('@/lib/r2');

    await expect(uploadImageToR2(Buffer.from('not an image'), 'image/png')).rejects.toThrow(
      'The uploaded file is not a valid image'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });
});
