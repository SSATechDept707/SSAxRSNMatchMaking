import { neon } from "@neondatabase/serverless";

const STATUSES = ["Open", "Closed"];

function httpError(status, message) {
    return Object.assign(new Error(message), { status });
}

// TEMPORARY: there's no login session yet, so we trust a companyId sent by the client.
// That is NOT secure. Replace with the id from the session once login creates one.
function getCompanyId(req) {
    const id = Number(req.body?.companyId ?? req.query.companyId);
    if (!Number.isInteger(id) || id < 1) throw httpError(401, "Not logged in");
    return id;
}

function parseId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw httpError(400, "Invalid id");
    return id;
}

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);
    ts
    console.log('cookie header:', req.headers.cookie);
    console.log('parsed cookies:', req.cookies);
    try {
        switch (req.method) {
            case "GET": {
                const { id, mine } = req.query;
                if (id) return res.status(200).json(await getPostingById(sql, parseId(id)));
                if (mine) return res.status(200).json(await getPostings(sql, getCompanyId(req)));
                return res.status(200).json(await getPostings(sql));
            }
            case "POST":
                return res.status(201).json(await createPosting(sql, getCompanyId(req), req.body));
            case "PATCH":
                return res
                    .status(200)
                    .json(await updatePostingById(sql, parseId(req.query.id), getCompanyId(req), req.body));
            case "DELETE":
                return res
                    .status(200)
                    .json(await deletePostingById(sql, parseId(req.query.id), getCompanyId(req)));
            default:
                return res.status(405).json({ error: "Method not allowed" });
        }
    } catch (e) {
        if (e.status) return res.status(e.status).json({ error: e.message });
        if (e.code === "23503") {
            return res.status(409).json({ error: "This posting has applicants. Close it instead of deleting." });
        }
        console.error(e);
        return res.status(500).json({ error: "Server error" });
    }
}

// Validates and cleans the body. With partial=true (updates), missing fields become null.
function parsePosting(b = {}, partial = false) {
    const has = (k) => b[k] !== undefined;

    const text = (k, label, max) => {
        if (!has(k)) {
            if (partial) return null;
            throw httpError(400, `${label} is required`);
        }
        const v = typeof b[k] === "string" ? b[k].trim() : "";
        if (!v) throw httpError(400, `${label} can't be empty`);
        if (v.length > max) throw httpError(400, `${label} is too long`);
        return v;
    };

    const skills = (k) => {
        if (!has(k)) return null;
        if (!Array.isArray(b[k])) throw httpError(400, `${k} must be a list`);
        const list = [...new Set(b[k].map((s) => String(s).trim()).filter(Boolean))];
        if (list.length > 20) throw httpError(400, `Too many items in ${k}`);
        return list;
    };

    let availOpening = null;
    if (has("availOpening")) {
        availOpening = Number(b.availOpening);
        if (!Number.isInteger(availOpening) || availOpening < 1) {
            throw httpError(400, "Openings must be a whole number of at least 1");
        }
    } else if (!partial) {
        availOpening = 1;
    }

    let closingDate = null;
    if (has("closingDate")) {
        const d = new Date(b.closingDate);
        if (isNaN(d)) throw httpError(400, "Invalid closing date");
        if (d <= new Date()) throw httpError(400, "Closing date must be in the future");
        closingDate = d.toISOString();
    } else if (!partial) {
        throw httpError(400, "Closing date is required");
    }

    let status = null;
    if (partial && has("postingStatus")) {
        if (!STATUSES.includes(b.postingStatus)) throw httpError(400, "Invalid status");
        status = b.postingStatus;
    }

    return {
        title: text("title", "Title", 150),
        description: text("description", "Description", 5000),
        payRange: text("payRange", "Pay range", 100),
        softSkills: skills("softSkills"),
        techSkills: skills("techSkills"),
        availOpening,
        closingDate,
        status,
    };
}

// create a posting
async function createPosting(sql, companyId, body) {
    const p = parsePosting(body);

    const [row] = await sql`
        INSERT INTO job_postings
            (company_id, title, description, pay_range, soft_skills, tech_skills, avail_opening, closing_date)
        VALUES
            (${companyId}, ${p.title}, ${p.description}, ${p.payRange},
             ${p.softSkills ?? []}::text[], ${p.techSkills ?? []}::text[],
             ${p.availOpening}, ${p.closingDate})
        RETURNING *`;
    return row;
}

// no companyId: public list of open postings for candidates
// with companyId: all of that company's postings (any status) for the member dashboard
async function getPostings(sql, companyId) {
    if (companyId) {
        return await sql`
            SELECT * FROM job_postings
            WHERE company_id = ${companyId}
            ORDER BY created_at DESC`;
    }
    return await sql`
        SELECT j.id, j.title, j.description, j.pay_range, j.soft_skills, j.tech_skills,
               j.avail_opening, j.closing_date, c.company_name, c.logo_url
        FROM job_postings j
        JOIN member_companies c ON c.id = j.company_id
        WHERE j.posting_status = 'Open' AND j.closing_date > now()
        ORDER BY j.created_at DESC`;
}

// get one posting (view full details or load into the edit form)
async function getPostingById(sql, id) {
    const [row] = await sql`
        SELECT j.*, c.company_name, c.logo_url
        FROM job_postings j
        JOIN member_companies c ON c.id = j.company_id
        WHERE j.id = ${id}`;
    if (!row) throw httpError(404, "Posting not found");
    return row;
}

// update only the fields that were sent
async function updatePostingById(sql, id, companyId, body) {
    const p = parsePosting(body, true);

    const [row] = await sql`
        UPDATE job_postings SET
            title          = COALESCE(${p.title}, title),
            description    = COALESCE(${p.description}, description),
            pay_range      = COALESCE(${p.payRange}, pay_range),
            soft_skills    = COALESCE(${p.softSkills}::text[], soft_skills),
            tech_skills    = COALESCE(${p.techSkills}::text[], tech_skills),
            avail_opening  = COALESCE(${p.availOpening}::int, avail_opening),
            closing_date   = COALESCE(${p.closingDate}::timestamptz, closing_date),
            posting_status = COALESCE(${p.status}, posting_status)
        WHERE id = ${id} AND company_id = ${companyId}
        RETURNING *`;
    if (!row) throw httpError(404, "Posting not found");
    return row;
}

async function deletePostingById(sql, id, companyId) {
    const [row] = await sql`
        DELETE FROM job_postings
        WHERE id = ${id} AND company_id = ${companyId}
        RETURNING id`;
    if (!row) throw httpError(404, "Posting not found");
    return { deleted: row.id };
}