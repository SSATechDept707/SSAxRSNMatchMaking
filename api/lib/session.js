import jwt from "jsonwebtoken";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds
const isProd = process.env.NODE_ENV === "production";

function serialize(value, maxAge) {
    return [
        `${COOKIE}=${value}`,
        "Path=/",
        "HttpOnly",         
        "SameSite=Lax",      // not sent on cross-site POST/PATCH/DELETE
        `Max-Age=${maxAge}`,
        isProd ? "Secure" : "",
    ].filter(Boolean).join("; ");
}

export function setSession(res, payload) {
    const token = jwt.sign(payload, process.env.SESSION_SECRET, { expiresIn: MAX_AGE });
    res.setHeader("Set-Cookie", serialize(token, MAX_AGE));
}

export function clearSession(res) {
    res.setHeader("Set-Cookie", serialize("", 0));
}

// returns the payload, or null if there's no cookie / it's expired / it was tampered with
export function getSession(req) {
    const raw = req.headers.cookie ?? "";
    const found = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
    if (!found) return null;
    try {
        return jwt.verify(found.slice(COOKIE.length + 1), process.env.SESSION_SECRET, {
            algorithms: ["HS256"],
        });
    } catch {
        return null;
    }
}

// for protected endpoints: throws 401/403, otherwise returns the session
export function requireSession(req, role) {
    const s = getSession(req);
    if (!s) throw Object.assign(new Error("Not logged in"), { status: 401 });
    if (role && s.role !== role) throw Object.assign(new Error("Not allowed"), { status: 403 });
    return s;
}