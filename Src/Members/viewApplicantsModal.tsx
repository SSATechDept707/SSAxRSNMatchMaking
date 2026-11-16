import { useState, useEffect } from "react";

type Status = "pending" | "accepted" | "rejected";
const STATUS_OPTIONS: Status[] = ["pending", "accepted", "rejected"];

type Applicant = {
    id: number;
    posting_id: number;
    full_name: string;
    age: number;
    past_role: string;
    application_status: Status;
    reason_for_rejection: string | null;
    have_interviewed: boolean;
};

export default function ViewApplicantsModal({
    postingId,
    title,
    onClose,
}: {
    postingId: number;
    title: string;
    onClose: () => void;
}) {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/applications?postingId=${postingId}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setApplicants(await res.json());
            } catch (e) {
                console.error(e);
                setError("Failed to load applicants");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [postingId]);

    async function patch(id: number, body: object) {
        const res = await fetch(`/api/applications?id=${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.error ?? "Update failed");
            return;
        }
        const updated: Applicant = await res.json(); // API returns the fresh row
        setApplicants((list) => list.map((a) => (a.id === id ? updated : a)));
    }

    function changeStatus(id: number, applicationStatus: Status) {
        if (applicationStatus === "rejected") {
            const reason = window.prompt("Reason for rejection?");
            if (!reason?.trim()) return; // cancelled: the dropdown snaps back
            patch(id, { applicationStatus, reason });
        } else {
            patch(id, { applicationStatus });
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white text-gray-800 rounded-2xl p-6 w-full max-w-[1000px] max-h-[85vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Applicants: {title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
                </div>

                {loading && <p>Loading…</p>}
                {error && <p className="text-red-600">{error}</p>}
                {!loading && !error && applicants.length === 0 && <p>No applicants yet.</p>}
                {!loading && !error && applicants.length > 0 && (
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm border-collapse">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    {["Name", "Age", "Past role", "Status", "Interviewed", "Reason"].map((h) => (
                                        <th key={h} className="border px-3 py-2 text-left">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {applicants.map((a) => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="border px-3 py-2">{a.full_name}</td>
                                        <td className="border px-3 py-2">{a.age}</td>
                                        <td className="border px-3 py-2">{a.past_role}</td>
                                        <td className="border px-3 py-2">
                                            <select
                                                value={a.application_status}
                                                onChange={(e) => changeStatus(a.id, e.target.value as Status)}
                                                className="border rounded px-1 py-0.5"
                                            >
                                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td className="border px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={a.have_interviewed}
                                                onChange={(e) => patch(a.id, { haveInterviewed: e.target.checked })}
                                            />
                                        </td>
                                        <td className="border px-3 py-2">{a.reason_for_rejection ?? ""}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}