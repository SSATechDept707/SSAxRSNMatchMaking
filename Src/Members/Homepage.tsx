import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import PostJobModal from "./PostJobModal";
import ViewApplicantsModal from "./ViewApplicantsModal";

type Posting = {
    id: number;
    title: string;
    description: string;
    pay_range: string;
    avail_opening: number;
    closing_date: string;
    posting_status: string;
    tech_skills?: string[];
    soft_skills?: string[];
    created_at: string;
};

// dd/mm/yyyy in Singapore time
const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Singapore" });

export default function Homepage() {
    const { setRole, logout } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [postings, setPostings] = useState<Posting[]>([]);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [viewingPosting, setViewingPosting] = useState<Posting | null>(null);

    const loadPostings = useCallback(async () => {
        try {
            const res = await fetch(`/api/jobPostings?mine=true`);

            // session expired: clearing the role makes the route guard send them to login
            if (res.status === 401) {
                // setRole(null);
                setLoadState("error"); // don't leave the page stuck on "Loading..."
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

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#262261] text-white">
            {/* Header: logo left, greeting right */}
            <header className="flex items-start bg-white justify-between px-[clamp(1.5rem,5vw,4.5rem)] py-3">
                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[48px] w-auto object-contain"
                />
       
       <div className="h-[60px] w-[60px] rounded-full bg-gray-200" />
                    <span className="text-xs font-semibold">Hello, user</span>
                    <button type="button" onClick={logout} className="text-[11px] underline text-gray-500">
                        Log out
                    </button>
            </header>

            {/* Title */}
            <nav className="flex items-center gap-3 px-[clamp(1.5rem,5vw,4.5rem)] mt-6">
                <h1 className="text-[clamp(16px,1.6vw,22px)] font-semibold text-white">Jobs Posted</h1>
            </nav>

            {/* Add posting button */}
            <div className="px-[clamp(1.5rem,5vw,4.5rem)] mt-4">
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-[#5048c9] hover:bg-[#6058d9] text-white text-lg rounded-2xl px-6 py-3 transition-colors"
                >
                    + Add posting
                </button>
            </div>

            {/* Content area */}
            <main className="flex-1 px-[clamp(1.5rem,5vw,4.5rem)] py-6">
                {loadState === "loading" && <p className="text-white/60">Loading...</p>}
                {loadState === "error" && (
                    <p className="text-white/60">Couldn't load your postings. Please refresh the page.</p>
                )}
                {loadState === "ready" && postings.length === 0 && (
                    <p className="text-white/50 text-xl text-center mt-24">Upload new jobs here!</p>
                )}
                {loadState === "ready" && postings.length > 0 && (
                    <ul className="flex flex-col gap-4 max-w-[1100px]">
                        {postings.map((p) => (
                            <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
                                {/* the card */}
                                <div className="flex-1 min-w-0 bg-white/20 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-5 flex flex-col gap-4">
                                    {/* TOP ROW: TITLE + PAY RANGE */}
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="text-lg font-semibold text-white">{p.title}</h2>
                                            <p className="text-xs text-white/70 mt-1">
                                                {p.avail_opening} opening{p.avail_opening === 1 ? "" : "s"}
                                                <span className="mx-2">•</span>
                                                Closes {formatDate(p.closing_date)}
                                            </p>
                                        </div>
                                        <p className="text-sm font-semibold text-white shrink-0">{p.pay_range}</p>
                                    </div>

                                    {/* DESCRIPTION */}
                                    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
                                        {p.description}
                                    </p>

                                    {/* SKILLS */}
                                    <div className="flex flex-wrap gap-2">
                                        {[...(p.tech_skills || []), ...(p.soft_skills || [])].map((skill, index) => (
                                            <span
                                                key={`${skill}-${index}`}
                                                className="text-xs text-white/90 bg-white/15 border border-white/10 rounded-full px-3 py-1"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                    {/* BOTTOM RIGHT: DATE POSTED */}
                                    <div className="flex justify-end mt-1">
                                        <p className="text-[11px] text-white/50">Posted {formatDate(p.created_at)}</p>
                                    </div>
                                </div>

                                {/* the button, outside the card */}
                                <button
                                    type="button"
                                    onClick={() => setViewingPosting(p)}
                                    className="shrink-0 bg-[#5048c9] hover:bg-[#6058d9] text-white text-sm rounded-xl px-4 py-2 transition-colors"
                                >
                                    View applicants
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            {/* Popups */}
            {showForm && <PostJobModal onClose={() => setShowForm(false)} onPosted={loadPostings} />}
            {viewingPosting && (
                <ViewApplicantsModal
                    postingId={viewingPosting.id}
                    title={viewingPosting.title}
                    onClose={() => setViewingPosting(null)}
                />
            )}
        </div>
    );
}