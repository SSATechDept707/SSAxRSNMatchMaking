import { neon } from "@neondatabase/serverless";
import { decrypt } from "./lib/crypto.js";
import { requireSession } from "./lib/session.js";

const STATUSES = ["pending", "accepted", "rejected"]; // adjust to the values you use
const VERIFIED = "verified"; // same value CandidateHome checks
const NA = "Not applicable"; // see the note below about the default in your table

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, "Invalid id");
  return id;
}

const optionalId = (v) => (v === undefined || v === "" ? null : parseId(v));

function trySession(req, role) {
  try {
    return requireSession(req, role);
  } catch {
    return null;
  }
}

// Works out who is calling: candidate, member or admin.
// Members are re-checked in the DB, so a deleted or unapproved account stops working at once.
async function getActor(sql, req) {
  const cand = trySession(req, "candidate");
  if (cand) return { role: "candidate", candidateId: cand.candidateId };

  const mem = trySession(req, "member");
  if (mem) {
    const [acct] = await sql`
      SELECT id, company_id, approved FROM company_accounts WHERE id = ${mem.accountId}`;
    if (acct?.approved) return { role: "member", companyId: acct.company_id };
  }

  if (trySession(req, "admin")) return { role: "admin" };
  throw httpError(401, "Not logged in");
}

