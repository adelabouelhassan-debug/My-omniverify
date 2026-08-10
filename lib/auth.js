// lib/auth.js
const crypto = require('./crypto-utils');
const db = require('./db');

async function register({ email, password }) {
  const database = await db.load();
  if (database.users.find(u => u.email === email)) {
    throw new Error('Email already registered');
  }
  const user = {
    id: db.uid('usr'),
    email,
    passwordHash: await crypto.hashPassword(password),
    createdAt: Date.now()
  };
  database.users.push(user);
  // Auto-create a project with trial credits
  const keys = crypto.apiKeyPair();
  const project = {
    id: db.uid('prj'),
    ownerId: user.id,
    name: 'My First Project',
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    credits: 100,
    createdAt: Date.now()
  };
  database.projects.push(project);
  await db.save(database);
  // Generate session token
  const token = crypto.generateSessionToken();
  database.sessions.push({
    token,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  });
  await db.save(database);
  return { user: { id: user.id, email: user.email }, token, project };
}

async function login({ email, password }) {
  const database = await db.load();
  const user = database.users.find(u => u.email === email);
  if (!user || !(await crypto.verifyPassword(password, user.passwordHash))) {
    throw new Error('Invalid email or password');
  }
  const token = crypto.generateSessionToken();
  database.sessions.push({
    token,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  });
  await db.save(database);
  return { user: { id: user.id, email: user.email }, token };
}

async function userFromToken(token) {
  const database = await db.load();
  const session = database.sessions.find(s => s.token === token && s.expiresAt > Date.now());
  if (!session) return null;
  return database.users.find(u => u.id === session.userId);
}

async function projectFromSecretKey(secretKey) {
  const database = await db.load();
  return database.projects.find(p => p.secretKey === secretKey);
}

module.exports = { register, login, userFromToken, projectFromSecretKey };
