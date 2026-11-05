import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";

const sql = neon(process.env.DATABASE_URL);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { email } = req.body;
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);

    await sql`
      INSERT INTO verification_codes (email, code_hash, expires_at, attempts)
      VALUES (${email}, ${codeHash}, now() + interval '10 minutes', 0)
      ON CONFLICT (email) DO UPDATE
      SET code_hash = ${codeHash},
          expires_at = now() + interval '10 minutes',
          attempts = 0`;

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Your verification code",
      text: `Your code is ${code}. It expires in 10 minutes.`,
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not send code" });
  }
}