import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR ?? "./uploads";

export async function storagePut(
  key: string,
  buffer: Buffer,
  _contentType: string
): Promise<{ key: string; url: string }> {
  if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY) {
    // S3-compatible upload stub — wire AWS SDK when credentials provided
    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION ?? "us-east-1"}.amazonaws.com/${key}`;
    return { key, url };
  }

  const fullPath = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  const baseUrl = process.env.STORAGE_BASE_URL ?? "http://localhost:3001/uploads";
  return { key, url: `${baseUrl}/${key}` };
}

export function isStorageLocal(): boolean {
  return !process.env.S3_BUCKET;
}
