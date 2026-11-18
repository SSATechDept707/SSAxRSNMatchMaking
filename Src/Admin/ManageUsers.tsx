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

    const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString() : "-");
    async function getUsers() {
        try {
            setLoading(true);
            setError("");

            const [candidateRes, memberRes] = await Promise.all([
                fetch("/api/candidates"),
                fetch("/api/members?companies=true"),
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
      }, []);

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#F7F7FB]">

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

                    <div className="overflow-x-auto">

{loading ? (
    <div className="p-8 text-center text-gray-400 text-sm">
        Loading users...
    </div>
) : error ? (
    <div className="p-8 text-center text-red-500 text-sm">
        {error}
    </div>
) : (
    <table className="w-full text-sm text-left">

<thead className="bg-gray-50 text-gray-500 uppercase text-xs whitespace-nowrap">
    {activeTab === "candidates" ? (
        <tr>
            <th className="px-6 py-4">ID</th>
            <th className="px-6 py-4">Full Name</th>
            <th className="px-6 py-4">Preferred Name</th>
            <th className="px-6 py-4">Email</th>
            <th className="px-6 py-4">Age</th>
            <th className="px-6 py-4">Past Role</th>
            <th className="px-6 py-4">Verification</th>
            <th className="px-6 py-4">Created</th>
            <th className="px-6 py-4">Actions</th>
        </tr>
    ) : (
        <tr>
            <th className="px-6 py-4">ID</th>
            <th className="px-6 py-4">Logo</th>
            <th className="px-6 py-4">Company</th>
            <th className="px-6 py-4">UEN</th>
            <th className="px-6 py-4">Location</th>
            <th className="px-6 py-4">Rep Name</th>
            <th className="px-6 py-4">Rep Email</th>
            <th className="px-6 py-4">Company Email</th>
            <th className="px-6 py-4">CV Recipient</th>
            <th className="px-6 py-4">Created</th>
            <th className="px-6 py-4">Actions</th>
        </tr>
    )}
</thead>

<tbody className="divide-y divide-gray-100 whitespace-nowrap">
    {activeTab === "candidates" ? (
        candidates.map((c) => (
            <tr key={c.id}>
                <td className="px-6 py-4 text-gray-600">{c.id}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{c.full_name}</td>
                <td className="px-6 py-4 text-gray-600">{c.preferred_name}</td>
                <td className="px-6 py-4 text-gray-600">{c.email}</td>
                <td className="px-6 py-4 text-gray-600">{c.age}</td>
                <td className="px-6 py-4 text-gray-600">{c.past_role}</td>
                <td className="px-6 py-4 text-gray-600">{c.verification_status}</td>
                <td className="px-6 py-4 text-gray-600">{formatDate(c.created_at)}</td>
                <td className="px-6 py-4">{/* actions later */}</td>
            </tr>
        ))
    ) : (
        members.map((m) => (
            <tr key={m.id}>
                <td className="px-6 py-4 text-gray-600">{m.id}</td>
                <td className="px-6 py-4">
                    {m.logo_url ? (
                        <img src={m.logo_url} alt="" className="h-8 w-8 object-contain" />
                    ) : "-"}
                </td>
                <td className="px-6 py-4 font-medium text-gray-800">{m.company_name}</td>
                <td className="px-6 py-4 text-gray-600">{m.uen}</td>
                <td className="px-6 py-4 text-gray-600">{m.location}</td>
                <td className="px-6 py-4 text-gray-600">{m.company_rep_name}</td>
                <td className="px-6 py-4 text-gray-600">{m.company_rep_email}</td>
                <td className="px-6 py-4 text-gray-600">{m.company_email ?? "-"}</td>
                <td className="px-6 py-4 text-gray-600">{m.cv_recipient}</td>
                <td className="px-6 py-4 text-gray-600">{formatDate(m.created_at)}</td>
                <td className="px-6 py-4">{/* actions later */}</td>
            </tr>
        ))
    )}
</tbody>

    </table>
)}

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