require('dotenv').config()
const mongoose = require('mongoose')
const cron = require('node-cron')

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uptime-monitor'

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return
  }
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')
}

// Import models
const MonitorSchema = new mongoose.Schema({
  name: String,
  url: String,
  type: { type: String, enum: ['http', 'https'] },
  interval: Number,
  timeout: Number,
  status: { type: String, enum: ['up', 'down', 'paused'] },
  lastCheck: Date,
  alerts: {
    email: [String],
    webhook: [String],
    phone: [String],
  },
}, { timestamps: true })

const MonitorCheckSchema = new mongoose.Schema({
  monitorId: { type: String, ref: 'Monitor' },
  success: Boolean,
  responseTime: Number,
  statusCode: Number,
  error: String,
  timestamp: { type: Date, default: Date.now },
})

const Monitor = mongoose.models.Monitor || mongoose.model('Monitor', MonitorSchema)
const MonitorCheck = mongoose.models.MonitorCheck || mongoose.model('MonitorCheck', MonitorCheckSchema)

// Monitoring logic
const axios = require('axios')

async function checkEndpoint(url, timeout) {
  const startTime = Date.now()

  try {
    const response = await axios.get(url, {
      timeout: timeout * 1000,
      validateStatus: () => true,
      maxRedirects: 5,
    })

    const responseTime = Date.now() - startTime
    const success = response.status >= 200 && response.status < 400

    return {
      success,
      responseTime,
      statusCode: response.status,
      timestamp: new Date(),
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      success: false,
      responseTime,
      error: error.message || 'Unknown error',
      statusCode: error.response?.status,
      timestamp: new Date(),
    }
  }
}

async function sendAlerts(monitor, checkResult) {
  const nodemailer = require('nodemailer')

  // Send email alerts
  if (monitor.alerts?.email && monitor.alerts.email.length > 0) {
    const emailPort = parseInt(process.env.EMAIL_PORT || '587')
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: emailPort,
      secure: emailPort === 465, // true for 465, false for other ports (like 587)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    for (const email of monitor.alerts.email) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🚨 Monitor Alert: ${monitor.name} is DOWN</h2>
          <p><strong>URL:</strong> ${monitor.url}</p>
          <p><strong>Error:</strong> ${checkResult.error || 'Unknown error'}</p>
          <p><strong>Status Code:</strong> ${checkResult.statusCode || 'N/A'}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'noreply@uptimemonitor.com',
          to: email,
          subject: `🚨 Alert: ${monitor.name} is DOWN`,
          html,
        })
        console.log(`Alert email sent to ${email}`)
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error.message)
      }
    }
  }

  // Send webhook alerts
  if (monitor.alerts?.webhook && monitor.alerts.webhook.length > 0) {
    for (const webhookUrl of monitor.alerts.webhook) {
      try {
        await axios.post(webhookUrl, {
          monitor: monitor.name,
          url: monitor.url,
          error: checkResult.error,
          statusCode: checkResult.statusCode,
          timestamp: new Date().toISOString(),
          status: 'down',
        })
        console.log(`Webhook alert sent to ${webhookUrl}`)
      } catch (error) {
        console.error(`Failed to send webhook to ${webhookUrl}:`, error.message)
      }
    }
  }

  // Send Twilio phone call alerts
  if (monitor.alerts?.phone && monitor.alerts.phone.length > 0) {
    const twilio = require('twilio')

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (accountSid && authToken && fromNumber) {
      const client = twilio(accountSid, authToken)

      for (const phoneNumber of monitor.alerts.phone) {
        try {
          const message = `Alert: Your monitor ${monitor.name} is currently down. Please check your service immediately.`
          const twimlUrl = `http://twimlets.com/message?Message=${encodeURIComponent(message)}`

          const call = await client.calls.create({
            to: phoneNumber,
            from: fromNumber,
            url: twimlUrl,
          })

          console.log(`Twilio call alert sent to ${phoneNumber}: ${call.sid}`)
        } catch (error) {
          console.error(`Failed to send Twilio call to ${phoneNumber}:`, error.message)
        }
      }
    } else {
      console.warn('Twilio credentials not configured, skipping phone alerts')
    }
  }
}

async function runMonitorChecks() {
  try {
    await connectDB()

    // Get all active monitors (not paused)
    const monitors = await Monitor.find({
      status: { $in: ['up', 'down'] },
    })

    console.log(`Checking ${monitors.length} active monitors...`)

    for (const monitor of monitors) {
      const now = new Date()
      const lastCheck = monitor.lastCheck ? new Date(monitor.lastCheck) : new Date(0)
      const timeSinceLastCheck = (now - lastCheck) / 1000 // in seconds

      // Only check if enough time has passed since last check
      if (timeSinceLastCheck >= monitor.interval) {
        console.log(`Checking monitor: ${monitor.name} (${monitor.url})`)

        const checkResult = await checkEndpoint(monitor.url, monitor.timeout)

        // Save check result
        await MonitorCheck.create({
          monitorId: monitor._id.toString(),
          ...checkResult,
        })

        // Update monitor status
        const previousStatus = monitor.status
        const newStatus = checkResult.success ? 'up' : 'down'

        await Monitor.findByIdAndUpdate(monitor._id, {
          status: newStatus,
          lastCheck: now,
        })

        console.log(`Monitor ${monitor.name}: ${newStatus} (${checkResult.responseTime}ms)`)

        // Send alerts if status changed from up to down
        if (previousStatus === 'up' && newStatus === 'down') {
          console.log(`Sending alerts for ${monitor.name}`)
          await sendAlerts(monitor, checkResult)
        }
      }
    }

    console.log('Monitor check cycle completed')
  } catch (error) {
    console.error('Error running monitor checks:', error)
  }
}

// Run checks every minute
console.log('Starting uptime monitor service...')
cron.schedule('* * * * *', runMonitorChecks)

// Run initial check
runMonitorChecks()

// Keep the process running
process.on('SIGINT', async () => {
  console.log('\nShutting down monitor service...')
  await mongoose.connection.close()
  process.exit(0)
})
