import { useState } from "react";
import PostJobModal from "./PostJobModal";

type Tab = "jobs" | "applicants";

export default function Homepage() {
    const [showForm, setShowForm] = useState(false);
    const [tab, setTab] = useState<Tab>("jobs");
    const [name, SetName] = useState("")

    const tabClass = (t: Tab) =>
        `text-[clamp(16px,1.6vw,22px)] font-semibold transition-opacity ${
            tab === t ? "text-white" : "text-white/60 hover:text-white/90"
        }`;

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#262261] text-white">
            {/* Header: logo left, greeting right */}
            <header className="flex items-start bg-white justify-between px-[clamp(1.5rem,5vw,4.5rem)] pt-4">
                {/* use your white version of the logo here if you have one */}
                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[48px] w-auto object-contain"
                />
                <div className="flex flex-col items-center gap-1">
                    <div className="h-[60px] w-[60px] rounded-full bg-white" />
                    <span className="text-xs font-semibold">Hello, user</span>
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
            <main className="flex-1 flex items-center justify-center px-5">
                {tab === "jobs" ? (
                    <p className="text-white/50 text-xl">Upload new jobs here!</p>
                ) : (
                    <p className="text-white/50 text-xl">Applicants will appear here</p>
                )}
            </main>

            {/* The popup form, only rendered while showForm is true */}
            {showForm && <PostJobModal onClose={() => setShowForm(false)} />}
        </div>
    );
}