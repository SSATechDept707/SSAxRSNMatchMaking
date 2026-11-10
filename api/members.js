import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { setSession } from "./lib/session.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();
    const sql = neon(process.env.DATABASE_URL);
    const { action, ...body } = req.body ?? {};
  
    try {
      switch (action) {
        case "registerCompany":
          return res.status(201).json(await registerCompany(sql, body));
        case "login":
          const member = await memberLogin(sql, body);
          setSession(res, { role: "member", companyId: member.company_id, accountId: member.id });
          return res.status(200).json(member);
        default:
          return res.status(400).json({ error: "Unknown action" });
      }
    } catch (e) {
      if (e.code === "23505") return res.status(409).json({ error: "UEN or email already registered" });
      if (e.status) return res.status(e.status).json({ error: e.message });
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
}
//step 1 register with comapny rep account
async function registerCompany(sql, b) {
    const { uen, companyName, location, logoUrl, repName, repEmail, password } = b;
    if (!uen || !companyName || !location || !repName || !repEmail || !password) {
      throw Object.assign(new Error("Missing fields"), { status: 400 });
    }
    const hash = await bcrypt.hash(password, 10);
  
    const [row] = await sql`
      WITH c AS (
        INSERT INTO member_companies
          (uen, company_name, location, logo_url, company_rep_name, company_rep_email)
        VALUES
          (${uen}, ${companyName}, ${location}, ${logoUrl ?? null}, ${repName}, ${repEmail})
        RETURNING id
      )
      INSERT INTO company_accounts (company_id, email, passwd, is_rep, approved)
      SELECT id, ${repEmail}, ${hash}, true, true FROM c
      RETURNING id, company_id, email`;
    return row;
  }
  
  // login
  async function memberLogin(sql, { email, password }) {
    const [acct] = await sql`
      SELECT id, company_id, email, passwd, approved
      FROM company_accounts WHERE email = ${email}`;
  
    const ok = acct && (await bcrypt.compare(password, acct.passwd));
    if (!ok) throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    if (!acct.approved) throw Object.assign(new Error("Account pending approval"), { status: 403 });
  
    const { passwd, ...safe } = acct; // never send the hash back
    return safe;
  }

//for non reps -> then proceed to register member
function approveNewCompanyAccount() {

}

//get profile
function getMemberById() {

}

//update details -> 
function updateMember() {
    
}


//delete company and all associated accounts - only to be done by rep
function deleteCompanyById() {
    
}

//delete accounts 
function deleteMemberById() {
    
}