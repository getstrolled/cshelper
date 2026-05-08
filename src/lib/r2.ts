import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function r2WriteConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim(),
  );
}

/** Upload + public CDN URL both required so stored paths stay /uploads/… but resolve correctly */
export function r2UploadConfigured(): boolean {
  return r2WriteConfigured() && Boolean(process.env.R2_PUBLIC_BASE_URL?.trim());
}

let client: S3Client | undefined;

export function getR2Client(): S3Client {
  if (!client) {
    const accountId = process.env.R2_ACCOUNT_ID!.trim();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
      },
    });
  }
  return client;
}

export async function putR2Object(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const c = getR2Client();
  await c.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!.trim(),
      Key: key.replace(/^\/+/, ""),
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );
}
