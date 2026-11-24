import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { setSession, requireSession } from "./lib/session.js";


const BUCKET = "company-logos-and-headshots";
const s3 = new S3Client({
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
});

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const { kind, contentType, size } = req.body ?? {};
  if (kind !== "headshot" && kind !== "logo")
    return res.status(400).json({ error: "Invalid upload type" });

  // headshots need a candidate login, logos need a member login
  const role = kind === "headshot" ? "candidate" : "member";

  let s;
  try {
    s = await requireSession(req, role);
  } catch {
    return res.status(401).json({ error: "Not logged in" });
  }
  if (!s) return res.status(401).json({ error: "Not logged in" });

  if (!EXT[contentType]) return res.status(400).json({ error: "Use a JPG, PNG or WebP" });
  if (!Number.isInteger(size) || size <= 0 || size > MAX_BYTES)
    return res.status(400).json({ error: "Max file size is 2 MB" });

  const folder = kind === "headshot" ? "headshots" : "logos";
  const key = `${folder}/${s.id}/${randomUUID()}.${EXT[contentType]}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: 60 }
  );

  res.json({
    uploadUrl,
    publicUrl: `${process.env.AWS_ENDPOINT_URL_S3}/${BUCKET}/${key}`,
  });
}