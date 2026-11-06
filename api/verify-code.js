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

          const { data, error } = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Your verification code",
            text: `Your code is ${code}. It expires in 10 minutes.`,
          });
          
          if (error) {
            console.error(error);
            return res.status(500).json({ error: "Could not send code" });
          }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not send code" });
  }
}
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { email, code } = req.body;
    const rows = await sql`SELECT * FROM verification_codes WHERE email = ${email}`;
    const row = rows[0];

    if (!row || new Date(row.expires_at) < new Date() || row.attempts >= 5) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    await sql`UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ${email}`;

    const ok = await bcrypt.compare(String(code), row.code_hash);
    if (!ok) return res.status(400).json({ error: "Invalid or expired code" });

    await sql`DELETE FROM verification_codes WHERE email = ${email}`;
    res.status(200).json({ verified: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}