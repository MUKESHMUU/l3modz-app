import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkAdmin, getUserFromToken } from '@/lib/checkAuth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ message: 'Unauthorized, admin only' }, { status: 401 });
    }

    const currentUser = await getUserFromToken();
    const { id } = await params;
    const { role } = await req.json();

    if (!role || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }

    // Prevent locking yourself out by accidentally demoting your own account.
    if (currentUser && String(currentUser._id) === id && role !== 'admin') {
      return NextResponse.json({ message: 'You cannot demote your own admin account.' }, { status: 400 });
    }

    await dbConnect();

    const updated = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
