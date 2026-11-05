import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";


export default function CandidateRegister() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

   async function handleRegister() {
        setError("");
        setLoading(true);
        try {
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

                    {/* Login buttons */}
                    <div className="flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-gray-600">
                            Email
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
                        <button
                          onClick={handleRegister}
                          disabled={loading}
                            className="w-full bg-[#262261] hover:bg-[#393481] text-white py-[clamp(0.6rem,1vw,0.85rem)] rounded-xl text-[clamp(14px,1.3vw,18px)] transition-all duration-200 hover:-translate-y-0.5"
                        >
                           {loading ? "Registering..." : "Register"}
                        </button>

                        <p>Already have an account? Login <Link to="/CandidateLogin" className="underline">here</Link></p>

                    </div>

                </div>
            </main>

        </div>
    );
}