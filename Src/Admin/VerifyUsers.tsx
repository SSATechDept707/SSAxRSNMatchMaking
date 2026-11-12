import { useEffect, useState } from "react";
import { Check, X, Loader2, Inbox } from "lucide-react";

type UserStatus = "unverified" | "verified" | "rejected";

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

const initials = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("");

export default function VerifyUsers() {
    const [users, setUsers] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);

    useEffect(() => {
        adminCall<Candidate[]>("getCandidateByStatus", { status: "unverified" })
            .then(setUsers)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    async function setStatus(candidateId: number, status: UserStatus) {
        setBusyId(candidateId);
        setError("");
        try {
            await adminCall("updateCandidateVerification", { candidateId, status });
            setUsers((prev) => prev.filter((u) => u.id !== candidateId));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusyId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin" size={18} />
                Loading candidates...
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <p className="text-sm text-gray-500 mb-4">
                {users.length} candidate{users.length === 1 ? "" : "s"} waiting for verification
            </p>

            {error && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{error}</span>
                    <button onClick={() => setError("")} aria-label="Dismiss">
                        <X size={16} />
                    </button>
                </div>
            )}

            {users.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-16 text-gray-400 shadow-sm">
                    <Inbox size={36} />
                    <p>No candidates waiting for verification.</p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {users.map((u) => {
                        const busy = busyId === u.id;
                        return (
                            <li
                                key={u.id}
                                className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#262261] text-sm font-semibold text-white">
                                    {initials(u.full_name) || "?"}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-gray-900">{u.full_name}</p>
                                    <p className="truncate text-sm text-gray-500">{u.email}</p>
                                </div>

                                <div className="flex shrink-0 gap-2">
                                    <button
                                        onClick={() => setStatus(u.id, "rejected")}
                                        disabled={busy}
                                        className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                    <button
                                        onClick={() => setStatus(u.id, "verified")}
                                        disabled={busy}
                                        className="flex items-center gap-1 rounded-lg bg-[#262261] px-3 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                    >
                                        {busy ? (
                                            <Loader2 className="animate-spin" size={16} />
                                        ) : (
                                            <Check size={16} />
                                        )}
                                        Verify
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}