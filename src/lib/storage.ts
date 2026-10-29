import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { del, put } from '@vercel/blob';

const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads');

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Stores an (already compressed) photo and returns its public URL. */
export async function savePhoto(file: File): Promise<string | null> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;

  if (useBlob()) {
    const blob = await put(`tickets/${name}`, file, { access: 'public', contentType: file.type });
    return blob.url;
  }
  if (process.env.VERCEL) {
    console.warn('Photo skipped: connect a Vercel Blob store to enable photo uploads.');
    return null;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function deletePhotos(urls: string[]): Promise<void> {
  const remote = urls.filter((u) => u.startsWith('http'));
  const local = urls.filter((u) => u.startsWith('/uploads/'));
  if (remote.length && useBlob()) await del(remote);
  for (const u of local) {
    await unlink(path.join(LOCAL_DIR, path.basename(u))).catch(() => undefined);
  }
}
