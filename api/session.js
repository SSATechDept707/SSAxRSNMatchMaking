import { getSession, clearSession } from "./lib/session.js";

export default function handler(req, res) {

 if (req.method === "GET") {
        const s = getSession(req);
        if (!s) return res.status(401).json({ error: "Not logged in" });
        return res.status(200).json({ role: s.role, adminRole: s.adminRole ?? null });
    }
    if (req.method === "DELETE") {
        clearSession(res);
        return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
}