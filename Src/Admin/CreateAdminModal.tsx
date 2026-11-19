import { useEffect, useState } from "react";
import { X, PartyPopper } from "lucide-react";

type Props = {
    onClose: () => void;
    onSuccess: () => void;
}
export default function CreateAdminModal({ onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [companyDropdown, setCompanyDropdown] = useState<{ id: number; company_name }[]>([]);

    const [form, setForm] = useState({
        email: "",
        password: "",
        email: "",
        // company_id?: "",
        username: "",
        pastJobRole: "",
    });


    useEffect(() => {
        fetch("/api/admin?companies=true")
            .then((r) => (r.ok ? r.json() : []))
            .then(setCompanyDropdown)
            .catch(() => setCompanyDropdown([]));
    }, [])

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value,
        }));
    }



    async function createAdmin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/admin?action=createAdmin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ action: "createAdmin", ...form }),
            })

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to create Admin");
            }

            setSuccess("User created successfully!");
            setTimeout(onSuccess, 1500);

        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Something went wrong"
            );

        } finally {
            setLoading(false);

        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">

                {/* HEADER */}
                <div className="flex justify-between items-center p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-[#262261]">Create Admin</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Grant dashboard access to a new admin.
                        </p>
                    </div>
                    <button type="button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {success ? (
                    <div className="p-10 flex flex-col items-center text-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <PartyPopper size={36} className="text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-[#262261]">Admin created</h3>
                        <p className="text-sm text-gray-500">
                            {form.username} can now log in.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={createAdmin} className="p-6 space-y-4">

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Username
                            </label>
                            <input
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                required
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                               Company (only applicable if user's company is a member)
                            </label>
                            <select
                                name="companyId"
                                value={form.companyId}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                            >
                                <option value="" disabled>Not Applicable</option>
                                {companyDropdown.map((c) => (
                                    <option key={c.id} value={c.id}>{c.company_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Password
                            </label>
                            <input
                                name="password"
                                type="password"
                                minLength={8}
                                value={form.password}
                                onChange={handleChange}
                                required
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                {error}
                            </p>
                        )}

                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-lg border text-gray-600 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2.5 rounded-lg bg-[#262261] hover:bg-[#39347F] text-white text-sm font-medium disabled:opacity-50"
                            >
                                {loading ? "Creating..." : "Create Admin"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
