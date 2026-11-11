import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { encrypt, decrypt, hashEmail } from "./lib/crypto.js";
import { setSession, requireSession } from "./lib/session.js";

const sql = neon(process.env.DATABASE_URL);

const STATUSES = ["unverified", "verified", "rejected"]; // adjust to the values your admin uses

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, "Invalid id");
  return id;
}

// optional field: returns null when not sent, throws when sent but invalid
function parseAge(value) {
  if (value === undefined || value === null || value === "") return null;
  const age = Number(value);
  if (!Number.isInteger(age) || age < 16 || age > 100) {
    throw httpError(400, "Age must be a whole number between 16 and 100");
  }
  return age;
}

function parsePastJobRole(value) {
  if (value === undefined || value === null) return null;
  const role = String(value).trim();
  if (!role) throw httpError(400, "Past job role can't be empty");
  if (role.length > 150) throw httpError(400, "Past job role is too long");
  return role;
}

// Who is calling? Returns { role, candidateId } or { role: "admin" }.
// Assumes your admin session is { role: "admin", ... }. Adjust if yours differs.
function getActor(req) {
  try {
    const s = requireSession(req, "candidate");
    return { role: "candidate", candidateId: s.candidateId };
  } catch {
    /* not a candidate, try admin */
  }
  try {
    requireSession(req, "admin");
    return { role: "admin" };
  } catch {
    throw httpError(401, "Not logged in");
  }
}

// Candidates can only touch themselves. Admins pass ?id= to pick one.
function resolveTargetId(req, actor) {
  if (actor.role === "admin") return parseId(req.query.id);
  if (req.query.id && Number(req.query.id) !== actor.candidateId) {
    throw httpError(403, "Not allowed");
  }
  return actor.candidateId;
}

