import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type Role } from "./AuthContext";


const HOME: Record<Role, string> = {
    member: "/Members/Homepage",
 //   candidate: "/Candidates/Homepage"
}

function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#262261] text-white/70">
            Loading...
        </div>
    );
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