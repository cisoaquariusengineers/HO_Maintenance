import mysql from 'mysql2/promise';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const globalForDb = globalThis as unknown as { hkPool?: Pool };

function createPool(): Pool {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is not set');
  return mysql.createPool({
    uri,
    // Dates are stored and read as UTC; the UI converts to IST for display.
    timezone: 'Z',
    connectionLimit: 5,
    enableKeepAlive: true,
    ssl: process.env.DB_SSL === 'false' ? undefined : { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });
}

function pool(): Pool {
  return (globalForDb.hkPool ??= createPool());
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool().query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await pool().query<ResultSetHeader>(sql, params);
  return result;
}
