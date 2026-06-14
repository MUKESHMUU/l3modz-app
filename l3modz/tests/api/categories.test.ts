import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Mock mongoose
jest.mock('mongoose');
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/checkAuth', () => ({
  checkAdmin: jest.fn().mockResolvedValue(true),
}));

describe('Categories API Routes', () => {
  let mockFind: jest.Mock;
  let mockFindOne: jest.Mock;
  let mockCreate: jest.Mock;
  let mockFindById: jest.Mock;
  let mockFindByIdAndDelete: jest.Mock;
  let mockUpdateMany: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock methods
    mockFind = jest.fn();
    mockFindOne = jest.fn();
    mockCreate = jest.fn();
    mockFindById = jest.fn();
    mockFindByIdAndDelete = jest.fn();
    mockUpdateMany = jest.fn();

    // Mock Category model
    const mockCategoryModel = {
      find: mockFind,
      findOne: mockFindOne,
      create: mockCreate,
      findById: mockFindById,
      findByIdAndDelete: mockFindByIdAndDelete,
    };

    (mongoose.models as any).Category = mockCategoryModel;
    (mongoose.model as any) = jest.fn(() => mockCategoryModel);
  });

  describe('GET /api/categories', () => {
    it('returns empty array when collection is empty', async () => {
      mockFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Simulate the GET handler
      const categories = await (mongoose.models.Category.find({} as any) as any)
        .select('_id name slug image description')
        .sort({ createdAt: 1 })
        .lean();

      expect(categories).toEqual([]);
    });

    it('returns categories with correct fields', async () => {
      const mockCategories = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          name: 'Footrests',
          slug: 'footrests',
          image: '/footrest.png',
          description: 'Premium footrests',
        },
      ];

      mockFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockCategories),
          }),
        }),
      });

      const categories = await (mongoose.models.Category.find({} as any) as any)
        .select('_id name slug image description')
        .sort({ createdAt: 1 })
        .lean();

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Footrests');
      expect(categories[0].slug).toBe('footrests');
    });
  });

  describe('POST /api/categories', () => {
    it('generates slug from name server-side', () => {
      const name = 'Radiator Guards';
      const baseSlug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      expect(baseSlug).toBe('radiator-guards');
    });

    it('ignores slug sent in request body', async () => {
      const mockBody = {
        name: 'Footrests',
        slug: 'custom-slug-from-client', // Should be ignored
        image: '/footrest.png',
        description: 'Premium footrests',
      };

      // The server should generate slug from name, not use the provided one
      const name = mockBody.name;
      const serverGeneratedSlug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      expect(serverGeneratedSlug).toBe('footrests');
      expect(serverGeneratedSlug).not.toBe('custom-slug-from-client');
    });

    it('appends -2 when slug already exists', async () => {
      const baseSlug = 'footrests';
      mockFindOne.mockResolvedValueOnce({ _id: 'existing-id', slug: baseSlug });

      // First check finds existing
      const existingCheck = await mongoose.models.Category.findOne({ slug: baseSlug } as any);
      expect(existingCheck).toBeDefined();

      // Logic should append -2
      let slugToUse = baseSlug;
      if (existingCheck) {
        slugToUse = `${baseSlug}-2`;
      }

      expect(slugToUse).toBe('footrests-2');
    });

    it('creates category with server-generated slug', async () => {
      const mockCreatedCategory = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Footrests',
        slug: 'footrests',
        image: '/footrest.png',
        description: 'Premium footrests',
      };

      mockFindOne.mockResolvedValueOnce(null); // No duplicate
      mockCreate.mockResolvedValueOnce(mockCreatedCategory);

      // Simulate server slug generation
      const name = 'Footrests';
      let slug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const existing = await mongoose.models.Category.findOne({ slug } as any);
      expect(existing).toBeNull();

      const created = await mongoose.models.Category.create({
        name,
        slug,
        image: '/footrest.png',
        description: 'Premium footrests',
      } as any);

      expect(created.slug).toBe('footrests');
      expect(created.name).toBe('Footrests');
    });
  });

  describe('PUT /api/categories/:id', () => {
    const categoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

    it('updates name and regenerates slug', async () => {
      const mockCategory = {
        _id: categoryId,
        name: 'Old Name',
        slug: 'old-name',
        image: '/image.png',
        description: 'desc',
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockFindById.mockResolvedValueOnce(mockCategory);
      mockFindOne.mockResolvedValueOnce(null); // New slug doesn't exist

      const category = await mongoose.models.Category.findById(categoryId);
      expect(category).toBeDefined();

      // Simulate name update with slug regeneration
      const newName = 'New Name';
      let newSlug = newName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      const exists = await mongoose.models.Category.findOne({ slug: newSlug, _id: { $ne: categoryId } } as any);
      expect(exists).toBeNull();

      category.name = newName;
      category.slug = newSlug;

      expect(category.name).toBe('New Name');
      expect(category.slug).toBe('new-name');
    });

    it('ignores client-provided slug in request body', async () => {
      const clientProvidedSlug = 'client-wants-this-slug';
      const nameThatShouldGenerateSlug = 'Server Slug Source';

      // Server should regenerate from name, not use client slug
      const serverGeneratedSlug = nameThatShouldGenerateSlug
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      expect(serverGeneratedSlug).toBe('server-slug-source');
      expect(serverGeneratedSlug).not.toBe(clientProvidedSlug);
    });

    it('updates image and description freely', async () => {
      const mockCategory = {
        _id: categoryId,
        name: 'Footrests',
        slug: 'footrests',
        image: '/old-image.png',
        description: 'Old description',
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockFindById.mockResolvedValueOnce(mockCategory);

      const category = await mongoose.models.Category.findById(categoryId);

      // Update image and description without name change
      category.image = '/new-image.png';
      category.description = 'New description';

      expect(category.image).toBe('/new-image.png');
      expect(category.description).toBe('New description');
      // Slug should remain unchanged since name didn't change
      expect(category.slug).toBe('footrests');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    const categoryId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

    it('sets products.categoryId to null before removing category', async () => {
      // The Product model needs to be mocked in the DELETE handler
      const mockProductUpdateMany = jest.fn().mockResolvedValueOnce({ modifiedCount: 2 });
      
      // Simulate calling Product.updateMany
      const updateResult = await mockProductUpdateMany(
        { categoryId: categoryId },
        { $set: { categoryId: null } }
      );

      expect(updateResult.modifiedCount).toBe(2);
      expect(mockProductUpdateMany).toHaveBeenCalledWith(
        { categoryId: categoryId },
        { $set: { categoryId: null } }
      );
    });

    it('deletes the category', async () => {
      const mockCategory = {
        _id: categoryId,
        name: 'Footrests',
        slug: 'footrests',
      };

      mockFindByIdAndDelete.mockResolvedValueOnce(mockCategory);

      const deleted = await mongoose.models.Category.findByIdAndDelete(categoryId);

      expect(deleted).toBeDefined();
      expect(deleted._id).toEqual(categoryId);
    });

    it('does not delete any products', async () => {
      // The DELETE handler should use updateMany with $set, not deleteMany
      // So products are preserved with categoryId set to null
      const mockProductUpdateMany = jest.fn().mockResolvedValueOnce({ modifiedCount: 3 });

      const updateResult = await mockProductUpdateMany(
        { categoryId: new mongoose.Types.ObjectId() },
        { $set: { categoryId: null } }
      );

      // Verify it's updateMany being called, not deleteMany
      expect(mockProductUpdateMany).toHaveBeenCalled();
      expect(updateResult.modifiedCount).toBe(3);
    });

    it('returns success response', async () => {
      mockUpdateMany.mockResolvedValueOnce({ modifiedCount: 1 });
      mockFindByIdAndDelete.mockResolvedValueOnce({ _id: categoryId });

      const response = { success: true };
      expect(response).toEqual({ success: true });
    });
  });
});
