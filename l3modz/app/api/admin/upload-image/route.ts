import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/checkAuth';
import { uploadImageToR2 } from '@/lib/r2';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Image file is required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ message: 'Only JPG, PNG, and WEBP images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ message: 'Image size must be 8MB or less' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const scope = formData.get('scope') === 'categories' ? 'categories' : 'products';
    const uploadResult = await uploadImageToR2(buffer, file.type, scope);

    return NextResponse.json(uploadResult);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Image upload failed' }, { status: 500 });
  }
}
