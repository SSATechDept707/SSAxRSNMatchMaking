import {useState, useEffect} from "react";
import {UserRoundPen} from "lucide-react";
import { useAuth } from "../auth/AuthContext";


interface ProfileC {
    full_name: string;
    preferred_name: string;
    email: string;
    headshot_url:string;
    verification_status: string; //display only
    dob: string; //display only
    past_role: string;
}

export default function Candidate() {
    const { setRole, logout } = useAuth();
    const [profile, setProfile] = useState<ProfileC | null>(null);
    const [form, setForm] = useState("");
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

    return(
        <div className="min-h-screen w-full flex flex-col bg-[#262261] text-white">
        {/* Header: logo left, greeting right */}
        <header className="relative flex items-center bg-white justify-between px-[clamp(1.5rem,5vw,4.5rem)] h-[72px]">

            <img
                src="/images/SSA-logo.png"
                alt="Singapore Shipping Association"
                className="h-[48px] w-auto object-contain"
            />

            <div className="absolute right-[clamp(1.5rem,5vw,4.5rem)] top-3 flex flex-col items-center text-gray-700 z-10">
                <span className="text-xs font-semibold">Hello, user</span>
                <button type="button" onClick={logout} className="text-[11px] underline text-gray-500">
                    Log out
                </button>
            </div>

        </header>
        </div>
    )
}