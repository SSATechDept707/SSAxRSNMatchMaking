import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";
import { setSession, requireSession } from "./lib/session.js";
import { encrypt, decrypt, hashEmail } from "./lib/crypto.js";
import bcrypt from "bcryptjs";

const VERIFIED = "verified";
const STATUSES = ["unverified", "verified", "rejected"]; // same list as candidates.js

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, "Invalid id");
  return id;
}

const optionalId = (v) => (v === undefined || v === null || v === "" ? null : parseId(v));

function optionalBool(v) {
  if (v === undefined || v === null || v === "") return null;
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  throw httpError(400, "Expected true or false");
}

const likePattern = (s) => (s && String(s).trim() ? `%${String(s).trim()}%` : null);

/////////////////////////////////////////////////////////////////////////////////////////////
// Legacy support: rows may have a plaintext email/password (old) or an encrypted email /
// bcrypt password (new). email_lookup is only set on rows whose email is encrypted.
/////////////////////////////////////////////////////////////////////////////////////////////
const isBcrypt = (s) => /^\$2[aby]\$/.test(String(s ?? ""));
const readEmail = (row) => (row.email_lookup ? decrypt(row.email) : row.email);

async function verifyPassword(stored, given) {
  if (isBcrypt(stored)) return bcrypt.compare(given, stored);
  const a = Buffer.from(String(stored ?? ""));
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b); // legacy plaintext, constant-time
}

function publicAdmin(row) {
  const { passwd, email_lookup, ...rest } = row;
  return { ...rest, email: readEmail(row) };
}

function publicCandidate(row) {
  const { passwd, email_lookup, ...rest } = row;
  return { ...rest, email: readEmail(row) };
}

function checkPassword(p) {
  if (String(p ?? "").length < 8) throw httpError(400, "Password must be at least 8 characters");
}

function checkEmail(e) {
  const email = String(e ?? "").trim().toLowerCase();
  if (!email.includes("@")) throw httpError(400, "Invalid email");
  return email;
}

/////////////////////////////////////////////////////////////////////////////////////////////

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const sql = neon(process.env.DATABASE_URL);
  const { action, ...body } = req.body ?? {};

  try {
    if (action === "login") {
      const admin = await loginAdmin(sql, body);
      setSession(res, { role: "admin", adminId: admin.id, adminRole: admin.role ?? null });
      return res.status(200).json(admin);
    }

    const adminId = await requireAdmin(sql, req);
    const fn = ACTIONS[action];
    if (!fn) return res.status(400).json({ error: "Unknown action" });
    return res.status(200).json(await fn(sql, body, adminId));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    if (e.code === "23505") return res.status(409).json({ error: "That email or username is already in use" });
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}

// checks the session AND that the admin still exists, so a deleted admin is locked out at once
async function requireAdmin(sql, req) {
  let adminId;
  try {
    ({ adminId } = requireSession(req, "admin"));
  } catch {
    throw httpError(401, "Not logged in");
  }
  const [row] = await sql`SELECT id FROM admins WHERE id = ${adminId}`;
  if (!row) throw httpError(401, "Not logged in");
  return row.id;
}

async function loginAdmin(sql, { email, password }) {
  if (typeof email !== "string" || typeof password !== "string") {
    throw httpError(400, "Email and password are required");
  }
  const e = email.trim().toLowerCase();

  const [admin] = await sql`
    SELECT * FROM admins
    WHERE email_lookup = ${hashEmail(e)}
       OR (email_lookup IS NULL AND lower(email) = ${e})`;

  if (!admin || !(await verifyPassword(admin.passwd, password))) {
    throw httpError(401, "Invalid email or password");
  }

  // upgrade old plaintext rows the first time that admin logs in
  const legacyEmail = !admin.email_lookup;
  const legacyPass = !isBcrypt(admin.passwd);
  if (legacyEmail || legacyPass) {
    try {
      await sql`
        UPDATE admins SET
          email        = ${legacyEmail ? encrypt(e) : admin.email},
          email_lookup = ${legacyEmail ? hashEmail(e) : admin.email_lookup},
          passwd       = ${legacyPass ? await bcrypt.hash(password, 10) : admin.passwd}
        WHERE id = ${admin.id}`;
    } catch (err) {
      console.error("admin upgrade failed:", err.message); // never block the login
    }
  }
  return { ...publicAdmin(admin), email: e };
}

