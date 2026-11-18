import { useEffect, useState } from "react";
import { X, UserRound, Building2, PartyPopper } from "lucide-react";

type UserType = "member" | "candidate";


type UserProps = {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ onClose, onSuccess}: UserProps) {
    const [userType, setUserType] = useState<UserType>("Candidate");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        name: "",
        prefName: "",
        email: "",
        password: "",
        age: "",
        pastJobRole: "",

        uen: "",
        companyName: "",
        location: "",
        repName: "",
        repEmail: "",
        logoUrl: "",
    });

    async function createUser(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");


        try {
            let res;

            if (userType === "candidate") {
                res = await fetch("/api/candidates", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: form.name,
                        prefName: form.prefName,
                        email: form.email,
                        password: form.password,
                        age: form.age || null,
                        pastJobRole: form.pastJobRole || null,
                    }),
                });
            } else if (userType === "member") {
                fetch("/api/members", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "registerCompany",
                        uen: form.uen,
                        companyName: form.companyName,
                        location: form.location,
                        logoUrl: form.logoUrl,
                        repName: form.repName,
                        repEmail: form.repEmail,
                        password: form.password,
                    }),
                });
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create user");
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

function handleChange(e: React.ChangeEvent<HTMLDivElement>) {
    const {name, value} = e.target;

    setForm(prev => ({
        ...prev,
        [name]: value,
    }));
}

return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

        <div className="bg-white rounded-2xl shadow-xl w-full max-w-[550px] max-h-[90vh] overflow-y-auto">

            {/* HEADER */}
            <div className="flex justify-between items-center p-6 border-b">

                <div>
                    <h2 className="text-xl font-bold text-[#262261]">
                        Create New User
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        Create a candidate or member account.
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
        <h3 className="text-lg font-bold text-[#262261]">User created Successfully</h3>
        <p className="text-sm text-gray-500">{success}</p>
    </div>
) : (
            <form onSubmit={createUser} className="p-6 space-y-5">

                {/* ACCOUNT TYPE */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Account Type
                    </label>

                    <div className="grid grid-cols-2 gap-3">

                        <button
                            type="button"
                            onClick={() => setUserType("candidate")}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${
                                userType === "candidate"
                                    ? "border-[#262261] bg-purple-50 text-[#262261]"
                                    : "border-gray-200 text-gray-500"
                            }`}
                        >
                            <UserRound size={23} />
                            <span className="text-sm font-semibold">
                                Candidate
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setUserType("member")}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${
                                userType === "member"
                                    ? "border-[#262261] bg-purple-50 text-[#262261]"
                                    : "border-gray-200 text-gray-500"
                            }`}
                        >
                            <Building2 size={23} />
                            <span className="text-sm font-semibold">
                                Member
                            </span>
                        </button>

                    </div>
                </div>

                {/* CANDIDATE FIELDS */}
                {userType === "candidate" && (
                    <div className="space-y-4">

                        <h3 className="font-semibold text-gray-700">
                            Candidate Information
                        </h3>

                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Full Name"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="prefName"
                            value={form.prefName}
                            onChange={handleChange}
                            placeholder="Preferred Name"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Email Address"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="age"
                            type="number"
                            min="16"
                            max="100"
                            value={form.age}
                            onChange={handleChange}
                            placeholder="Age "
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="pastJobRole"
                            value={form.pastJobRole}
                            onChange={handleChange}
                            placeholder="Past Job Role"
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="password"
                            type="password"
                            minLength={8}
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Temporary Password"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                    </div>
                )}

                {/* MEMBER FIELDS */}
                {userType === "member" && (
                    <div className="space-y-4">

                        <h3 className="font-semibold text-gray-700">
                            Company Information
                        </h3>

                        <input
                            name="uen"
                            value={form.uen}
                            onChange={handleChange}
                            placeholder="Company UEN"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="companyName"
                            value={form.companyName}
                            onChange={handleChange}
                            placeholder="Company Name"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            placeholder="Company Location"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <h3 className="font-semibold text-gray-700 pt-2">
                            Representative Account
                        </h3>

                        <input
                            name="repName"
                            value={form.repName}
                            onChange={handleChange}
                            placeholder="Representative Name"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="repEmail"
                            type="email"
                            value={form.repEmail}
                            onChange={handleChange}
                            placeholder="Representative Email"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="logoUrl"
                            value={form.logoUrl}
                            onChange={handleChange}
                            placeholder="Company Logo URL (Optional)"
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                        <input
                            name="password"
                            type="password"
                            minLength={8}
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Temporary Password"
                            required
                            className="w-full border rounded-lg p-3 text-sm"
                        />

                    </div>
                )}

                {/* ERROR */}
                {error && (
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                        {error}
                    </p>
                )}

                {/* ACTION BUTTONS */}
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
                        className="px-5 py-2.5 rounded-lg bg-[#262261] text-white text-sm font-medium disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create User"}
                    </button>

                </div>

            </form>
)}
        </div>

    </div>
);


}

