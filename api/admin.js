import { neon } from "@neondatabase/serverless";
import { setSession } from "./lib/session.js";
import bcrypt from "bcryptjs";

export default  async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);
    const { action, ...body } = req.body ?? {};
    try {
        switch(action) {
            case "login":
                {const admin = await loginAdmin(sql, body);
                setSession(res, { role: "Admin", accountId: admin.id });
                return res.status(200).json(admin);}

           default:
               return res.status(400).json({ error: "Unknown action" });
        }

    } catch(e) {
        if (e.status) return res.status(e.status).json({ error: e.message });
        console.error(e);
        return res.status(500).json({ error: "Server error" });
    }
}


async function loginAdmin(sql, { email, password }) {
    if (typeof email !== "string" || typeof password !== "string") {
        throw Object.assign(new Error("Email and password are required"), { status: 400 });
    }

    const [admin] = await sql`
        SELECT id, username FROM admins
        WHERE lower(email) = ${email.trim().toLowerCase()} AND passwd = ${password}`;

    if (!admin) throw Object.assign(new Error("Invalid email or password"), { status: 401 });
    return admin;
}

