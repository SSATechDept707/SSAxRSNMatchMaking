import crypto from "crypto";

const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

export function encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
    const enc = Buffer.concat([cipher.update(text, "uft8"), cipher.final()]);

    const tag = cipher.getAuthTag();

    return [iv, tag, enc].map((b) => b.toString("hex")).join(":");
}


export function decrypt(payload)  {
const [iv, tag, enc] = payload.split(":").map((h) => Buffer.from(h, "hex"));
const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}