/////////////////////////////////////////////////////////////////////////////////////////////
// Shared queries
/////////////////////////////////////////////////////////////////////////////////////////////

// filters are all optional
async function listCandidates(sql, { status = null, verified = null, search = null } = {}) {
  if (status !== null && !STATUSES.includes(status)) throw httpError(400, "Invalid status");
  const pattern = likePattern(search);
  const rows = await sql`
    SELECT * FROM candidates
    WHERE (${status}::text IS NULL OR verification_status = ${status})
      AND (${verified}::boolean IS NULL OR (COALESCE(verification_status, '') = ${VERIFIED}) = ${verified})
      AND (${pattern}::text IS NULL OR full_name ILIKE ${pattern})
    ORDER BY id DESC`;
  return rows.map(publicCandidate);
}

async function fetchApplications(sql, { id = null, verifiedOnly = false, interviewed = null, postingId = null, companyId = null }) {
  const rows = await sql`
    SELECT a.id, a.candidate_id, a.posting_id, a.company_id,
           a.application_status, a.reason_for_rejection, a.have_interviewed,
           j.title AS job_title, co.company_name,
           cand.full_name, cand.email, cand.email_lookup, cand.age, cand.past_job_role,
           cand.verification_status
    FROM applications_made a
    JOIN job_postings j      ON j.id = a.posting_id
    JOIN member_companies co ON co.id = a.company_id
    JOIN candidates cand     ON cand.id = a.candidate_id
    WHERE (${id}::int IS NULL OR a.id = ${id})
      AND (${verifiedOnly}::boolean = false OR cand.verification_status = ${VERIFIED})
      AND (${interviewed}::boolean IS NULL OR a.have_interviewed = ${interviewed})
      AND (${postingId}::int IS NULL OR a.posting_id = ${postingId})
      AND (${companyId}::int IS NULL OR a.company_id = ${companyId})
    ORDER BY a.id DESC`;
  return rows.map(({ email_lookup, ...r }) => ({ ...r, email: readEmail({ email: r.email, email_lookup }) }));
}

/////////////////////////////////////////////////////////////////////////////////////////////
// View Data tab
/////////////////////////////////////////////////////////////////////////////////////////////

// { verified: true | false, search? }
async function getCandidatesByVerified(sql, body) {
  const verified = optionalBool(body.verified);
  if (verified === null) throw httpError(400, "verified must be true or false");
  return listCandidates(sql, { verified, search: body.search });
}

// applications made by verified candidates, links posting + company + candidate
// optional: { postingId, companyId }
async function getApprCandidatesApplied(sql, body) {
  return fetchApplications(sql, {
    verifiedOnly: true,
    postingId: optionalId(body.postingId),
    companyId: optionalId(body.companyId),
  });
}

// { interviewed: true | false, postingId?, companyId? }
async function getApplicationsByInterviewed(sql, body) {
  const interviewed = optionalBool(body.interviewed);
  if (interviewed === null) throw httpError(400, "interviewed must be true or false");
  return fetchApplications(sql, {
    interviewed,
    postingId: optionalId(body.postingId),
    companyId: optionalId(body.companyId),
  });
}

// { id, interviewed? }: one application (optionally only if its interview flag matches)
async function getSpecificApplicationByInterviewed(sql, body) {
  const [row] = await fetchApplications(sql, {
    id: parseId(body.id),
    interviewed: optionalBool(body.interviewed),
  });
  if (!row) throw httpError(404, "Application not found");
  return row;
}

/////////////////////////////////////////////////////////////////////////////////////////////
// Manage Users tab
// For one member or candidate (view/update/delete) use the existing APIs:
//   candidates.js: GET/PATCH/DELETE /api/candidates?id=
//   members.js:    see the admin patch below, using ?companyId=
/////////////////////////////////////////////////////////////////////////////////////////////