// the filters each role is allowed to use (candidates and members are locked to their own data)
function scopeFor(actor, query) {
  return {
    candidateId: actor.role === "candidate" ? actor.candidateId : optionalId(query.candidateId),
    companyId: actor.role === "member" ? actor.companyId : optionalId(query.companyId),
  };
}

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  try {
    const actor = await getActor(sql, req);

    switch (req.method) {
      case "POST":
        if (req.query.action === "apply") {
          const postingId = parseId(req.query.id);
          const recipients = await getEmailByPostingId(sql, postingId);
          return res.status(200).json({ recipients });
        }
        if (actor.role !== "candidate") throw httpError(403, "Only candidates can apply");
        return res.status(201).json(await createAnApplication(sql, actor.candidateId, req.body?.postingId));

      case "GET": {
        if (req.query.id) {
          return res.status(200).json(await getApplicantById(sql, actor, parseId(req.query.id), req.query));
        }
        return res.status(200).json(await getApplications(sql, actor, req.query));
      }

      case "PATCH":
        if (actor.role === "candidate") throw httpError(403, "Not allowed");
        return res.status(200).json(await updateApplication(sql, actor, parseId(req.query.id), req.body ?? {}));

      case "DELETE":
        return res.status(200).json(await removeApplicant(sql, actor, parseId(req.query.id), req.query));

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    if (e.code === "23505") return res.status(409).json({ error: "You've already applied for this job" });
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}


// one query for every read: each filter is optional
async function fetchApplications(sql, { id = null, candidateId = null, companyId = null, postingId = null, status = null }) {
  const rows = await sql`
    SELECT a.id, a.candidate_id, a.posting_id, a.company_id,
           a.application_status, a.reason_for_rejection, a.have_interviewed,
           j.title AS job_title,
           co.company_name, co.logo_url,
           cand.full_name, cand.email, cand.age, cand.past_role
    FROM applications_made a
    JOIN job_postings j       ON j.id = a.posting_id
    JOIN member_companies co  ON co.id = a.company_id
    JOIN candidates cand      ON cand.id = a.candidate_id
    WHERE (${id}::int IS NULL          OR a.id = ${id})
      AND (${candidateId}::int IS NULL OR a.candidate_id = ${candidateId})
      AND (${companyId}::int IS NULL   OR a.company_id = ${companyId})
      AND (${postingId}::int IS NULL   OR a.posting_id = ${postingId})
      AND (${status}::text IS NULL     OR a.application_status = ${status})
    ORDER BY a.id DESC`;
  return rows.map((r) => ({ ...r, email: decrypt(r.email) }));
}


async function getEmailByPostingId(sql, id) {
  const [row] = await sql`
  SELECT
      CASE m.cv_recipient
          WHEN 'rep' THEN ARRAY[m.company_rep_email]
          WHEN 'company' THEN ARRAY[COALESCE(m.company_email, m.company_rep_email)]
          ELSE ARRAY_REMOVE(ARRAY[m.company_rep_email, m.company_email], NULL)
      END AS recipients
  FROM job_postings j
  JOIN member_companies m ON m.id = j.company_id
  WHERE j.id = ${id}`;
if (!row) throw httpError(404, "Posting not found");
return row.recipients;
}


// candidate applies for a job. company_id comes from the posting, never from the client.
async function createAnApplication(sql, candidateId, postingId) {
  const pid = parseId(postingId);

  const [cand] = await sql`SELECT verification_status FROM candidates WHERE id = ${candidateId}`;
  if (cand?.verification_status !== VERIFIED) {
    throw httpError(403, "Your account must be verified before you can apply");
  }

  const [row] = await sql`
    INSERT INTO applications_made (candidate_id, posting_id, company_id)
    SELECT ${candidateId}, j.id, j.company_id
    FROM job_postings j
    WHERE j.id = ${pid} AND j.posting_status = 'Open' AND j.closing_date > now()
    RETURNING id`;
  if (!row) throw httpError(404, "This posting doesn't exist or is closed");

  const [created] = await fetchApplications(sql, { id: row.id });
  return created;
}

// one application. Out-of-scope ids return 404, so ids can't be probed.
async function getApplicantById(sql, actor, id, query) {
  const rows = await fetchApplications(sql, { id, ...scopeFor(actor, query) });
  if (!rows[0]) throw httpError(404, "Application not found");
  return rows[0];
}

// candidate: their own applications
// member: applications to their company's postings (?postingId=, ?status= to filter)
// admin: everything (also accepts ?companyId=, ?candidateId=)
async function getApplications(sql, actor, query) {
  const status = query.status ?? null;
  if (status !== null && !STATUSES.includes(status)) throw httpError(400, "Invalid status");

  return await fetchApplications(sql, {
    ...scopeFor(actor, query),
    postingId: optionalId(query.postingId),
    status,
  });
}

// member (own company) or admin: update status, rejection reason, interview flag
async function updateApplication(sql, actor, id, body) {
  const { applicationStatus, reason, haveInterviewed } = body;

  let status = null;
  let why = null;
  if (applicationStatus !== undefined) {
    if (!STATUSES.includes(applicationStatus)) throw httpError(400, "Invalid status");
    status = applicationStatus;
    if (status === "rejected") {
      why = String(reason ?? "").trim();
      if (!why) throw httpError(400, "A reason is required when rejecting an application");
      if (why.length > 1000) throw httpError(400, "Reason is too long");
    }
  } else if (reason !== undefined) {
    throw httpError(400, "Send applicationStatus together with a reason");
  }

  let interviewed = null;
  if (haveInterviewed !== undefined) {
    if (typeof haveInterviewed !== "boolean") throw httpError(400, "haveInterviewed must be true or false");
    interviewed = haveInterviewed;
  }
  if (status === null && interviewed === null) throw httpError(400, "Nothing to update");

  const companyId = actor.role === "member" ? actor.companyId : null;

  const [row] = await sql`
    UPDATE applications_made SET
      application_status   = COALESCE(${status}::text, application_status),
      reason_for_rejection = CASE
          WHEN ${status}::text IS NULL THEN reason_for_rejection
          WHEN ${status}::text = 'rejected' THEN ${why}::text
          ELSE ${NA}
        END,
      have_interviewed     = COALESCE(${interviewed}::boolean, have_interviewed)
    WHERE id = ${id} AND (${companyId}::int IS NULL OR company_id = ${companyId})
    RETURNING id`;
  if (!row) throw httpError(404, "Application not found");

  const [updated] = await fetchApplications(sql, { id: row.id });
  return updated;
}

// candidate: withdraw their own application (only while it is still pending)
// member: remove an applicant from their company's postings
// admin: remove any
async function removeApplicant(sql, actor, id) {
  const { candidateId, companyId } = scopeFor(actor, {});
  const pendingOnly = actor.role === "candidate";

  const [row] = await sql`
    DELETE FROM applications_made
    WHERE id = ${id}
      AND (${candidateId}::int IS NULL OR candidate_id = ${candidateId})
      AND (${companyId}::int IS NULL   OR company_id = ${companyId})
      AND (${pendingOnly}::boolean = false OR application_status = 'pending')
    RETURNING id`;
  if (!row) throw httpError(404, "Application not found" + (pendingOnly ? " or already processed" : ""));
  return { deleted: row.id };
}