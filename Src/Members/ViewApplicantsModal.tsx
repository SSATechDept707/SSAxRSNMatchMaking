import { useState, useEffect } from "react";

type Status = "pending" | "shortlisted" | "hired" | "rejected";

const STATUS_OPTIONS: Status[] = [
    "pending",
    "shortlisted",
    "hired",
    "rejected",
];

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
    onBack,
}: {
    postingId: number;
    title: string;
    onBack: () => void;
}) {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filter, setFilter] = useState<"all" | Status>("all");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [updating, setUpdating] = useState(false);

    // LOAD APPLICANTS
    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `/api/applications?postingId=${postingId}`
                );

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data: Applicant[] = await res.json();
                setApplicants(data);
                setSelectedIds(new Set());
            } catch (e) {
                console.error(e);
                setError("Failed to load applicants.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [postingId]);

    // STATISTICS
    const counts = {
        total: applicants.length,
        pending: applicants.filter(
            a => a.application_status === "pending"
        ).length,
        shortlisted: applicants.filter(
            a => a.application_status === "shortlisted"
        ).length,
        hired: applicants.filter(
            a => a.application_status === "hired"
        ).length,
        rejected: applicants.filter(
            a => a.application_status === "rejected"
        ).length,
    };

    // FILTER
    const filteredApplicants = applicants.filter(a =>
        filter === "all" ? true : a.application_status === filter
    );

    // SELECT APPLICANTS
    function toggleSelect(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function toggleSelectAll() {
        const visibleIds = filteredApplicants.map(a => a.id);

        const allSelected = visibleIds.every(id =>
            selectedIds.has(id)
        );

        setSelectedIds(prev => {
            const next = new Set(prev);

            visibleIds.forEach(id => {
                if (allSelected) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
            });

            return next;
        });
    }

    // UPDATE APPLICANT
    async function patch(id: number, body: Record<string, unknown>) {
        try {
            const res = await fetch(`/api/applications?id=${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? "Update failed");
            }

            const updated: Applicant = await res.json();

            setApplicants(list =>
                list.map(a => a.id === id ? updated : a)
            );

            return true;

        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Update failed");
            return false;
        }
    }

    // CHANGE INDIVIDUAL STATUS
    async function changeStatus(id: number, applicationStatus: Status) {
        let reason: string | undefined;

        if (applicationStatus === "rejected") {
            const answer = window.prompt("Reason for rejection?");

            if (!answer?.trim()) return;

            reason = answer.trim();
        }

        await patch(id, {
            applicationStatus,
            ...(reason ? { reason } : {}),
        });
    }

    // BULK ACTIONS
    async function updateSelected(applicationStatus: Status) {
        if (selectedIds.size === 0 || updating) return;

        let reason: string | undefined;

        if (applicationStatus === "rejected") {
            const answer = window.prompt(
                "Reason for rejecting the selected applicants?"
            );

            if (!answer?.trim()) return;

            reason = answer.trim();
        }

        const confirmed = window.confirm(
            `Update ${selectedIds.size} applicant(s) to "${applicationStatus}"?`
        );

        if (!confirmed) return;

        setUpdating(true);

        try {
            const results = await Promise.all(
                Array.from(selectedIds).map(id =>
                    patch(id, {
                        applicationStatus,
                        ...(reason ? { reason } : {}),
                    })
                )
            );

            if (results.every(Boolean)) {
                setSelectedIds(new Set());
            }
        } finally {
            setUpdating(false);
        }
    }

    // STATUS COLOURS
    function statusStyle(status: Status) {
        switch (status) {
            case "hired":
                return "bg-green-100 text-green-700";

            case "shortlisted":
                return "bg-purple-100 text-purple-700";

            case "rejected":
                return "bg-red-100 text-red-700";

            default:
                return "bg-amber-100 text-amber-700";
        }
    }

    return (
        <div className="max-w-[1100px] w-full">

            {/* HEADER */}
            <button
                onClick={onBack}
                className="text-white/70 hover:text-white text-sm mb-4"
            >
                ← Back to jobs
            </button>

            <h1 className="text-[clamp(16px,1.6vw,22px)] font-semibold text-white mb-6">
                Applicants: {title}
            </h1>

            {/* LOADING */}
            {loading && (
                <div className="bg-white rounded-xl p-10 text-center text-gray-500">
                    Loading applicants...
                </div>
            )}

            {/* ERROR */}
            {error && (
                <div className="bg-red-50 text-red-600 rounded-xl p-5">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="space-y-5">

                    {/* STATISTICS */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

                        <div className="bg-white rounded-xl p-4">
                            <p className="text-xs text-gray-500">
                                Total Applicants
                            </p>
                            <h2 className="text-2xl font-bold text-[#262261]">
                                {counts.total}
                            </h2>
                        </div>

                        <div className="bg-amber-50 rounded-xl p-4">
                            <p className="text-xs text-amber-700">
                                Pending
                            </p>
                            <h2 className="text-2xl font-bold text-amber-700">
                                {counts.pending}
                            </h2>
                        </div>

                        <div className="bg-purple-50 rounded-xl p-4">
                            <p className="text-xs text-purple-700">
                                Shortlisted
                            </p>
                            <h2 className="text-2xl font-bold text-purple-700">
                                {counts.shortlisted}
                            </h2>
                        </div>

                        <div className="bg-green-50 rounded-xl p-4">
                            <p className="text-xs text-green-700">
                                Hired
                            </p>
                            <h2 className="text-2xl font-bold text-green-700">
                                {counts.hired}
                            </h2>
                        </div>

                        <div className="bg-red-50 rounded-xl p-4">
                            <p className="text-xs text-red-700">
                                Rejected
                            </p>
                            <h2 className="text-2xl font-bold text-red-700">
                                {counts.rejected}
                            </h2>
                        </div>

                    </div>

                    {/* APPLICANT TABLE CONTAINER */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">

                        {/* FILTERS */}
                        <div className="p-4 border-b border-gray-100">

                            <div className="flex flex-wrap gap-2">

                                {([
                                    "all",
                                    "pending",
                                    "shortlisted",
                                    "hired",
                                    "rejected",
                                ] as const).map(s => {

                                    const count = s === "all"
                                        ? counts.total
                                        : counts[s];

                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setFilter(s)}
                                            className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition
                                                ${filter === s
                                                    ? "bg-[#262261] text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                        >
                                            {s} ({count})
                                        </button>
                                    );
                                })}

                            </div>
                        </div>

                        {/* SELECTION / BULK ACTIONS */}
                        {filteredApplicants.length > 0 && (
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={
                                            filteredApplicants.length > 0 &&
                                            filteredApplicants.every(a =>
                                                selectedIds.has(a.id)
                                            )
                                        }
                                        onChange={toggleSelectAll}
                                        className="accent-[#262261] w-4 h-4"
                                    />

                                    <span className="text-sm text-gray-600">
                                        {selectedIds.size} selected
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2">

                                    <button
                                        disabled={!selectedIds.size || updating}
                                        onClick={() => updateSelected("shortlisted")}
                                        className="px-3 py-2 rounded-lg bg-purple-100 text-purple-700 text-xs font-semibold hover:bg-purple-200 disabled:opacity-40"
                                    >
                                        Shortlist for interview
                                    </button>

                                    <button
                                        disabled={!selectedIds.size || updating}
                                        onClick={() => updateSelected("hired")}
                                        className="px-3 py-2 rounded-lg bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 disabled:opacity-40"
                                    >
                                        Hire
                                    </button>

                                    <button
                                        disabled={!selectedIds.size || updating}
                                        onClick={() => updateSelected("rejected")}
                                        className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 disabled:opacity-40"
                                    >
                                        Reject
                                    </button>

                                </div>
                            </div>
                        )}

                        {/* TABLE */}
                        <div className="overflow-x-auto">

                            <table className="min-w-[850px] w-full text-sm border-collapse">

                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-10"></th>
                                        <th className="px-4 py-3 text-left">Name</th>
                                        <th className="px-4 py-3 text-left">Age</th>
                                        <th className="px-4 py-3 text-left">Past Role</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Interviewed</th>
                                        <th className="px-4 py-3 text-left">Rejection Reason</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {filteredApplicants.map(a => (
                                        <tr
                                            key={a.id}
                                            className="hover:bg-purple-50/40 transition-colors"
                                        >

                                            {/* SELECT */}
                                            <td className="px-4 py-3 border-b border-gray-100">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(a.id)}
                                                    onChange={() => toggleSelect(a.id)}
                                                    className="accent-[#262261] w-4 h-4"
                                                />
                                            </td>

                                            {/* NAME */}
                                            <td className="px-4 py-3 border-b border-gray-100 font-semibold text-[#262261]">
                                                {a.full_name}
                                            </td>

                                            {/* AGE */}
                                            <td className="px-4 py-3 border-b border-gray-100">
                                                {a.age}
                                            </td>

                                            {/* PAST ROLE */}
                                            <td className="px-4 py-3 border-b border-gray-100">
                                                {a.past_role || "—"}
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-4 py-3 border-b border-gray-100">

                                                <select
                                                    value={a.application_status}
                                                    onChange={e =>
                                                        changeStatus(
                                                            a.id,
                                                            e.target.value as Status
                                                        )
                                                    }
                                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border-0 outline-none cursor-pointer capitalize ${statusStyle(a.application_status)}`}
                                                >
                                                    {STATUS_OPTIONS.map(s => (
                                                        <option key={s} value={s}>
                                                            {s}
                                                        </option>
                                                    ))}
                                                </select>

                                            </td>

                                            {/* INTERVIEWED */}
                                            <td className="px-4 py-3 border-b border-gray-100">

                                                <label className="flex items-center gap-2 cursor-pointer">

                                                    <input
                                                        type="checkbox"
                                                        checked={a.have_interviewed}
                                                        onChange={e =>
                                                            patch(a.id, {
                                                                haveInterviewed: e.target.checked,
                                                            })
                                                        }
                                                        className="accent-[#262261] w-4 h-4"
                                                    />

                                                    <span className="text-xs text-gray-500">
                                                        {a.have_interviewed
                                                            ? "Yes"
                                                            : "No"}
                                                    </span>

                                                </label>

                                            </td>

                                            {/* REJECTION REASON */}
                                            <td className="px-4 py-3 border-b border-gray-100 text-gray-500 max-w-[200px]">
                                                <span className="block truncate">
                                                    {a.reason_for_rejection || "—"}
                                                </span>
                                            </td>

                                        </tr>
                                    ))}

                                    {/* EMPTY FILTER */}
                                    {filteredApplicants.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="text-center py-12 text-gray-400"
                                            >
                                                No applicants found in this category.
                                            </td>
                                        </tr>
                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}
