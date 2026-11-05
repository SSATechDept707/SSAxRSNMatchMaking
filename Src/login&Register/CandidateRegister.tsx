import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";


export default function CandidateRegister() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [code, setCode] = useState("");


    async function handleSendCode() {
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/send-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                setError("Could not send code");
                return;
            }
            setStep(2);
        } catch {
            setError("Network error, please try again");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyAndRegister() {
        setError("");
        setLoading(true);
        try {
            const verifyRes = await fetch("/api/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            if (!verifyRes.ok) {
                setError("Invalid or expired code");
                return;
            }

            const res = await fetch("/api/candidates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Registration failed");
                return;
            }
            navigate("/CandidateLogin");
        } catch {
            setError("Network error, please try again");
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="min-h-screen w-full flex flex-col">

            {/* White top navigation bar */}
            <header className="h-[60px] pl-4 shrink-0 bg-white flex items-center px-6 z-10">
                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[38px] w-auto object-contain"
                />
            </header>

            {/* Purple background with image overlay */}
            <main
                className="flex-1 min-h-[calc(100vh-60px)] flex items-center justify-center bg-[#262261] bg-cover bg-center bg-no-repeat px-5"
                style={{
                    backgroundImage: `
            linear-gradient(
              rgba(38, 34, 97, 0.35),
              rgba(38, 34, 97, 0.45)
            ),
            url('/images/Background.png')
          `
                }}
            >

                {/* Registration card */}
                <div className="bg-white/95 w-[clamp(280px,32vw,520px)] translate-y-12 rounded-[38px] px-[clamp(1.5rem,3vw,2.5rem)] py-[clamp(2rem,4vw,3.5rem)] text-center shadow-xl">

                    <h1 className="text-[#4B5563] text-[clamp(18px,1.8vw,26px)] font-bold leading-tight mb-[clamp(1.5rem,3vw,3rem)]">
                        Register as a Candidate
                    </h1>
                    {step === 1 && (
                        <>
                            {/* Login buttons */}
                            <div className="flex flex-col gap-2">
                                <label className="block text-xs font-semibold text-gray-600">
                                    Full Name
                                </label>

                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                                <label className="block text-xs font-semibold text-gray-600">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                />


                                <label className="block text-xs font-semibold text-gray-600">
                                    Password
                                </label>

                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                />

                                {error && <p className="text-red-600 text-sm">{error}</p>}
                                <button onClick={handleSendCode} disabled={loading} className="...">
                                    {loading ? "Sending code..." : "Send verification code"}
                                </button>
                                </div>
                            </>
)}

                            {step === 2 && (
                                <>
                                    <p className="text-sm text-gray-600">Enter the 6-digit code sent to {email}</p>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                        className="w-full border rounded-lg px-3 py-2 text-center tracking-widest"
                                    />
                                    {error && <p className="text-red-600 text-sm">{error}</p>}
                                    <button onClick={handleVerifyAndRegister} disabled={loading || code.length !== 6} className="...">
                                        {loading ? "Verifying..." : "Verify & Register"}
                                    </button>
                                </>
                            )}

                            <p>Already have an account? Login <Link to="/CandidateLogin" className="underline">here</Link></p>

                       

                </div>
            </main>

        </div>
    );
}