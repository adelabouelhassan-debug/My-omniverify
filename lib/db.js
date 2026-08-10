// lib/db.js
// Postgres-backed storage using a single JSONB blob for simplicity.
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

let cachedData = null;

// Generate unique IDs
function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Load all data from database
async function load() {
  try {
    const res = await pool.query('SELECT data FROM app_state LIMIT 1');
    if (res.rows.length > 0) {
      return (cachedData = res.rows[0].data);
    }
    // Initialize on first run
    const initialData = {
      users: [],
      sessions: [],
      projects: [],
      otps: [],
      events: []
    };
    await pool.query('INSERT INTO app_state (data) VALUES ($1)', [JSON.stringify(initialData)]);
    return (cachedData = initialData);
  } catch (err) {
    // Table might not exist, create it
    if (err.code === '42P01') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_state (
          id SERIAL PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const initialData = {
        users: [],
        sessions: [],
        projects: [],
        otps: [],
        events: []
      };
      await pool.query('INSERT INTO app_state (data) VALUES ($1)', [JSON.stringify(initialData)]);
      return (cachedData = initialData);
    }
    throw err;
  }
}

// Save all data to database
async function save(data) {
  cachedData = data;
  await pool.query(
    'UPDATE app_state SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
    [JSON.stringify(data)]
  );
}

module.exports = { load, save, uid, pool };
