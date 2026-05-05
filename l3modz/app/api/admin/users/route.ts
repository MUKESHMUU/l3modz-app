import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkAdmin } from '@/lib/checkAuth';

export async function GET(req: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    await dbConnect();
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
