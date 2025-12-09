import nodemailer from 'nodemailer'
import axios from 'axios'

export interface EmailNotification {
  to: string
  subject: string
  html: string
}

export interface WebhookNotification {
  url: string
  data: Record<string, unknown>
}

export async function sendEmailAlert(
  monitorName: string,
  url: string,
  error: string,
  recipientEmail: string
): Promise<void> {
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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🚨 Monitor Alert: ${monitorName} is DOWN</h2>
      <p><strong>URL:</strong> ${url}</p>
      <p><strong>Error:</strong> ${error}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 14px;">
        This is an automated alert from your Uptime Monitor system.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@uptimemonitor.com',
    to: recipientEmail,
    subject: `🚨 Alert: ${monitorName} is DOWN`,
    html,
  })
}

export async function sendWebhookAlert(
  webhookUrl: string,
  monitorName: string,
  url: string,
  error: string
): Promise<void> {
  await axios.post(webhookUrl, {
    monitor: monitorName,
    url,
    error,
    timestamp: new Date().toISOString(),
    status: 'down',
  })
}

export async function sendRecoveryNotification(
  monitorName: string,
  url: string,
  recipientEmail: string
): Promise<void> {
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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">✅ Monitor Recovered: ${monitorName} is UP</h2>
      <p><strong>URL:</strong> ${url}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 14px;">
        This is an automated notification from your Uptime Monitor system.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@uptimemonitor.com',
    to: recipientEmail,
    subject: `✅ Recovery: ${monitorName} is UP`,
    html,
  })
}
