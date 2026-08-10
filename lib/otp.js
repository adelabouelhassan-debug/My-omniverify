// lib/otp.js
const db = require('./db');
const crypto = require('./crypto-utils');
const channels = require('./channels');

const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const COOLDOWN = 30 * 1000; // 30 seconds

async function createAndSend({ projectId, channel, destination }) {
  const database = await db.load();
  const project = database.projects.find(p => p.id === projectId);
  if (!project || project.credits < 1) {
    throw new Error('Project not found or insufficient credits');
  }

  // Check cooldown
  const recentOtp = database.otps.find(
    o => o.projectId === projectId && o.destination === destination && o.createdAt > Date.now() - COOLDOWN
  );
  if (recentOtp) {
    throw new Error('Too many requests. Please wait 30 seconds.');
  }

  const code = Math.random().toString().slice(2, 8);
  const requestId = db.uid('otp');
  const codeHash = await crypto.hashCode(code);

  database.otps.push({
    requestId,
    projectId,
    destination,
    channel,
    codeHash,
    attempts: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_EXPIRY
  });

  // Deduct credit
  project.credits -= 1;

  // Log event
  database.events.push({
    type: 'otp_sent',
    projectId,
    channel,
    createdAt: Date.now()
  });

  await db.save(database);

  // Send via channel
  await channels.send({ channel, destination, code });

  return { requestId, expiresInSeconds: Math.floor(OTP_EXPIRY / 1000) };
}

async function verify({ projectId, requestId, code }) {
  const database = await db.load();
  const otp = database.otps.find(o => o.requestId === requestId && o.projectId === projectId);

  if (!otp) {
    throw new Error('Invalid request ID');
  }

  if (otp.expiresAt < Date.now()) {
    throw new Error('Code has expired');
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new Error('Too many attempts');
  }

  const isValid = await crypto.verifyCode(code, otp.codeHash);
  otp.attempts += 1;

  if (!isValid) {
    await db.save(database);
    database.events.push({
      type: 'otp_failed',
      projectId,
      channel: otp.channel,
      createdAt: Date.now()
    });
    await db.save(database);
    throw new Error('Invalid code');
  }

  // Remove the OTP after successful verification
  database.otps = database.otps.filter(o => o.requestId !== requestId);

  database.events.push({
    type: 'otp_verified',
    projectId,
    channel: otp.channel,
    createdAt: Date.now()
  });

  await db.save(database);

  return { verified: true };
}

module.exports = { createAndSend, verify };
