import {  createContext, useContext, useEffect, useState } from "react";

export type Role = "member" | "candidate";

type AuthState = {
     role: Role | null;
     loading: boolean;
     setRole: (role: Role | null) => void;
     logout: () => Promise<void>;
};

const MIN_LOADING_MS = 2000;
const AuthContext = createContext<AuthState | null>(null);


export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);

    // runs once when the app first loads: ask the server who we are
    useEffect(() => {
        const wait = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS));
        const check = fetch("/api/session")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setRole(data?.role ?? null))
            .catch(() => setRole(null));
        Promise.all([check, wait]).then(() => setLoading(false));
    }, []);

    async function logout() {
        await fetch("/api/session", { method: "DELETE" });
        setRole(null);
    }

    return (
        <AuthContext.Provider value={{ role, loading, setRole, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}