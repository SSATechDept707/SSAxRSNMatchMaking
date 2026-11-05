import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import {encrypt, decrypt} from "./lib/crypto.js";
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
   

    try{
        if (req.method === "POST") {
            return res.status(201).json(await createCandidate(req.body));
          }
          if (req.method === "GET") {
            return res.status(200).json(await getCandidateById(req.query.id));
          }
          res.status(405).end();
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
}
//encryption needed
async function createCandidate({name, email, password}) {
const passwowrdHash = await bcrypt.hash(password, 10);
const encryptedEmail = encrypt(email);

const rows = await sql ` 
INSERT INTO candidates (full_name, email, passwd)
VALUES (${name}, ${encryptedEmail}, ${passwowrdHash})
RETURNING id, full_name, email
`;
return rows[0];
}

 async function getCandidateById(id) {
const rows = await sql`SELECT * FROM candidates WHERE id = ${id}`;
if(!rows[0]) return null;

return {...rows[0], email: decrypt(rows[0].email), passwd: undefined}
}

function updateCandidate() {
    
}

function deleteCandidateById() {
    
}