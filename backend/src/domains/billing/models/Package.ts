import mongoose, { type Model } from 'mongoose';

export interface IPackageDoc {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description: string;
  credits: number;
  priceCents: number;
  active: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const packageSchema = new mongoose.Schema<IPackageDoc>(
  {
    code: {
      type: String,
      required: [true, 'Package code is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Package description is required'],
      trim: true,
    },
    credits: {
      type: Number,
      required: [true, 'Credits amount is required'],
      min: [1, 'Credits must be at least 1'],
    },
    priceCents: {
      type: Number,
      required: [true, 'Price in cents is required'],
      min: [1, 'Price must be at least 1 cent'],
    },
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

packageSchema.index({ active: 1, sortOrder: 1 });

export const PackageModel: Model<IPackageDoc> =
  mongoose.models.Package ?? mongoose.model<IPackageDoc>('Package', packageSchema);