// removes secrets and decrypts the email before sending to the client
function toPublic(row) {
  const { passwd, email_lookup, ...rest } = row;
  return { ...rest, email: decrypt(row.email) };
}

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { action } = req.body;

      // Candidate login
      if (action === "login") {
        const { email, password } = req.body;
        const candidate = await candidateLogin(email, password);
        if (!candidate) {
          return res.status(401).json({ error: "Invalid email or password" });
        }
        setSession(res, { role: "candidate", candidateId: candidate.id });
        return res.status(200).json({ candidate });
      }

      // Candidate registration
      return res.status(201).json(await createCandidate(req.body));
    }

    if (req.method === "GET") {
      const actor = getActor(req);

      // admin: list candidates (optionally ?status=unverified) or fetch one with ?id=
      if (actor.role === "admin" && !req.query.id) {
        return res.status(200).json(await listCandidates(req.query.status));
      }

      const candidate = await getCandidateById(resolveTargetId(req, actor));
      if (!candidate) return res.status(404).json({ error: "Candidate not found" });
      return res.status(200).json(candidate);
    }

    if (req.method === "PATCH") {
      const actor = getActor(req);
      const id = resolveTargetId(req, actor);

      // admin only: approve / reject
      if (req.body.verificationStatus !== undefined) {
        if (actor.role !== "admin") throw httpError(403, "Admins only");
        return res.status(200).json(await updateCandidateStatus(id, req.body.verificationStatus));
      }

      return res.status(200).json(await updateCandidate(id, req.body, actor));
    }

    if (req.method === "DELETE") {
      const actor = getActor(req);
      return res.status(200).json(await deleteCandidateById(resolveTargetId(req, actor)));
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    if (e.code === "23505") return res.status(409).json({ error: "That email is already registered" });
    if (e.code === "23503") {
      return res.status(409).json({ error: "This candidate has applications and can't be deleted" });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}

async function createCandidate({ name, email, password, age, pastJobRole }) {
  if (!name?.trim() || !email?.trim() || !password) {
    throw httpError(400, "Name, email and password are required");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const parsedAge = parseAge(age);
  const parsedRole = parsePastJobRole(pastJobRole);

  const passwordHash = await bcrypt.hash(password, 10);
  const encryptedEmail = encrypt(normalizedEmail);
  const emailLookup = hashEmail(normalizedEmail);

  const rows = await sql`
      INSERT INTO candidates (full_name, email, passwd, email_lookup, age, past_job_role)
      VALUES (${name.trim()}, ${encryptedEmail}, ${passwordHash}, ${emailLookup},
              ${parsedAge}, ${parsedRole})
      RETURNING id, full_name`;
  return rows[0];
}

async function candidateLogin(email, password) {
  if (!email || !password) return null;
  const emailLookup = hashEmail(email.trim().toLowerCase());

  const rows = await sql`SELECT * FROM candidates WHERE email_lookup = ${emailLookup}`;
  if (!rows[0]) return null;

  const validPassword = await bcrypt.compare(password, rows[0].passwd);
  if (!validPassword) return null;

  return toPublic(rows[0]);
}

async function getCandidateById(id) {
  const rows = await sql`SELECT * FROM candidates WHERE id = ${id}`;
  return rows[0] ? toPublic(rows[0]) : null;
}

// admin: all candidates, optionally filtered by verification_status
async function listCandidates(status) {
  const rows = status
    ? await sql`SELECT * FROM candidates WHERE verification_status = ${status} ORDER BY id DESC`
    : await sql`SELECT * FROM candidates ORDER BY id DESC`;
  return rows.map(toPublic);
}

// candidate (own) or admin: change name, email, age, past job role, or password
async function updateCandidate(id, body = {}, actor) {
  const { name, email, age, pastJobRole, newPassword, currentPassword } = body;

  const fullName = name === undefined ? null : String(name).trim();
  if (name !== undefined && !fullName) throw httpError(400, "Name can't be empty");

  const parsedAge = parseAge(age);
  const parsedRole = parsePastJobRole(pastJobRole);

  let encryptedEmail = null;
  let emailLookup = null;
  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    if (!normalized.includes("@")) throw httpError(400, "Invalid email");
    encryptedEmail = encrypt(normalized);
    emailLookup = hashEmail(normalized);
  }

  let passwordHash = null;
  if (newPassword !== undefined) {
    if (String(newPassword).length < 8) throw httpError(400, "Password must be at least 8 characters");
    if (actor.role === "candidate") {
      // candidates must prove they know the current password
      const [row] = await sql`SELECT passwd FROM candidates WHERE id = ${id}`;
      if (!row || !(await bcrypt.compare(String(currentPassword ?? ""), row.passwd))) {
        throw httpError(401, "Current password is incorrect");
      }
    }
    passwordHash = await bcrypt.hash(String(newPassword), 10);
  }

  const [row] = await sql`
      UPDATE candidates SET
          full_name     = COALESCE(${fullName}, full_name),
          email         = COALESCE(${encryptedEmail}, email),
          email_lookup  = COALESCE(${emailLookup}, email_lookup),
          passwd        = COALESCE(${passwordHash}, passwd),
          age           = COALESCE(${parsedAge}::int, age),
          past_job_role = COALESCE(${parsedRole}, past_job_role)
      WHERE id = ${id}
      RETURNING *`;
  if (!row) throw httpError(404, "Candidate not found");
  return toPublic(row);
}

async function deleteCandidateById(id) {
  const [row] = await sql`DELETE FROM candidates WHERE id = ${id} RETURNING id`;
  if (!row) throw httpError(404, "Candidate not found");
  return { deleted: row.id };
}

// admin only (enforced in the handler)
async function updateCandidateStatus(id, status) {
  if (!STATUSES.includes(status)) throw httpError(400, "Invalid status");
  const [row] = await sql`
      UPDATE candidates SET verification_status = ${status}
      WHERE id = ${id}
      RETURNING *`;
  if (!row) throw httpError(404, "Candidate not found");
  return toPublic(row);
}