
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col">

      {/* White top navigation bar */}
      <header className="h-[60px] pl-4 shrink-0 bg-white flex items-center px-6 z-10">
        <img
          src="https://raw.githubusercontent.com/SSATechDept707/SSAxRSNMatchMaking/refs/heads/main/Src/src-images/SSA-logo.png"
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
            url('https://raw.githubusercontent.com/SSATechDept707/SSAxRSNMatchMaking/refs/heads/main/Src/src-images/Background.png')
          `
        }}
      >

        {/* Login card */}
        <div className="bg-white/80 w-full max-w-[460px] translate-y-20 rounded-[38px] px-10 py-14 text-center shadow-xl">

          <h1 className="text-[#4B5563] text-[23px] font-bold leading-tight mb-12">
            Welcome to
            <br />
            SSA x RSN
            <br />
            Match Making System
          </h1>

          {/* Login buttons */}
          <div className="flex flex-col gap-2">

            <button
              onClick={() => navigate("/CandidateLogin")}
              className="w-full bg-[#262261] hover:bg-[#393481] text-white py-3 rounded-xl text-[17px] transition-all duration-200 hover:-translate-y-0.5"
            >
              RSN Candidates
            </button>

            <button
              onClick={() => navigate("/MemberLogin-login")}
              className="w-full bg-[#262261] hover:bg-[#393481] text-white py-3 rounded-xl text-[17px] transition-all duration-200 hover:-translate-y-0.5"
            >
              SSA Staff & Member Companies
            </button>

          </div>

        </div>
      </main>

    </div>
  );
}
