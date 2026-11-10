import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";

const VERIFIED = "verified"; // the value your admin sets when approving a candidate

type Job = {
    id: number;
    title: string;
    description: string;
    pay_range: string;
    soft_skills: string[] | null;
    tech_skills: string[] | null;
    avail_opening: number;
    closing_date: string;
    created_at: string;
    company_name: string;
    logo_url: string | null;
};

type Profile = {
    full_name: string;
    verification_status: string | null;
};

// dd/mm/yyyy in Singapore time
const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Singapore" });

export default function CandidateHome() {
    const { setRole, logout } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [search, setSearch] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [jobsRes, meRes] = await Promise.all([
                    fetch("/api/jobPostings"),
                    fetch("/api/candidates"),
                ]);

                // session expired: clearing the role makes the route guard send them to login
                if (meRes.status === 401) {
                    setRole(null);
                    return;
                }
                if (!jobsRes.ok) throw new Error("jobs request failed");

                const jobsData: Job[] = await jobsRes.json();
                const meData: Profile | null = meRes.ok ? await meRes.json() : null;

                if (!cancelled) {
                    setJobs(jobsData);
                    setProfile(meData);
                    setLoadState("ready");
                }
            } catch {
                if (!cancelled) setLoadState("error");
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [setRole]);

    const isVerified = profile?.verification_status === VERIFIED;
    const firstName = profile?.full_name?.split(" ")[0] ?? "there";

    const q = search.trim().toLowerCase();
    const shown = jobs.filter(
        (j) =>
            !q ||
            [j.title, j.company_name, ...(j.tech_skills ?? []), ...(j.soft_skills ?? [])].some((s) =>
                s.toLowerCase().includes(q)
            )
    );

    function handleSubmitCv(job: Job) {
        // TODO: open the CV upload, then POST to the applications API
        console.log("submit CV for job", job.id);
    }

    return (
        <div className="min-h-screen w-full bg-[#262261] text-white pb-12">
            {/* header: logo left, profile button + greeting right */}
            <header className="h-[60px] pl-4 shrink-0 bg-white flex items-center px-6 z-10">
                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[48px] w-auto object-contain"
                />
                <div className="flex items-start gap-4">
                    <div className="flex flex-col text-black items-center gap-1">
                        <span className="text-xs font-semibold">hello, {firstName}!</span>
                        <button type="button" onClick={logout} className="text-[11px] underline text-white/70">
                            Log out
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-[clamp(1.5rem,5vw,4.5rem)] mt-4">
                <h1 className="text-[clamp(22px,2.4vw,32px)] font-medium">Available Positions</h1>

                {/* search + filter */}
                <div className="flex items-center gap-4 mt-4 max-w-[760px]">
                    <div className="relative flex-1">
                        <svg
                            className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path d="M21 21l-4.3-4.3" />
                        </svg>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search"
                            className="w-full rounded-full bg-gray-200 text-gray-700 pl-10 pr-4 py-2 outline-none"
                        />
                    </div>
                    <button type="button" aria-label="Filter" className="text-white">
                        {/* TODO: decide what to filter by */}
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
                        </svg>
                    </button>
                </div>

                {/* verification notice */}
                {loadState === "ready" && !isVerified && (
                    <div className="mt-6 max-w-[760px] rounded-xl bg-amber-100 text-amber-900 px-4 py-3 text-sm">
                        Your account is waiting for verification by an admin. You can browse positions, but you
                        can't submit a CV yet.
                    </div>
                )}

                {/* job list */}
                <div className="mt-6">
                    {loadState === "loading" && <p className="text-white/60">Loading positions...</p>}
                    {loadState === "error" && (
                        <p className="text-white/60">Couldn't load positions. Please refresh the page.</p>
                    )}
                    {loadState === "ready" && shown.length === 0 && (
                        <p className="text-white/60">
                            {jobs.length === 0 ? "No open positions right now." : "No positions match your search."}
                        </p>
                    )}

                    <ul className="flex flex-col gap-6">
                        {shown.map((job) => {
                            const skills = [...(job.tech_skills ?? []), ...(job.soft_skills ?? [])];
                            return (
                                <li key={job.id} className="flex flex-col md:flex-row md:items-center gap-4">
                                    <article className="flex-1 bg-white text-gray-700 rounded-[2rem] px-6 py-5 flex gap-5">
                                        {job.logo_url ? (
                                            <img
                                                src={job.logo_url}
                                                alt={job.company_name}
                                                className="h-[88px] w-[88px] rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="h-[88px] w-[88px] rounded-full bg-gray-200 shrink-0" />
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                                                <div className="flex flex-wrap items-baseline gap-x-4">
                                                    <h2 className="text-lg font-bold">{job.title}</h2>
                                                    <span className="text-sm">
                                                        Closing Date: {formatDate(job.closing_date)}
                                                    </span>
                                                </div>
                                                <span className="font-bold">{job.pay_range}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{job.company_name}</p>

                                            <p className="mt-2 text-sm whitespace-pre-line line-clamp-3">
                                                {job.description}
                                            </p>

                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {skills.map((s) => (
                                                        <span
                                                            key={s}
                                                            className="bg-[#c5d5cc] text-gray-700 rounded-full px-4 py-1 text-sm"
                                                        >
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="text-[11px] font-semibold text-green-600">
                                                    ● Posted {formatDate(job.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </article>

                                    <button
                                        type="button"
                                        disabled={!isVerified}
                                        onClick={() => handleSubmitCv(job)}
                                        title={isVerified ? undefined : "Your account must be verified first"}
                                        className={`md:w-[170px] rounded-2xl py-4 text-lg transition-colors ${
                                            isVerified
                                                ? "bg-[#0e7490] hover:bg-[#0891b2] text-white"
                                                : "bg-[#0f4f5f] text-white/40 cursor-not-allowed"
                                        }`}
                                    >
                                        Submit CV
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </main>
        </div>
    );
}