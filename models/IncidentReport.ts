import mongoose, { Schema, Model } from 'mongoose'
import { IncidentReport } from '@/types'

const IncidentReportSchema = new Schema<IncidentReport>({
  monitorId: {
    type: String,
    required: true,
    ref: 'Monitor',
    index: true,
  },
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // in milliseconds
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  affectedChecks: {
    type: Number,
    default: 0,
  },
})

// Compound index for efficient queries
IncidentReportSchema.index({ monitorId: 1, startTime: -1 })
IncidentReportSchema.index({ resolved: 1 })

const IncidentReportModel: Model<IncidentReport> =
  mongoose.models.IncidentReport ||
  mongoose.model<IncidentReport>('IncidentReport', IncidentReportSchema)

export default IncidentReportModel
