import { useEffect, useState } from "react";

type UserStatus = "Unverified" | "Verified"  | "rejected";

type Candidate = {
    id: number;
    full_name: string;
    email: string;
    verification_status: UserStatus | null;
};


async function adminCall<T>(action: string, body: object = {}): Promise<T> {
    const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data as T;
}

export default function VerifyUsers() {
    const [users, setUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEfferct(() => {
        adminCall<Candidate[]>("getCandidateByStatus", { status: "unverified" })
        .then(setUsers)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, []);

    async function setStatus(candidateId: number, status: UserStatus) {
        try {
            await adminCall("updateCandidateVerification", { candidateId, status });
            // this list only shows unverified people, so remove them once actioned
            setUsers((prev) => prev.filter((u) => u.id !== candidateId));
        } catch (e) {
            setError((e as Error).message);
        }
    }

    if (loading) return <p>Loading...</p>;

    return (
        <div>
            {error && <p className="text-red-600">{error}</p>}
            {users.length === 0 && <p>No candidates waiting for verification.</p>}
            {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 py-2">
                    <span>{u.full_name} ({u.email})</span>
                    <button onClick={() => setStatus(u.id, "verified")}>Verify</button>
                    <button onClick={() => setStatus(u.id, "rejected")}>Reject</button>
                </div>
            ))}
        </div>
    );
}