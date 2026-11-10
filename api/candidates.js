import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { encrypt, decrypt, hashEmail } from "./lib/crypto.js";
import { setSession, requireSession } from "./lib/session.js";

const sql = neon(process.env.DATABASE_URL);

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

    // Retrieve the logged-in candidate's own profile
    if (req.method === "GET") {
      const { candidateId } = requireSession(req, "candidate");
      const candidate = await getCandidateById(candidateId);

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      return res.status(200).json(candidate);
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error(e);
    return res.status(500).json({
      error: "Server error",
      debug: e.message // remove once everything works
    });
  }
}
function updateCandidate() {

}

function deleteCandidateById() {

}