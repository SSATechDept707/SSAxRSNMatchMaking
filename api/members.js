import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { setSession, requireSession } from "./lib/session.js";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, "Invalid id");
  return id;
}

const normEmail = (e) => String(e ?? "").trim().toLowerCase();

function checkPassword(p) {
  if (String(p ?? "").length < 8) throw httpError(400, "Password must be at least 8 characters");
}

// Loads the logged-in account from the DB on every request, so a deleted or
// unapproved account stops working immediately even if its cookie is still valid.
async function getMember(sql, req) {
  const { accountId } = requireSession(req, "member");
  const [acct] = await sql`
    SELECT id, company_id, email, is_rep, approved
    FROM company_accounts WHERE id = ${accountId}`;
  if (!acct || !acct.approved) throw httpError(401, "Not logged in");
  return acct;
}

function requireRep(acct) {
  if (!acct.is_rep) throw httpError(403, "Only the company representative can do this");
}

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  try {
    switch (req.method) {
      case "POST": {
        const { action, ...body } = req.body ?? {};
        switch (action) {
          case "registerCompany":
            return res.status(201).json(await registerCompany(sql, body));
          case "registerAccount":
            return res.status(201).json(await registerAccount(sql, body));
          case "login": {
            const member = await memberLogin(sql, body);
            setSession(res, { role: "member", companyId: member.company_id, accountId: member.id });
            return res.status(200).json(member);
          }
          default:
            return res.status(400).json({ error: "Unknown action" });
        }
      }

      case "GET": {
        const me = await getMember(sql, req);
        // rep: list every account in the company (use ?accounts=true to see pending ones)
        if (req.query.accounts) return res.status(200).json(await listCompanyAccounts(sql, me));
        return res.status(200).json(await getMemberById(sql, me.id));
      }

      case "PATCH": {
        const me = await getMember(sql, req);
        // rep approves a pending account: { accountId, approved: true }
        if (req.body?.accountId !== undefined) {
          return res.status(200).json(await approveNewCompanyAccount(sql, me, parseId(req.body.accountId)));
        }
        return res.status(200).json(await updateMember(sql, me, req.body ?? {}));
      }

      case "DELETE": {
        const me = await getMember(sql, req);
        // ?company=true deletes the whole company (rep only, needs { password } in the body)
        if (req.query.company) {
          return res.status(200).json(await deleteCompanyById(sql, me, req.body?.password));
        }
        // ?accountId=5 removes that account (rep only); with no id, removes your own
        const target = req.query.accountId ? parseId(req.query.accountId) : me.id;
        return res.status(200).json(await deleteMemberById(sql, me, target));
      }

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    if (e.code === "23505") return res.status(409).json({ error: "UEN or email already registered" });
    if (e.code === "23503") {
      return res.status(409).json({ error: "Some job postings have applicants, so the company can't be deleted yet" });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}

// step 1: register a company together with its representative account
async function registerCompany(sql, b) {
  const { uen, companyName, location, logoUrl, repName, repEmail, password } = b;
  if (!uen || !companyName || !location || !repName || !repEmail || !password) {
    throw httpError(400, "Missing fields");
  }
  checkPassword(password);
  const email = normEmail(repEmail);
  if (!email.includes("@")) throw httpError(400, "Invalid email");
  const hash = await bcrypt.hash(password, 10);

  const [row] = await sql`
    WITH c AS (
      INSERT INTO member_companies
        (uen, company_name, location, logo_url, company_rep_name, company_rep_email)
      VALUES
        (${String(uen).trim().toUpperCase()}, ${companyName.trim()}, ${location.trim()},
         ${logoUrl ?? null}, ${repName.trim()}, ${email})
      RETURNING id
    )
    INSERT INTO company_accounts (company_id, email, passwd, is_rep, approved)
    SELECT id, ${email}, ${hash}, true, true FROM c
    RETURNING id, company_id, email`;
  return row;
}

// step 2: a non-rep colleague registers under an existing company (by UEN).
// approved = false, so they can't log in until the rep approves them.
async function registerAccount(sql, { uen, email, password }) {
  if (!uen || !email || !password) throw httpError(400, "Missing fields");
  checkPassword(password);
  const normalized = normEmail(email);
  if (!normalized.includes("@")) throw httpError(400, "Invalid email");

  const [company] = await sql`
    SELECT id FROM member_companies WHERE upper(uen) = ${String(uen).trim().toUpperCase()}`;
  if (!company) throw httpError(404, "No company registered with that UEN");

  const hash = await bcrypt.hash(password, 10);
  const [row] = await sql`
    INSERT INTO company_accounts (company_id, email, passwd, is_rep, approved)
    VALUES (${company.id}, ${normalized}, ${hash}, false, false)
    RETURNING id, company_id, email, approved`;
  return row;
}

// login
async function memberLogin(sql, { email, password }) {
  if (!email || !password) throw httpError(400, "Email and password are required");

  const [acct] = await sql`
    SELECT id, company_id, email, passwd, is_rep, approved
    FROM company_accounts WHERE lower(email) = ${normEmail(email)}`;

  const ok = acct && (await bcrypt.compare(password, acct.passwd));
  if (!ok) throw httpError(401, "Invalid credentials");
  if (!acct.approved) throw httpError(403, "Account pending approval");

  const { passwd, ...safe } = acct; // never send the hash back
  return safe;
}

// rep approves a non-rep account. To reject one, delete it with deleteMemberById.
async function approveNewCompanyAccount(sql, me, accountId) {
  requireRep(me);
  const [row] = await sql`
    UPDATE company_accounts SET approved = true
    WHERE id = ${accountId} AND company_id = ${me.company_id}
    RETURNING id, company_id, email, is_rep, approved`;
  if (!row) throw httpError(404, "Account not found");
  return row;
}

// get profile: the account plus its company details
async function getMemberById(sql, id) {
  const [row] = await sql`
    SELECT a.id, a.email, a.is_rep, a.approved,
           c.id AS company_id, c.uen, c.company_name, c.location, c.logo_url,
           c.company_rep_name, c.company_rep_email
    FROM company_accounts a
    JOIN member_companies c ON c.id = a.company_id
    WHERE a.id = ${id}`;
  if (!row) throw httpError(404, "Account not found");
  return row;
}

// rep: all accounts in the company, pending ones first
async function listCompanyAccounts(sql, me) {
  requireRep(me);
  return await sql`
    SELECT id, email, is_rep, approved FROM company_accounts
    WHERE company_id = ${me.company_id}
    ORDER BY approved, id`;
}

// update details:
//   any member: email, newPassword (+ currentPassword)
//   rep only:   companyName, location, logoUrl, repName
async function updateMember(sql, me, body) {
  const { email, newPassword, currentPassword, companyName, location, logoUrl, repName } = body;

  const touchesCompany = [companyName, location, logoUrl, repName].some((v) => v !== undefined);
  if (touchesCompany) requireRep(me);

  const text = (v, label) => {
    if (v === undefined) return null;
    const t = String(v).trim();
    if (!t) throw httpError(400, `${label} can't be empty`);
    return t;
  };
  const name = text(companyName, "Company name");
  const loc = text(location, "Location");
  const rep = text(repName, "Representative name");
  const logoSet = logoUrl !== undefined; // lets the rep clear the logo with "" or null
  const logo = logoSet ? String(logoUrl ?? "").trim() || null : null;

  let newEmail = null;
  if (email !== undefined) {
    newEmail = normEmail(email);
    if (!newEmail.includes("@")) throw httpError(400, "Invalid email");
  }

  let hash = null;
  if (newPassword !== undefined) {
    checkPassword(newPassword);
    const [row] = await sql`SELECT passwd FROM company_accounts WHERE id = ${me.id}`;
    if (!row || !(await bcrypt.compare(String(currentPassword ?? ""), row.passwd))) {
      throw httpError(401, "Current password is incorrect");
    }
    hash = await bcrypt.hash(String(newPassword), 10);
  }

  const queries = [];
  if (newEmail || hash) {
    queries.push(sql`
      UPDATE company_accounts SET
      email  = COALESCE(${newEmail}, email),
        passwd = COALESCE(${hash}, passwd)
      WHERE id = ${me.id}`);
  }
  // when the rep changes their login email, keep the company's rep email in sync
  const syncRepEmail = me.is_rep ? newEmail : null;
  if (touchesCompany || syncRepEmail) {
    queries.push(sql`
      UPDATE member_companies SET
        company_name      = COALESCE(${name}, company_name),
        location          = COALESCE(${loc}, location),
        company_rep_name  = COALESCE(${rep}, company_rep_name),
        company_rep_email = COALESCE(${syncRepEmail}, company_rep_email),
        logo_url          = CASE WHEN ${logoSet}::boolean THEN ${logo}::text ELSE logo_url END
      WHERE id = ${me.company_id}`);
  }
  if (!queries.length) throw httpError(400, "Nothing to update");

  await sql.transaction(queries); // all or nothing
  return await getMemberById(sql, me.id);
}

// delete company and all associated accounts: rep only, must re-enter their password
async function deleteCompanyById(sql, me, password) {
  requireRep(me);
  const [row] = await sql`SELECT passwd FROM company_accounts WHERE id = ${me.id}`;
  if (!password || !row || !(await bcrypt.compare(String(password), row.passwd))) {
    throw httpError(401, "Password is incorrect");
  }

  await sql.transaction([
    sql`DELETE FROM job_postings WHERE company_id = ${me.company_id}`,
    sql`DELETE FROM company_accounts WHERE company_id = ${me.company_id}`,
    sql`DELETE FROM member_companies WHERE id = ${me.company_id}`,
  ]);
  return { deleted: me.company_id };
}

// delete one account: the rep can remove anyone in their company (this is also how
// you reject a pending account); everyone else can only remove themselves
async function deleteMemberById(sql, me, id) {
  if (id !== me.id) requireRep(me);

  const [target] = await sql`
    SELECT id, is_rep FROM company_accounts
    WHERE id = ${id} AND company_id = ${me.company_id}`;
  if (!target) throw httpError(404, "Account not found");
  if (target.is_rep) {
    throw httpError(400, "The representative account can't be deleted. Delete the company instead.");
  }

  await sql`DELETE FROM company_accounts WHERE id = ${id}`;
  return { deleted: id };
}