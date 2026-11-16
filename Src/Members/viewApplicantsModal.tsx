import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import type { } from "./Homepage";

type Status = "Under Review" | "Shortlisted" | "Rejected";

type Applicants = {
    id: number;
    posting_id: number;
    name: string;
    age: number;
    past_role: string;
    application_status: string;
    rejection_reason: string;
    interviewed?: boolean;
}

const formatDate = (iso: string) =>
    new Date(iso.replace(" ", "T")).toLocaleDateString("en-GB", {
        timeZone: "Asia/Singapore",
    });



export default function ViewApplicantsModal({
    postingId,
    title,
    onClose,
}: {
    postingId: number;
    title: string;
    onClose: () => void;
}) {
    const { setRole, logout } = useAuth();
    const [status, setStatus] = useState<status>("");
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);



    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/applications?posting_id=${postingId}`);
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

    async function updateStatus(id: number, application_status: Status) {
        const prev = applicants;
        // optimistic update
        setApplicants((list) => list.map((a) => (a.id === id ? { ...a, application_status } : a)));
        try {
            const res = await fetch(`/api/applications/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ application_status }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setApplicants(prev); // roll back
        }
    }
    if (loading) return <p>Loading…</p>;
    if (error) return <p className="text-red-600">{error}</p>;

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
            {!loading && !error && (
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
                                 <td className="border px-3 py-2">{a.name}</td>
                                 <td className="border px-3 py-2">{a.age}</td>
                                 <td className="border px-3 py-2">{a.past_role}</td>
                                 <td className="border px-3 py-2">
                                     <select
                                         value={a.application_status}
                                         onChange={(e) => updateStatus(a.id, e.target.value as Status)}
                                         className="border rounded px-1 py-0.5"
                                     >
                                         {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                                     </select>
                                 </td>
                                 <td className="border px-3 py-2">{a.interviewed ? "Yes" : "No"}</td>
                                 <td className="border px-3 py-2">{a.rejection_reason ?? ""}</td>
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