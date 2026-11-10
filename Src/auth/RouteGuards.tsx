import { Navigate, Outlet } from "react-router-dom";
import { Loader } from "lucide-react";
import { useAuth, type Role } from "./AuthContext";


const HOME: Record<Role, string> = {
    member: "/Members/Homepage",
    candidate: "/Candidates/Homepage",
    admin: "/Admin/Dashboard"    
}

const LOGIN: Record<Role, string> = {
    member: "/MemberLogin",
    candidate: "/CandidateLogin",
    admin: "/MemberLogin", // admins use the shared login page
};

function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#262261] text-white/70">
            Loading...
        </div>
    );
}

// landing/login/register pages: logged-in users get sent to their home page
export function PublicOnly() {
    const { role, loading } = useAuth();
    if (loading) return <LoadingScreen />;

    if (role) {
        const target = HOME[role];
        if (target) return <Navigate to={target} replace />;
        console.error("PublicOnly: unknown role", role);
        // unknown role: show the page instead of redirecting (never redirect to "/", it would loop)
    }
    return <Outlet />;
}

// home pages: logged-out users get sent to login
export function RequireRole({ role: required }: { role: Role }) {
    const { role, loading } = useAuth();
    if (loading) return <LoadingScreen />;
  
    if (role !== required) {
        const target = HOME[role];
        if (!target) console.error("RequireRole: no HOME path for role", role);
        return <Navigate to={target ?? "/"} replace />;
    }
    return <Outlet />;
}