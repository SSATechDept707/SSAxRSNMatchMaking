import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChartPie, BadgeCheck, UserCog } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import VerifyUsers from "./VerifyUsers";
import ManageUsers from "./ManageUsers";
import CreateAdminModal from "./CreateAdminModal";
import Analytics from "./Analytics";

type Section = "data" | "verify" | "manage";

const NAV: { key: Section; label: string; icon: LucideIcon }[] = [
    { key: "data", label: "Analytics", icon: ChartPie },
    { key: "verify", label: "Verify Users", icon: BadgeCheck },
    { key: "manage", label: "Manage Users", icon: UserCog },
];
const CAN_ADD_ADMIN = ["staff", "superadmin"];

export default function Dashboard() {
    const { adminRole, logout } = useAuth();
    const [section, setSection] = useState<Section>("data");
    const [addAdminModal, setAddAdminModal] = useState(false);

    const canAddAdmin = !!adminRole && CAN_ADD_ADMIN.includes(adminRole.toLowerCase());

    const itemClass = (key: Section) =>
        `w-full text-left px-4 py-3 rounded-xl transition-colors ${
            section === key
                ? "bg-white/15 text-white font-semibold"
                : "text-white/70 hover:bg-white/10 hover:text-white"
        }`;

    return (
        <div className="min-h-screen w-full flex flex-col">
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
                <aside className="w-[clamp(200px,20vw,280px)] shrink-0 bg-[#262261] p-4 flex flex-col gap-2">
                    {NAV.map((item) => (
                        <button key={item.key} onClick={() => setSection(item.key)} className={itemClass(item.key)}>
                            <item.icon size={18} className="inline mr-2" />
                            {item.label}
                        </button>
                    ))}

                    {canAddAdmin && (
                        <button
                            onClick={() => setAddAdminModal(true)}
                            className="w-full text-left px-4 py-3 rounded-xl mt-4 border border-dashed border-white/40 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            + Add admin
                        </button>
                    )}
                </aside>

                <main className="flex-1 bg-gray-100 p-8 overflow-y-auto">
                    {section === "data" && <Analytics />}
                    {section === "verify" && <VerifyUsers />}
                    {section === "manage" && <ManageUsers />}
                </main>
            </div>

            {addAdminModal && (
                <CreateAdminModal
                    onClose={() => setAddAdminModal(false)}
                    onSuccess={() => setAddAdminModal(false)}
                />
            )}
        </div>
    );
}