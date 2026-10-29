// Creates the tables and adds the three default staff members.
// Usage: npm run db:setup   (reads DATABASE_URL and DB_SSL from .env.local)
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const ssl = process.env.DB_SSL === 'false' ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true };

// Create the database itself if it does not exist yet.
const parsed = new URL(url);
const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
if (!dbName) {
  console.error('DATABASE_URL must end with a database name, e.g. .../ho_helpdesk');
  process.exit(1);
}
parsed.pathname = '/';
const admin = await mysql.createConnection({ uri: parsed.toString(), ssl });
await admin.query(`CREATE DATABASE IF NOT EXISTS \`${dbName.replace(/`/g, '')}\``);
await admin.end();

const conn = await mysql.createConnection({ uri: url, ssl, timezone: 'Z', multipleStatements: true });
const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await conn.query(schema);

const [rows] = await conn.query('SELECT COUNT(*) AS n FROM staff');
if (rows[0].n === 0) {
  const now = new Date();
  await conn.query('INSERT INTO staff (name, active, created_at) VALUES ?', [
    [
      ['Staff A', 1, now],
      ['Staff B', 1, now],
      ['Staff C', 1, now],
    ],
  ]);
  console.log('Added default staff: Staff A, Staff B, Staff C (rename them in the Admin page).');
}

await conn.end();
console.log(`Database "${dbName}" is ready.`);
