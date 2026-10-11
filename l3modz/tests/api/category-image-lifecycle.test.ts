import { GET } from '@/app/api/categories/route';
import { PUT } from '@/app/api/categories/[id]/route';

const existingImage = 'https://res.cloudinary.com/legacy/image/upload/keytags.png';
const replacementImage = 'https://images.l3modz.com/categories/replacement.png';

const category = {
  _id: 'category-1',
  name: 'Keytags',
  slug: 'keytags',
  image: existingImage,
  description: 'Keytags',
  save: jest.fn(),
};

jest.mock('@/lib/mongodb', () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/checkAuth', () => ({ checkAdmin: jest.fn().mockResolvedValue(true) }));
jest.mock('@/models/Category', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  },
}));
jest.mock('@/models/Product', () => ({ __esModule: true, default: {} }));

import Category from '@/models/Category';

describe('category image replacement lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    category.image = existingImage;
    category.save.mockResolvedValue(category);
    (Category.findById as jest.Mock)
      .mockResolvedValueOnce(category)
      .mockResolvedValueOnce({ ...category, image: replacementImage });
    (Category.findOne as jest.Mock).mockResolvedValue(null);
    (Category.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ ...category, image: replacementImage }]),
        }),
      }),
    });
  });

  it('replaces a historical Cloudinary URL with the uploaded R2 URL and reloads it', async () => {
    const response = await PUT(
      new Request('http://localhost/api/categories/category-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: category.name,
          image: replacementImage,
          description: category.description,
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'category-1' }) },
    );

    expect(response.status).toBe(200);
    expect(category.image).toBe(replacementImage);
    expect(category.save).toHaveBeenCalledTimes(1);

    const reloaded = await GET();
    expect(reloaded.status).toBe(200);
    await expect(reloaded.json()).resolves.toEqual([{
      _id: category._id,
      name: category.name,
      slug: category.slug,
      image: replacementImage,
      description: category.description,
    }]);
  });

  it('rejects a local or empty value from overwriting an existing R2 image', async () => {
    category.image = replacementImage;
    (Category.findById as jest.Mock).mockReset().mockResolvedValue(category);

    const response = await PUT(
      new Request('http://localhost/api/categories/category-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: category.name,
          image: '/accessories.png',
          description: category.description,
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'category-1' }) },
    );

    expect(response.status).toBe(400);
    expect(category.save).not.toHaveBeenCalled();
  });
});
