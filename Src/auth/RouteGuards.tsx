import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type Role } from "./AuthContext";

const HOME: Record<Role, string> = {
    member: "/Members/Homepage",
    candidate: "/Candidates/Homepage",
    admin: "/Admin/Dashboard",
};

const LOGIN: Record<Role, string> = {
    member: "/MemberLogin",
    candidate: "/CandidateLogin",
    admin: "/MemberLogin",
};

function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#262261] text-white/70">
            Loading...
        </div>
    );
}

// login/register pages: logged-in users get sent to their home page
export function PublicOnly() {
    const { role, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (role && HOME[role]) return <Navigate to={HOME[role]} replace />;
    return <Outlet />;
}

// home pages: logged-out users go to login, wrong-role users go to their own home
export function RequireRole({ role: required }: { role: Role }) {
    const { role, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (!role) return <Navigate to={LOGIN[required]} replace />;
    if (role !== required) return <Navigate to={HOME[role] ?? LOGIN[required]} replace />;
    return <Outlet />;
}