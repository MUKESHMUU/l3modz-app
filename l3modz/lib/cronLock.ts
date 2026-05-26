import mongoose, { Schema, Model } from 'mongoose';

type CronLockDocument = {
  _id: string;
  owner: string;
  acquiredAt: Date;
  expiresAt: Date;
};

const cronLockSchema = new Schema<CronLockDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    acquiredAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { versionKey: false }
);

const CronLock: Model<CronLockDocument> = mongoose.models.CronLock || mongoose.model<CronLockDocument>('CronLock', cronLockSchema);

export async function acquireCronLock(lockId: string, owner: string, ttlMs = 10 * 60 * 1000) {
  const now = new Date();
  const expiresAt = new Date(Date.now() + ttlMs);

  try {
    await CronLock.findOneAndUpdate(
      {
        _id: lockId,
        $or: [{ expiresAt: { $lt: now } }, { expiresAt: { $exists: false } }],
      },
      {
        $set: { owner, acquiredAt: now, expiresAt },
        $setOnInsert: { _id: lockId },
      },
      { upsert: true, new: true }
    );
    return { acquired: true, expiresAt };
  } catch (error: any) {
    if (error?.code === 11000) {
      return { acquired: false, reason: 'locked' as const };
    }
    throw error;
  }
}

export async function releaseCronLock(lockId: string, owner: string) {
  await CronLock.deleteOne({ _id: lockId, owner });
}
