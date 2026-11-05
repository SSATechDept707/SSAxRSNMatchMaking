import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

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