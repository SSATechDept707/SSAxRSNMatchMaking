import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const inputClass = "w-full border rounded-lg px-3 py-2";
const labelClass = "block text-xs font-semibold text-gray-600 text-left";

export default function MemberRegister() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        uen: "",
        companyName: "",
        location: "",
        logoUrl: "",
        repName: "",
        repEmail: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);



    function update(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const { uen, companyName, location, repName, repEmail, password } = form;
        if (!uen || !companyName || !location || !repName || !repEmail || !password) {
            setError("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "registerCompany",
                    ...form,
                    logoUrl: form.logoUrl.trim() || null,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Registration failed");
                return;
            }
            navigate("/MemberLogin");
        } catch {
            setError("Network error, please try again");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-full flex flex-col">
            <header className="h-[60px] pl-4 shrink-0 bg-white flex items-center px-6 z-10">
                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[38px] w-auto object-contain"
                />
            </header>

            <main
                className="flex-1 flex items-center justify-center bg-[#262261] bg-cover bg-center bg-no-repeat px-5 py-10"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(38, 34, 97, 0.35), rgba(38, 34, 97, 0.45)),
            url('/images/Background.png')
          `,
                }}
            >
                <form
                    onSubmit={handleRegister}
                    className="bg-white/95 w-[clamp(300px,36vw,560px)] rounded-[38px] px-[clamp(1.5rem,3vw,2.5rem)] py-[clamp(2rem,3vw,3rem)] text-center shadow-xl"
                >
                    <h1 className="text-[#4B5563] text-[clamp(18px,1.8vw,26px)] font-bold leading-tight mb-6">
                        Register your company
                    </h1>

                    <div className="flex flex-col gap-2">
                        <p className="text-left text-sm font-bold text-[#262261] mt-1">Company details</p>

                        <label className={labelClass}>UEN</label>
                        <input type="text" value={form.uen} onChange={update("uen")} className={inputClass} />

                        <label className={labelClass}>Company name</label>
                        <input type="text" value={form.companyName} onChange={update("companyName")} className={inputClass} />

                        <label className={labelClass}>Location</label>
                        <input type="text" value={form.location} onChange={update("location")} className={inputClass} />

                        <p className="text-left text-sm font-bold text-[#262261] mt-3">Company representative</p>

                        <label className={labelClass}>Full name</label>
                        <input type="text" value={form.repName} onChange={update("repName")} className={inputClass} />

                        <label className={labelClass}>Email</label>
                        <input type="email" value={form.repEmail} onChange={update("repEmail")} className={inputClass} />

                        <label className={labelClass}>Password</label>
                        <input type="password" value={form.password} onChange={update("password")} className={inputClass} />

                        {error && <p className="text-red-600 text-sm">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 bg-[#262261] hover:bg-[#393481] disabled:opacity-60 text-white py-[clamp(0.6rem,1vw,0.85rem)] rounded-xl text-[clamp(14px,1.3vw,18px)] transition-all duration-200 hover:-translate-y-0.5"
                        >
                            {loading ? "Registering..." : "Register"}
                        </button>

                        <p className="text-sm">
                            Already have an account? Login{" "}
                            <Link to="/MemberLogin" className="underline">here</Link>
                        </p>
                    </div>
                </form>
            </main>
        </div>
    );
}