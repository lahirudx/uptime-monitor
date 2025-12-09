import twilio from 'twilio'

export interface TwilioCallOptions {
  to: string
  monitorName: string
  url: string
  status: 'down' | 'up'
}

export async function sendTwilioCall(options: TwilioCallOptions): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Twilio credentials not configured')
      return false
    }

    const client = twilio(accountSid, authToken)

    // Create TwiML for the call message
    const message = options.status === 'down'
      ? `Alert: Your monitor ${options.monitorName} is currently down. Please check your service immediately.`
      : `Notice: Your monitor ${options.monitorName} is now back up and running.`

    // URL encode the message for TwiML
    const twimlUrl = `http://twimlets.com/message?Message=${encodeURIComponent(message)}`

    // Make the call
    const call = await client.calls.create({
      to: options.to,
      from: fromNumber,
      url: twimlUrl,
    })

    console.log(`Twilio call initiated: ${call.sid}`)
    return true
  } catch (error) {
    console.error('Failed to send Twilio call:', error)
    return false
  }
}

export async function sendTwilioCalls(
  phoneNumbers: string[],
  monitorName: string,
  url: string,
  status: 'down' | 'up'
): Promise<void> {
  if (!phoneNumbers || phoneNumbers.length === 0) {
    return
  }

  const callPromises = phoneNumbers.map(phone =>
    sendTwilioCall({
      to: phone,
      monitorName,
      url,
      status,
    })
  )

  await Promise.all(callPromises)
}
