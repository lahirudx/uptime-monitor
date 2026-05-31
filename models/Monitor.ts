import mongoose, { Schema, Model } from 'mongoose'
import { Monitor } from '@/types'
import {
  MIN_MONITOR_INTERVAL_SECONDS,
  DEFAULT_MONITOR_INTERVAL_SECONDS,
  MAX_MONITOR_TIMEOUT_SECONDS,
  DEFAULT_MONITOR_TIMEOUT_SECONDS,
} from '@/lib/monitor-config'

const MonitorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['http', 'https'],
      default: 'https',
    },
    interval: {
      type: Number,
      default: DEFAULT_MONITOR_INTERVAL_SECONDS,
      min: MIN_MONITOR_INTERVAL_SECONDS,
    },
    timeout: {
      type: Number,
      default: DEFAULT_MONITOR_TIMEOUT_SECONDS,
      min: 5,
      max: MAX_MONITOR_TIMEOUT_SECONDS,
    },
    status: {
      type: String,
      enum: ['up', 'down', 'paused'],
      default: 'paused',
    },
    lastCheck: {
      type: Date,
    },
    lastAlertSentAt: {
      type: Date,
    },
    contactLists: {
      type: [String],
      default: [],
    },
    alerts: {
      email: [String],
      webhook: [String],
      phone: [String],
    },
  },
  {
    timestamps: true,
  }
)

// Create indexes for better query performance
MonitorSchema.index({ status: 1 })
MonitorSchema.index({ createdAt: -1 })
MonitorSchema.index({ organizationId: 1, createdAt: -1 })

const MonitorModel: Model<Monitor> =
  mongoose.models.Monitor || mongoose.model<Monitor>('Monitor', MonitorSchema)

export default MonitorModel
