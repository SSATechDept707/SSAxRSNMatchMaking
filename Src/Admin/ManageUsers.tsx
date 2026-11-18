import { useEffect, useState } from "react";
import { Users, Building2, Plus, Search } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import CreateUserModal from "./CreateUserModal";



export default function ManageUsers() {
    const { adminRole, logout } = useAuth();
    const [candidates, setCandidates] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"candidates" | "members">("candidates");


    async function getUsers() {
        try {
            setLoading(true);
            setError("");

            const [candidateRes, memberRes] = await Promise.all([
                fetch("/api/candidates"),
                fetch("/api/members"),
            ]);


            if (!candidateRes.ok || !memberRes.ok) {
                throw new Error("Failed to load users");
            }

            const candidateData = await candidateRes.json();
            const memberCompanyData = await memberRes.json();


            setCandidates(candidateData);
            setMembers(memberCompanyData);

        } catch (e) {
            console.error(e);
            setError("Unable to load users.");
        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        getUsers();
    })

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#F7F7FB]">

            {/* NAVIGATION */}
            <header className="relative flex items-center bg-white justify-between px-[clamp(1.5rem,5vw,4.5rem)] h-[72px]">

                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[48px] w-auto object-contain"
                />

                <div className="absolute right-[clamp(1.5rem,5vw,4.5rem)] top-3 flex flex-col items-center text-gray-700 z-10">
                    <span className="text-xs font-semibold">Hello, user</span>

                    <button
                        type="button"
                        onClick={logout}
                        className="text-[11px] underline text-gray-500"
                    >
                        Log out
                    </button>
                </div>

            </header>

            {/* PAGE CONTENT */}
            <main className="flex-1 px-[clamp(1.5rem,5vw,4.5rem)] py-10">

                {/* PAGE TITLE */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-8">

                    <div>
                        <h1 className="text-2xl font-bold text-[#262261]">
                            User Management
                        </h1>

                        <p className="text-sm text-gray-500 mt-1">
                            Manage registered candidates and member companies.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-[#262261] hover:bg-[#39347F] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
                    >
                        <Plus size={17} />
                        Create User
                    </button>

                </div>

                {/* USER STATISTICS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">

                        <div>
                            <p className="text-sm text-gray-500">
                                Candidates
                            </p>

                            <h2 className="text-3xl font-bold text-[#262261] mt-2">
                                {candidates.length}
                            </h2>
                        </div>

                        <Users size={32} className="text-[#8274C7]" />

                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">

                        <div>
                            <p className="text-sm text-gray-500">
                                Member Companies
                            </p>

                            <h2 className="text-3xl font-bold text-[#262261] mt-2">
                                {members.length}
                            </h2>
                        </div>

                        <Building2 size={32} className="text-[#8274C7]" />

                    </div>

                </div>

                {/* USER LIST */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* TABS AND SEARCH */}
                    <div className="p-5 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">

                        <div className="flex gap-2">

                            <button
                                onClick={() => setActiveTab("candidates")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                    activeTab === "candidates"
                                        ? "bg-[#262261] text-white"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                Candidates
                            </button>

                            <button
                                onClick={() => setActiveTab("members")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                    activeTab === "members"
                                        ? "bg-[#262261] text-white"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                Members
                            </button>

                        </div>

                        <div className="relative w-full sm:w-72">

                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search users..."
                                className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:border-[#8274C7]"
                            />

                        </div>

                    </div>

                    {/* TABLE PLACEHOLDER */}
                    <div className="p-6 text-center text-gray-400 text-sm">
                        {loading
                            ? "Loading users..."
                            : error
                                ? error
                                : "User records will appear here."
                        }
                    </div>

                </div>

            </main>

            {/* CREATE USER MODAL */}
            {showCreateModal && (
                <CreateUserModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => setShowCreateModal(false)}
                />
            )}

        </div>
    );
}