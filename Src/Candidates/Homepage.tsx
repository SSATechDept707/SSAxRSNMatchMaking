import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import PostJobModal from "./PostJobModal";

type Tab = "jobs" | "applicants";

type Posting = {
    id: number;
    title: string;
    pay_range: string;
    avail_opening: number;
    closing_date: string;
    posting_status: string;
};

// dd/mm/yyyy in Singapore time
const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Singapore" });

export default function Homepage() {
    const { setRole, logout } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [tab, setTab] = useState<Tab>("jobs");
    const [postings, setPostings] = useState<Posting[]>([]);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

    const loadPostings = useCallback(async () => {
        try {
            const res = await fetch("/api/jobs?mine=true");
            // session expired: clearing the role makes the route guard send them to login
            if (res.status === 401) {
                setRole(null);
                return;
            }
            if (!res.ok) throw new Error("request failed");
            setPostings(await res.json());
            setLoadState("ready");
        } catch {
            setLoadState("error");
        }
    }, [setRole]);

    useEffect(() => {
        loadPostings();
    }, [loadPostings]);

    const tabClass = (t: Tab) =>
        `text-[clamp(16px,1.6vw,22px)] font-semibold transition-opacity ${
            tab === t ? "text-white" : "text-white/60 hover:text-white/90"
        }`;

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#262261] text-white">
            {/* Header: logo left, greeting right */}
            <header className="flex items-start bg-white justify-between px-[clamp(1.5rem,5vw,4.5rem)] py-3">
                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[48px] w-auto object-contain"
                />
                <div className="flex flex-col items-center gap-1 text-gray-700">
                    <div className="h-[60px] w-[60px] rounded-full bg-gray-200" />
                    <span className="text-xs font-semibold">Hello, user</span>
                    <button type="button" onClick={logout} className="text-[11px] underline text-gray-500">
                        Log out
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <nav className="flex items-center gap-3 px-[clamp(1.5rem,5vw,4.5rem)] mt-6">
                <button onClick={() => setTab("jobs")} className={tabClass("jobs")}>
                    Jobs Posted
                </button>
                <span className="text-white/60">|</span>
                <button onClick={() => setTab("applicants")} className={tabClass("applicants")}>
                    View applicants
                </button>
            </nav>

            {/* Add posting button (jobs tab only) */}
            {tab === "jobs" && (
                <div className="px-[clamp(1.5rem,5vw,4.5rem)] mt-4">
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-[#5048c9] hover:bg-[#6058d9] text-white text-lg rounded-2xl px-6 py-3 transition-colors"
                    >
                        + Add posting
                    </button>
                </div>
            )}

            {/* Content area */}
            <main className="flex-1 px-[clamp(1.5rem,5vw,4.5rem)] py-6">
                {tab === "applicants" && (
                    <p className="text-white/50 text-xl text-center mt-24">Applicants will appear here</p>
                )}

                {tab === "jobs" && loadState === "loading" && <p className="text-white/60">Loading...</p>}
                {tab === "jobs" && loadState === "error" && (
                    <p className="text-white/60">Couldn't load your postings. Please refresh the page.</p>
                )}
                {tab === "jobs" && loadState === "ready" && postings.length === 0 && (
                    <p className="text-white/50 text-xl text-center mt-24">Upload new jobs here!</p>
                )}
                {tab === "jobs" && loadState === "ready" && postings.length > 0 && (
                    <ul className="flex flex-col gap-4 max-w-[900px]">
                        {postings.map((p) => (
                            <li
                                key={p.id}
                                className="bg-white/10 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                            >
                                <div>
                                    <h2 className="text-lg font-semibold">{p.title}</h2>
                                    <p className="text-sm text-white/70">
                                        {p.pay_range} · {p.avail_opening} opening{p.avail_opening === 1 ? "" : "s"} ·
                                        Closes {formatDate(p.closing_date)}
                                    </p>
                                </div>
                                <span
                                    className={`text-xs font-semibold rounded-full px-3 py-1 ${
                                        p.posting_status === "Open"
                                            ? "bg-green-500/20 text-green-300"
                                            : "bg-white/15 text-white/70"
                                    }`}
                                >
                                    {p.posting_status}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            {/* The popup form, only rendered while showForm is true */}
            {showForm && <PostJobModal onClose={() => setShowForm(false)} onPosted={loadPostings} />}
        </div>
    );
}