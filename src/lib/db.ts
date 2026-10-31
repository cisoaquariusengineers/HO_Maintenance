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

/** Next ticket id (1, 2, 3, ...), never lower than an existing id. Atomic across requests. */
export async function nextTicketId(): Promise<number> {
  const conn = await pool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO counters (name, value) VALUES ('ticket', 1)
       ON DUPLICATE KEY UPDATE value = value + 1`,
    );
    const [[row]] = await conn.query<RowDataPacket[]>(
      `SELECT GREATEST(c.value, (SELECT COALESCE(MAX(id), 0) + 1 FROM tickets)) AS next
       FROM counters c WHERE c.name = 'ticket'`,
    );
    const next = Number(row.next);
    await conn.query("UPDATE counters SET value = ? WHERE name = 'ticket'", [next]);
    await conn.commit();
    return next;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await pool().query<ResultSetHeader>(sql, params);
  return result;
}
