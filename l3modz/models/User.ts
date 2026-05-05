import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password?: string; // Optional if using OTP later
  role: 'user' | 'admin';
  addresses: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }[];
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String }, // optional for guest or OTP
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    addresses: [
      {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default User;