// { companyId?, approved?, search? }: company accounts with their company details
async function getMembers(sql, body) {
  const pattern = likePattern(body.search);
  return await sql`
    SELECT a.id, a.email, a.is_rep, a.approved,
           c.id AS company_id, c.uen, c.company_name, c.location, c.logo_url,
           c.company_rep_name, c.company_rep_email
    FROM company_accounts a
    JOIN member_companies c ON c.id = a.company_id
    WHERE (${optionalId(body.companyId)}::int IS NULL OR a.company_id = ${optionalId(body.companyId)})
      AND (${optionalBool(body.approved)}::boolean IS NULL OR a.approved = ${optionalBool(body.approved)})
      AND (${pattern}::text IS NULL OR c.company_name ILIKE ${pattern} OR a.email ILIKE ${pattern})
    ORDER BY c.company_name, a.is_rep DESC, a.id`;
}

// { status?, search? }
async function getCandidates(sql, body) {
  return listCandidates(sql, { status: body.status ?? null, search: body.search });
}

/////////////////////////////////////////////////////////////////////////////////////////////
// Verify user tab
/////////////////////////////////////////////////////////////////////////////////////////////

// { status } e.g. "unverified"
async function getCandidateByStatus(sql, body) {
  if (!body.status) throw httpError(400, "status is required");
  return listCandidates(sql, { status: body.status });
}

// { candidateId, status }
async function updateCandidateVerification(sql, body) {
  if (!STATUSES.includes(body.status)) throw httpError(400, "Invalid status");
  const [row] = await sql`
    UPDATE candidates SET verification_status = ${body.status}
    WHERE id = ${parseId(body.candidateId)}
    RETURNING *`;
  if (!row) throw httpError(404, "Candidate not found");
  return publicCandidate(row);
}

/////////////////////////////////////////////////////////////////////////////////////////////
// Admin accounts (new rows are encrypted + hashed)
/////////////////////////////////////////////////////////////////////////////////////////////

async function listAdmins(sql) {
  const rows = await sql`SELECT * FROM admins ORDER BY id`;
  return rows.map(publicAdmin);
}

// { username, email, password, role? }
async function createAdmin(sql, { username, email, password, role }) {
  if (!String(username ?? "").trim()) throw httpError(400, "Username is required");
  const e = checkEmail(email);
  checkPassword(password);

  const [row] = await sql`
    INSERT INTO admins (username, email, email_lookup, passwd, role)
    VALUES (${username.trim()}, ${encrypt(e)}, ${hashEmail(e)}, ${await bcrypt.hash(password, 10)}, ${role ?? null})
    RETURNING *`;
  return publicAdmin(row);
}

// { adminId, username?, email?, role?, newPassword?, currentPassword? }
// changing your own password needs currentPassword
async function updateAdmin(sql, body, myId) {
  const id = parseId(body.adminId);
  const username = body.username === undefined ? null : String(body.username).trim();
  if (body.username !== undefined && !username) throw httpError(400, "Username can't be empty");

  let encEmail = null;
  let lookup = null;
  if (body.email !== undefined) {
    const e = checkEmail(body.email);
    encEmail = encrypt(e);
    lookup = hashEmail(e);
  }

  let hash = null;
  if (body.newPassword !== undefined) {
    checkPassword(body.newPassword);
    if (id === myId) {
      const [me] = await sql`SELECT passwd FROM admins WHERE id = ${id}`;
      if (!me || !(await verifyPassword(me.passwd, String(body.currentPassword ?? "")))) {
        throw httpError(401, "Current password is incorrect");
      }
    }
    hash = await bcrypt.hash(String(body.newPassword), 10);
  }

  const [row] = await sql`
    UPDATE admins SET
      username     = COALESCE(${username}, username),
      email        = COALESCE(${encEmail}, email),
      email_lookup = COALESCE(${lookup}, email_lookup),
      passwd       = COALESCE(${hash}, passwd),
      role         = COALESCE(${body.role ?? null}, role)
    WHERE id = ${id}
    RETURNING *`;
  if (!row) throw httpError(404, "Admin not found");
  return publicAdmin(row);
}

// { adminId }
async function deleteAdmin(sql, body, myId) {
  const id = parseId(body.adminId);
  if (id === myId) throw httpError(400, "You can't delete your own account");
  const [row] = await sql`DELETE FROM admins WHERE id = ${id} RETURNING id`;
  if (!row) throw httpError(404, "Admin not found");
  return { deleted: row.id };
}

const ACTIONS = {
  getCandidatesByVerified,
  getApprCandidatesApplied,
  getApplicationsByInterviewed,
  getSpecificApplicationByInterviewed,
  getMembers,
  getCandidates,
  getCandidateByStatus,
  updateCandidateVerification,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};