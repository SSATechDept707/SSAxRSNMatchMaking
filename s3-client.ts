import "dotenv/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";


const s3 = new S3Client({
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
const bucket = "company-logos-and-headshots";
const key = "uploads/file.txt";

await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "Hello World!" }));


console.log("uploaded");

