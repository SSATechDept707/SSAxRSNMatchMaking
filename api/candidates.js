import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { encrypt, decrypt, hashEmail } from "./lib/crypto.js";
import { setSession } from "./lib/session";

const sql = neon(process.env.DATABASE_URL);


export default async function handler(req, res) {

  try {
    if (req.method === "POST") {
      
      const { action } = req.body;

      // Candidate login
      if (action === "login") {
        const { email, password } = req.body;

        const candidate = await candidateLogin(email, password);
        setSession(res, { role: "candidate", accountId: candidate.id });
        if (!candidate) {
          return res.status(401).json({
            error: "Invalid email or password"
          });
        }

        // TODO: Create authentication session here

        return res.status(200).json({ candidate });
      }

      // Candidate registration
      return res.status(201).json(await createCandidate(req.body));
    }

    // Retrieve candidate profile by ID
    if (req.method === "GET") {
      const { candidateId } = requireSession(req, "candidate");
      const candidate = await getCandidateById(candidateId);
    
      if (!candidate) {
        return res.status(404).json({
          error: "Candidate not found"
        });
      }

      return res.status(200).json(candidate);
    }

    return res.status(405).json({
      error: "Method not allowed"
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Server error",
      debug: e.message
    });
  }
}

//encryption needed

async function createCandidate({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const passwordHash = await bcrypt.hash(password, 10);
  const encryptedEmail = encrypt(normalizedEmail);
  const emailLookup = hashEmail(normalizedEmail);

  const rows = await sql`
      INSERT INTO candidates (full_name, email, passwd, email_lookup)
      VALUES (
          ${name},
          ${encryptedEmail},
          ${passwordHash},
          ${emailLookup}
      )
      RETURNING id, full_name
  `;

  return rows[0];
}

//login

async function candidateLogin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const emailLookup = hashEmail(normalizedEmail);

  const rows = await sql`
      SELECT * FROM candidates
      WHERE email_lookup = ${emailLookup}
  `;
  console.log("rows found:", rows.length);
  if (!rows[0]) return null;

  const candidate = rows[0];

  const validPassword = await bcrypt.compare(
      password,
      candidate.passwd
  );
  console.log("password valid:", validPassword);
  if (!validPassword) return null;

  return {
      ...candidate,
      email: decrypt(candidate.email),
      passwd: undefined,
      email_lookup: undefined
  };
}

//view profile
async function getCandidateById(id) {
  const rows = await sql`
      SELECT * FROM candidates
      WHERE id = ${id}
  `;

  if (!rows[0]) return null;

  return {
    ...rows[0],
    email: decrypt(rows[0].email),
    passwd: undefined
  };
}

function updateCandidate() {

}

function deleteCandidateById() {

}