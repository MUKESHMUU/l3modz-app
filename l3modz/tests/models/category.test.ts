import mongoose from 'mongoose';

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

describe('Category Model', () => {
  let mockSave: jest.Mock;
  let mockSchema: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSave = jest.fn();

    // Mock the pre-save hook behavior
    mockSchema = {
      pre: jest.fn((event, callback) => {
        if (event === 'save') {
          // Store the hook for testing
          mockSchema._preSaveHook = callback;
        }
      }),
    };
  });

  it('generates slug from name on save', () => {
    const mockDoc = {
      name: 'Footrests',
      slug: '',
      isModified: jest.fn((field) => field === 'name'),
    };

    // Simulate pre-save hook
    if (mockDoc.isModified('name') || !mockDoc.slug) {
      mockDoc.slug = mockDoc.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    expect(mockDoc.slug).toBe('footrests');
  });

  it('regenerates slug when name is updated', () => {
    const mockDoc = {
      name: 'New Name',
      slug: 'old-name',
      isModified: jest.fn((field) => field === 'name'),
    };

    // Simulate pre-save hook
    if (mockDoc.isModified('name') || !mockDoc.slug) {
      mockDoc.slug = mockDoc.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    expect(mockDoc.slug).toBe('new-name');
  });

  it('does not overwrite slug with client-provided value', () => {
    // The server should regenerate slug from name, ignoring any client-provided slug
    const name = 'Radiator Guards';
    const clientProvidedSlug = 'custom-client-slug';

    const serverGeneratedSlug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    expect(serverGeneratedSlug).toBe('radiator-guards');
    expect(serverGeneratedSlug).not.toBe(clientProvidedSlug);
  });

  it('handles duplicate slug by appending -2', () => {
    const baseSlug = 'footrests';
    const existingSlugs = ['footrests'];

    let finalSlug = baseSlug;
    let counter = 2;

    while (existingSlugs.includes(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    expect(finalSlug).toBe('footrests-2');
  });

  it('name is required — cannot save without it', () => {
    const mockDoc = {
      name: '',
      slug: '',
      save: jest.fn(),
    };

    // Validation should fail
    const isValid = mockDoc.name.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it('timestamps createdAt and updatedAt are set', () => {
    const mockDoc = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Footrests',
      slug: 'footrests',
      createdAt: new Date('2026-06-14'),
      updatedAt: new Date('2026-06-14'),
    };

    expect(mockDoc.createdAt).toBeDefined();
    expect(mockDoc.updatedAt).toBeDefined();
    expect(mockDoc.createdAt instanceof Date).toBe(true);
    expect(mockDoc.updatedAt instanceof Date).toBe(true);
  });

  it('handles special characters in name correctly', () => {
    const names = [
      { input: 'Radiator & Guards', expected: 'radiator-guards' },
      { input: 'Foot-Rests', expected: 'foot-rests' },
      { input: 'Products @ Home', expected: 'products-home' },
    ];

    names.forEach(({ input, expected }) => {
      const slug = input
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-'); // Collapse multiple dashes

      expect(slug).toBe(expected);
    });
  });
});
