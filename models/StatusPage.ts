import mongoose, { Schema, Model } from 'mongoose'
import { StatusPage } from '@/types'

const StatusPageSchema = new Schema<StatusPage>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    monitors: [
      {
        type: String,
        ref: 'Monitor',
      },
    ],
    customDomain: {
      type: String,
      trim: true,
    },
    branding: {
      logo: String,
      primaryColor: {
        type: String,
        default: '#3b82f6',
      },
    },
  },
  {
    timestamps: true,
  }
)

// Note: slug index already created via unique: true in schema
// No need for explicit index here

const StatusPageModel: Model<StatusPage> =
  mongoose.models.StatusPage ||
  mongoose.model<StatusPage>('StatusPage', StatusPageSchema)

export default StatusPageModel
