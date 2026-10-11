jest.mock('@/lib/checkAuth', () => ({
  checkAdmin: jest.fn(),
}));

jest.mock('@/lib/r2', () => ({
  uploadImageToR2: jest.fn(),
}));

describe('POST /api/admin/upload-image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function loadRoute() {
    return import('@/app/api/admin/upload-image/route');
  }

  function requestWithFile(file: Blob, filename = 'image.png', scope = 'products') {
    const form = new FormData();
    form.append('file', file, filename);
    form.append('scope', scope);
    return new Request('http://localhost/api/admin/upload-image', {
      method: 'POST',
      body: form,
    });
  }

  it('rejects unauthorised uploads', async () => {
    const { checkAdmin } = await import('@/lib/checkAuth');
    (checkAdmin as jest.Mock).mockResolvedValue(false);
    const { POST } = await loadRoute();

    const response = await POST(requestWithFile(new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })));

    expect(response.status).toBe(401);
  });

  it('rejects unsupported file types before storage', async () => {
    const { checkAdmin } = await import('@/lib/checkAuth');
    const { uploadImageToR2 } = await import('@/lib/r2');
    (checkAdmin as jest.Mock).mockResolvedValue(true);
    const { POST } = await loadRoute();

    const response = await POST(requestWithFile(new Blob(['not an image'], { type: 'text/plain' }), 'file.txt'));

    expect(response.status).toBe(400);
    expect(uploadImageToR2).not.toHaveBeenCalled();
  });

  it('uploads authorised category files to R2 and returns the public URL', async () => {
    const { checkAdmin } = await import('@/lib/checkAuth');
    const { uploadImageToR2 } = await import('@/lib/r2');
    (checkAdmin as jest.Mock).mockResolvedValue(true);
    (uploadImageToR2 as jest.Mock).mockResolvedValue({
      url: 'https://images.l3modz.com/categories/test.png',
      key: 'categories/test.png',
      checksum: 'abc',
      contentType: 'image/png',
      size: 8,
    });
    const { POST } = await loadRoute();

    const response = await POST(requestWithFile(
      new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }),
      'category.png',
      'categories'
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      url: 'https://images.l3modz.com/categories/test.png',
      key: 'categories/test.png',
    });
    expect(uploadImageToR2).toHaveBeenCalledWith(
      expect.any(Buffer),
      'image/png',
      'categories'
    );
  });

  it('rejects a spoofed image signature', async () => {
    const { checkAdmin } = await import('@/lib/checkAuth');
    const { uploadImageToR2 } = await import('@/lib/r2');
    (checkAdmin as jest.Mock).mockResolvedValue(true);
    (uploadImageToR2 as jest.Mock).mockRejectedValue(new Error('The uploaded file is not a valid image'));
    const { POST } = await loadRoute();

    const response = await POST(requestWithFile(new Blob(['not png'], { type: 'image/png' })));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'The uploaded file is not a valid image' });
  });
});
