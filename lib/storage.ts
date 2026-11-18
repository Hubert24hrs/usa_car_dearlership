/**
 * Image storage drivers for vehicle photos.
 *   STORAGE_DRIVER=local       → /public/uploads (development only; read-only on Vercel)
 *   STORAGE_DRIVER=cloudinary  → signed REST upload (free tier available)
 *   STORAGE_DRIVER=s3          → any S3-compatible bucket (AWS S3, Cloudflare R2…)
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": { ext: "webp", magic: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
  "image/avif": { ext: "avif", magic: (b) => String.fromCharCode(...b.slice(4, 12)).startsWith("ftypavi") },
};

export class UploadError extends Error {}

function validate(bytes: Uint8Array, type: string) {
  const spec = TYPES[type];
  if (!spec) throw new UploadError("Only JPEG, PNG, WebP or AVIF images are allowed.");
  if (bytes.byteLength > MAX_BYTES) throw new UploadError("Images must be 10 MB or smaller.");
  if (!spec.magic(bytes)) throw new UploadError("File contents don't match the image type.");
  return spec.ext;
}

async function storeLocal(bytes: Uint8Array, ext: string, folder: string) {
  const now = new Date();
  const relDir = path.posix.join("uploads", folder, String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
  const dir = path.join(process.cwd(), "public", ...relDir.split("/"));
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return `/${relDir}/${name}`;
}

async function storeCloudinary(bytes: Uint8Array, type: string, folder: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new UploadError("Cloudinary is not configured.");
  const timestamp = Math.floor(Date.now() / 1000);
  const targetFolder = `${process.env.CLOUDINARY_FOLDER ?? "inventory"}/${folder}`;
  const signature = createHash("sha1").update(`folder=${targetFolder}&timestamp=${timestamp}${secret}`).digest("hex");
  const body = new FormData();
  body.append("file", `data:${type};base64,${Buffer.from(bytes).toString("base64")}`);
  body.append("api_key", key);
  body.append("timestamp", String(timestamp));
  body.append("folder", targetFolder);
  body.append("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, { method: "POST", body });
  if (!response.ok) throw new UploadError(`Cloudinary upload failed (${response.status})`);
  const json = (await response.json()) as { secure_url: string };
  return json.secure_url;
}

async function storeS3(bytes: Uint8Array, type: string, ext: string, folder: string) {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION ?? "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (!bucket || !accessKeyId || !secretAccessKey || !publicUrl) throw new UploadError("S3 storage is not configured.");
  const client = new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
  const key = `inventory/${folder}/${randomUUID()}.${ext}`;
  const endpoint = process.env.S3_ENDPOINT ? `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${bucket}` : `https://${bucket}.s3.${region}.amazonaws.com`;
  const response = await client.fetch(`${endpoint}/${key}`, {
    method: "PUT",
    body: bytes.buffer as ArrayBuffer,
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
  if (!response.ok) throw new UploadError(`S3 upload failed (${response.status})`);
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export async function storeImage(file: File, folder = "vehicles"): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = validate(bytes, file.type);
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "vehicles";
  switch (process.env.STORAGE_DRIVER ?? "local") {
    case "cloudinary":
      return storeCloudinary(bytes, file.type, safeFolder);
    case "s3":
      return storeS3(bytes, file.type, ext, safeFolder);
    default:
      if (process.env.VERCEL) throw new UploadError("Local storage is read-only on Vercel. Set STORAGE_DRIVER to cloudinary or s3.");
      return storeLocal(bytes, ext, safeFolder);
  }
}
