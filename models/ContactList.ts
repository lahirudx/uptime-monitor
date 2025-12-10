import mongoose from 'mongoose'

export interface IContactList {
  _id: string
  name: string
  description?: string
  emails: string[]
  phones: string[]
  webhooks: string[]
  createdAt: Date
  updatedAt: Date
}

const ContactListSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    emails: {
      type: [String],
      default: [],
    },
    phones: {
      type: [String],
      default: [],
    },
    webhooks: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.ContactList || mongoose.model<IContactList>('ContactList', ContactListSchema)
