
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
    const navigate = useNavigate();

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

                {/* Login card */}
                <div className="bg-white/95 w-[clamp(280px,32vw,520px)] translate-y-12 rounded-[38px] px-[clamp(1.5rem,3vw,2.5rem)] py-[clamp(2rem,4vw,3.5rem)] text-center shadow-xl">

                    <h1 className="text-[#4B5563] text-[clamp(18px,1.8vw,26px)] font-bold leading-tight mb-[clamp(1.5rem,3vw,3rem)]">
                        Welcome to
                        <br />
                        SSA x RSN
                        <br />
                        Match Making System
                    </h1>

                    {/* Login buttons */}
                    <div className="flex flex-col gap-2">

                        <button
                            onClick={() => navigate("./CandidateLogin")}
                            className="w-full bg-[#262261] hover:bg-[#393481] text-white py-[clamp(0.6rem,1vw,0.85rem)] rounded-xl text-[clamp(14px,1.3vw,18px)] transition-all duration-200 hover:-translate-y-0.5"
                        >
                            RSN Candidates
                        </button>

                        <button
                            onClick={() => navigate("./MemberLogin-login")}
                            className="w-full bg-[#262261] hover:bg-[#393481] text-white py-[clamp(0.6rem,1vw,0.85rem)] rounded-xl text-[clamp(14px,1.3vw,18px)] transition-all duration-200 hover:-translate-y-0.5"
                        >
                            SSA Staff & Member Companies
                        </button>

                    </div>

                </div>
            </main>

        </div>
    );
}
