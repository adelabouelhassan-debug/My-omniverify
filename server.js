// server.js
// -----------------------------------------------------------------------
// OmniVerify — multi-channel OTP verification platform (SMS / WhatsApp / Email)
// Storage: Postgres (see lib/db.js). Requires `npm install` (pg) and a
// DATABASE_URL — see README "Free deployment (to start)".
// -----------------------------------------------------------------------
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const db = require('./lib/db');
const auth = require('./lib/auth');
const otpService = require('./lib/otp');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = (m[2] || '').trim();
  }
}
loadEnvFile();

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, 'public');

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // 1MB guard
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// Both of these now hit the database (async), since auth.userFromToken and
// auth.projectFromSecretKey are async in the Postgres-backed version.
async function requireSession(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token && await auth.userFromToken(token);
  if (!user) { const e = new Error('Unauthorized'); e.status = 401; throw e; }
  return user;
}

async function requireApiKey(req) {
  const key = req.headers['x-api-key'];
  const project = key && await auth.projectFromSecretKey(key);
  if (!project) { const e = new Error('Invalid API key'); e.status = 401; throw e; }
  return project;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? '/dashboard.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'dashboard.html'); // SPA fallback
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url, true);

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  try {
    // ---------- Dashboard auth ----------
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { email, password } = await readBody(req);
      if (!email || !password || password.length < 8) {
        throw httpError(400, 'Please provide an email and a password (at least 8 characters)');
      }
      return sendJson(res, 201, await auth.register({ email, password }));
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await readBody(req);
      return sendJson(res, 200, await auth.login({ email, password }));
    }

    // ---------- Dashboard data (needs session) ----------
    if (pathname === '/api/me' && req.method === 'GET') {
      const user = await requireSession(req);
      return sendJson(res, 200, { user });
    }

    if (pathname === '/api/projects' && req.method === 'GET') {
      const user = await requireSession(req);
      const database = await db.load();
      const projects = database.projects.filter(p => p.ownerId === user.id);
      return sendJson(res, 200, { projects });
    }

    if (pathname === '/api/projects' && req.method === 'POST') {
      const user = await requireSession(req);
      const { name } = await readBody(req);
      const crypto = require('./lib/crypto-utils');
      const database = await db.load();
      const keys = crypto.apiKeyPair();
      const project = {
        id: db.uid('prj'), ownerId: user.id, name: name || 'New Project',
        publicKey: keys.publicKey, secretKey: keys.secretKey, credits: 20, createdAt: Date.now()
      };
      database.projects.push(project);
      await db.save(database);
      return sendJson(res, 201, { project });
    }

    if (pathname.match(/^\/api\/projects\/[^\/]+\/topup$/) && req.method === 'POST') {
      // Mock billing — wire this endpoint to Stripe (or any global payment
      // provider) for real charges. See README.
      const user = await requireSession(req);
      const projectId = pathname.split('/')[3];
      const { amount } = await readBody(req);
      const database = await db.load();
      const project = database.projects.find(p => p.id === projectId && p.ownerId === user.id);
      if (!project) throw httpError(404, 'Project not found');
      project.credits += Math.max(1, Math.min(10000, Number(amount) || 0));
      await db.save(database);
      return sendJson(res, 200, { project });
    }

    if (pathname.match(/^\/api\/projects\/[^\/]+\/usage$/) && req.method === 'GET') {
      const user = await requireSession(req);
      const projectId = pathname.split('/')[3];
      const database = await db.load();
      const project = database.projects.find(p => p.id === projectId && p.ownerId === user.id);
      if (!project) throw httpError(404, 'Project not found');
      const events = database.events.filter(e => e.projectId === projectId).slice(0, 100);
      const stats = {
        totalSent: events.filter(e => e.type === 'otp_sent').length,
        totalVerified: events.filter(e => e.type === 'otp_verified').length,
        totalFailed: events.filter(e => e.type === 'otp_failed').length,
        byChannel: ['sms', 'whatsapp', 'email'].map(ch => ({
          channel: ch, sent: events.filter(e => e.channel === ch && e.type === 'otp_sent').length
        }))
      };
      return sendJson(res, 200, { events, stats, project });
    }

    // ---------- Public OTP API (used by customer apps + the embeddable widget) ----------
    if (pathname === '/api/v1/otp/send' && req.method === 'POST') {
      const project = await requireApiKey(req);
      const { channel, destination } = await readBody(req);
      if (!channel || !destination) throw httpError(400, 'channel and destination are required');
      const result = await otpService.createAndSend({ projectId: project.id, channel, destination });
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/v1/otp/verify' && req.method === 'POST') {
      const project = await requireApiKey(req);
      const { requestId, code } = await readBody(req);
      if (!requestId || !code) throw httpError(400, 'requestId and code are required');
      const result = await otpService.verify({ projectId: project.id, requestId, code });
      return sendJson(res, 200, result);
    }

    // ---------- Static ----------
    if (req.method === 'GET') {
      return serveStatic(req, res, pathname);
    }

    throw httpError(404, 'Not found');
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    return sendJson(res, status, { error: err.message || 'Server error' });
  }
});

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

server.listen(PORT, () => {
  console.log(`✅ OmniVerify is running at http://localhost:${PORT}`);
});