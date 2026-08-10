// lib/channels/index.js
// Multi-channel OTP sender
const fs = require('fs');
const path = require('path');

async function send({ channel, destination, code }) {
  // Dev mode: log to terminal and file
  const devOutboxPath = path.join(__dirname, '../../data/dev-outbox.json');
  
  // Ensure data directory exists
  if (!fs.existsSync(path.dirname(devOutboxPath))) {
    fs.mkdirSync(path.dirname(devOutboxPath), { recursive: true });
  }

  const message = `OTP Code: ${code}\nExpires in 5 minutes.`;
  
  console.log(`\n📱 [${channel.toUpperCase()}] ${destination}`);
  console.log(`Code: ${code}\n`);

  // Save to dev-outbox.json
  let outbox = [];
  if (fs.existsSync(devOutboxPath)) {
    outbox = JSON.parse(fs.readFileSync(devOutboxPath, 'utf8'));
  }
  outbox.push({
    channel,
    destination,
    code,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(devOutboxPath, JSON.stringify(outbox, null, 2));

  // Production integrations (commented out, ready to use):
  
  // SMS via Twilio
  // if (channel === 'sms' && process.env.TWILIO_SID) {
  //   const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  //   await twilio.messages.create({
  //     body: message,
  //     from: process.env.TWILIO_FROM,
  //     to: destination
  //   });
  // }

  // WhatsApp via Meta Cloud API
  // if (channel === 'whatsapp' && process.env.WHATSAPP_PROVIDER_TOKEN) {
  //   const fetch = require('node-fetch');
  //   await fetch(`https://graph.instagram.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${process.env.WHATSAPP_PROVIDER_TOKEN}`,
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify({
  //       messaging_product: 'whatsapp',
  //       recipient_type: 'individual',
  //       to: destination,
  //       type: 'text',
  //       text: { body: message }
  //     })
  //   });
  // }

  // Email via SMTP
  // if (channel === 'email' && process.env.SMTP_HOST) {
  //   const nodemailer = require('nodemailer');
  //   const transporter = nodemailer.createTransport({
  //     host: process.env.SMTP_HOST,
  //     port: process.env.SMTP_PORT,
  //     auth: {
  //       user: process.env.SMTP_USER,
  //       pass: process.env.SMTP_PASS
  //     }
  //   });
  //   await transporter.sendMail({
  //     from: process.env.SMTP_USER,
  //     to: destination,
  //     subject: 'Your OTP Code',
  //     text: message
  //   });
  // }
}

module.exports = { send };
