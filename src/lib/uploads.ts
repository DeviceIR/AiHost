import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

const uploadsDir = path.join(process.cwd(), "uploads");
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function persistUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  if (hasBlobToken) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `attachments/${randomUUID()}-${safeName}`;
    const blob = await put(key, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: mimeType,
    });

    return {
      path: blob.url,
      fileName: file.name,
      mimeType,
      size: buffer.length,
      contentBase64: buffer.toString("base64"),
    };
  }

  await mkdir(uploadsDir, { recursive: true });

  const id = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const relativePath = path.join(id, safeName);
  const fullPath = path.join(uploadsDir, relativePath);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);

  return {
    path: relativePath,
    fileName: file.name,
    mimeType,
    size: buffer.length,
    contentBase64: buffer.toString("base64"),
  };
}

export function resolveUploadPath(relativePath: string) {
  return path.join(uploadsDir, relativePath);
}
