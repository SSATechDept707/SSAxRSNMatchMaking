import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChartPie, BadgeCheck, UserCog, Plus  } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

type Section = "data" | "verify" | "manage" | "addAdmin";

const NAV: {key: Section; label: string; icon: string}[] = [ 
    {key: "data", label: "Analytics", icon: ChartPie },
    {key: "verify", label: "Verify Users", icon: BadgeCheck },
    {key: "manage", label: "Manage Users", icon: UserCog },
    {key: "addAdmin", label: "Create New Admin", icon: Plus }
]
const CAN_ADD_ADMIN = ["staff", "superadmin"];

export default function Dashboard() {
    const { adminRole, logout } = useAuth();
    const [section, setSection] = useState<Section>("data");

    // cosmetic only: the add-admin API must check the role itself too
    const canAddAdmin = !!adminRole && CAN_ADD_ADMIN.includes(adminRole.toLowerCase());

    const itemClass = (key: Section) =>
        `w-full text-left px-4 py-3 rounded-xl transition-colors ${
            section === key
                ? "bg-white/15 text-white font-semibold"
                : "text-white/70 hover:bg-white/10 hover:text-white"
        }`;

    return (
        <div className="min-h-screen w-full flex flex-col">
            {/* same white header as the other pages */}
            <header className="h-[60px] pl-4 shrink-0 bg-white flex items-center justify-between px-6 z-10">
                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[38px] w-auto object-contain"
                />
                <button onClick={logout} className="text-sm text-[#262261] underline">
                    Log out
                </button>
            </header>

            <div className="flex flex-1">
                {/* left sidebar */}
                <aside className="w-[clamp(200px,20vw,280px)] shrink-0 bg-[#262261] p-4 flex flex-col gap-2">
                    {NAV.map((item) => (
                        <button key={item.key} onClick={() => setSection(item.key)} className={itemClass(item.key)}>
                            {item.label}
                        </button>
                    ))}


                    {canAddAdmin && (
                        <button
                            onClick={() => setSection("addAdmin")}
                            className={`${itemClass("addAdmin")} mt-4 border border-dashed border-white/40`}
                        >
                            + Add admin
                        </button>
                    )}
                </aside>

                {/* content area */}
                <main className="flex-1 bg-gray-100 p-8 overflow-y-auto">
                <h1>{NAV.find((n) => n.key === section)?.label ?? "Add an admin"}</h1>
                    
                </main>
            </div>
        </div>
    );
}