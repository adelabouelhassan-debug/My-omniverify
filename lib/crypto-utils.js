// lib/crypto-utils.js
const crypto = require('crypto');

// Hash password using scrypt
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, (err, hash) => {
      if (err) reject(err);
      resolve(salt.toString('hex') + ':' + hash.toString('hex'));
    });
  });
}

// Verify password
async function verifyPassword(password, hash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.scrypt(password, Buffer.from(salt, 'hex'), 64, (err, hash) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(hash, Buffer.from(key, 'hex')));
    });
  });
}

// Generate API key pair
function apiKeyPair() {
  return {
    publicKey: 'pk_' + crypto.randomBytes(16).toString('hex'),
    secretKey: 'sk_' + crypto.randomBytes(24).toString('hex')
  };
}

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash OTP code
async function hashCode(code) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(code, salt, 32, (err, hash) => {
      if (err) reject(err);
      resolve(salt.toString('hex') + ':' + hash.toString('hex'));
    });
  });
}

// Verify OTP code
async function verifyCode(code, hash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.scrypt(code, Buffer.from(salt, 'hex'), 32, (err, hash) => {
      if (err) reject(err);
      try {
        resolve(crypto.timingSafeEqual(hash, Buffer.from(key, 'hex')));
      } catch {
        resolve(false);
      }
    });
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  apiKeyPair,
  generateSessionToken,
  hashCode,
  verifyCode
};
