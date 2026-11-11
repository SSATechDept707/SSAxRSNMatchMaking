import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";


type Profile = {
    full_name: string;
    email: string;
    age: number | null;
    past_role: string | null;
    verification_status: string | null;

}

type Applictaions = {
    id: number;
    job_title: string;
    company_name: string;
    logo_url: string | null;
    application_status: string;
    reason_for_rejection: string | null;
    have_interviewed: boolean;
}

const inputClass = "w-full border rounded-lg px-3 py-2 text-black";
const labelClass = "block text-xs font-semibold text-gray-600 text-left";

const statusStyle = (s: string) =>   
 s === "accepted"
? "bg-green-500/20 text-green-300"
: s === "rejected"
? "bg-red-500/20 text-red-300"
: "bg-white/15 text-white/70";

export default function Profile() {
    const { setRole, logout } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [applications, setApplications] = useState<Application | null>(null);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [form, setForm] = useState({ name: "", email: "", age: "", pastJobRole: "" });
    const [pw, setPw] = useState({ current: "", next: "" });
    const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [saving, setSaving] = useState(false);


    function fillForm(p: Profile) {
        setProfile(p);
        setForm({
            name: p.full_name ?? "",
            email: p.email ?? "",
            age: p.age == null ? "" : String(p.age),
            pastJobRole: p.past_job_role ?? "",
        });
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [meRes, appsRes] = await Promise.all([
                    fetch("/api/candidates"),
                    fetch("/api/applications"),
                ]);

                // session expired: clearing the role makes the route guard send them to login
                if (meRes.status === 401) {
                    setRole(null);
                    return;
                }
                if (!meRes.ok || !appsRes.ok) throw new Error("request failed");

                const me: Profile = await meRes.json();
                const apps: Application[] = await appsRes.json();
                if (!cancelled) {
                    fillForm(me);
                    setApplications(apps);
                    setLoadState("ready");
                }
            } catch {
                if (!cancelled) setLoadState("error");
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [setRole]);

    function update(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    async function patch(payload: Record<string, unknown>) {
        const res = await fetch("/api/candidates", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 && !payload.currentPassword) setRole(null);
        if (!res.ok) throw new Error(data.error || "Couldn't save changes");
        return data as Profile;
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setProfileMsg(null);
        if (!profile) return;

        // only send what changed
        const payload: Record<string, unknown> = {};
        if (form.name.trim() !== profile.full_name) payload.name = form.name.trim();
        if (form.email.trim().toLowerCase() !== profile.email.toLowerCase()) payload.email = form.email.trim();
        if (form.age !== (profile.age == null ? "" : String(profile.age))) payload.age = form.age;
        if (form.pastJobRole.trim() !== (profile.past_job_role ?? "")) payload.pastJobRole = form.pastJobRole.trim();

        if (Object.keys(payload).length === 0) {
            setProfileMsg({ ok: false, text: "Nothing to update" });
            return;
        }

        setSaving(true);
        try {
            fillForm(await patch(payload));
            setProfileMsg({ ok: true, text: "Profile updated" });
        } catch (err) {
            setProfileMsg({ ok: false, text: (err as Error).message });
        } finally {
            setSaving(false);
        }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();
        setPwMsg(null);
        if (!pw.current || !pw.next) {
            setPwMsg({ ok: false, text: "Fill in both password fields" });
            return;
        }
        setSaving(true);
        try {
            await patch({ currentPassword: pw.current, newPassword: pw.next });
            setPw({ current: "", next: "" });
            setPwMsg({ ok: true, text: "Password changed" });
        } catch (err) {
            setPwMsg({ ok: false, text: (err as Error).message });
        } finally {
            setSaving(false);
        }
    }

    async function handleWithdraw(app: Application) {
        if (!window.confirm(`Withdraw your application for ${app.job_title}?`)) return;
        const res = await fetch(`/api/applications?id=${app.id}`, { method: "DELETE" });
        if (res.ok) {
            setApplications((list) => list.filter((a) => a.id !== app.id));
        } else {
            const data = await res.json().catch(() => ({}));
            window.alert(data.error || "Couldn't withdraw the application");
        }
    }

    const firstName = profile?.full_name?.split(" ")[0] ?? "there";

    return (
        <div className="min-h-screen w-full bg-[#262261] text-white pb-12">
            {/* header: logo left, greeting right */}
            <header className="h-[60px] shrink-0 bg-white flex items-center justify-between px-6 z-10">
                <img
                    src="/images/SSA-logo.png"
                    alt="Singapore Shipping Association"
                    className="h-[48px] w-auto object-contain"
                />
                <div className="flex flex-col text-black items-center gap-1">
                    <span className="text-xs font-semibold">hello, {firstName}!</span>
                    <button type="button" onClick={logout} className="text-[11px] underline text-gray-500">
                        Log out
                    </button>
                </div>
            </header>

            <main className="px-[clamp(1.5rem,5vw,4.5rem)] mt-6 max-w-[900px]">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="text-sm text-white/70 hover:text-white underline"
                >
                    ← Back
                </button>
                <h1 className="text-[clamp(22px,2.4vw,32px)] font-medium mt-2">My Profile</h1>

                {loadState === "loading" && <p className="text-white/60 mt-6">Loading...</p>}
                {loadState === "error" && (
                    <p className="text-white/60 mt-6">Couldn't load your profile. Please refresh the page.</p>
                )}

                {loadState === "ready" && (
                    <>
                        {/* details */}
                        <form onSubmit={handleSaveProfile} className="bg-white rounded-[28px] p-6 mt-6 flex flex-col gap-3">
                            <h2 className="text-[#4B5563] text-lg font-bold">Your details</h2>

                            <div className="flex flex-col gap-2">
                                <label className={labelClass}>Full name</label>
                                <input type="text" value={form.name} onChange={update("name")} className={inputClass} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={labelClass}>Email</label>
                                <input type="email" value={form.email} onChange={update("email")} className={inputClass} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Age</label>
                                    <input
                                        type="number"
                                        min={16}
                                        max={100}
                                        step={1}
                                        value={form.age}
                                        onChange={update("age")}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Past job role</label>
                                    <input
                                        type="text"
                                        value={form.pastJobRole}
                                        onChange={update("pastJobRole")}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {profileMsg && (
                                <p className={`text-sm ${profileMsg.ok ? "text-green-600" : "text-red-600"}`}>
                                    {profileMsg.text}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="self-start bg-[#262261] hover:bg-[#393481] disabled:opacity-60 text-white px-6 py-2 rounded-xl transition-colors"
                            >
                                {saving ? "Saving..." : "Save changes"}
                            </button>
                        </form>

                        {/* password */}
                        <form onSubmit={handleChangePassword} className="bg-white rounded-[28px] p-6 mt-6 flex flex-col gap-3">
                            <h2 className="text-[#4B5563] text-lg font-bold">Change password</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Current password</label>
                                    <input
                                        type="password"
                                        autoComplete="current-password"
                                        value={pw.current}
                                        onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>New password (min 8 characters)</label>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        value={pw.next}
                                        onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            {pwMsg && (
                                <p className={`text-sm ${pwMsg.ok ? "text-green-600" : "text-red-600"}`}>{pwMsg.text}</p>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="self-start border border-[#262261] text-[#262261] hover:bg-[#262261]/5 disabled:opacity-60 px-6 py-2 rounded-xl transition-colors"
                            >
                                Update password
                            </button>
                        </form>

                        {/* applications */}
                        <h2 className="text-[clamp(18px,1.8vw,24px)] font-medium mt-10">My applications</h2>
                        {applications.length === 0 ? (
                            <p className="text-white/60 mt-4">You haven't applied for any positions yet.</p>
                        ) : (
                            <ul className="flex flex-col gap-4 mt-4">
                                {applications.map((a) => (
                                    <li
                                        key={a.id}
                                        className="bg-white/10 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {a.logo_url ? (
                                                <img
                                                    src={a.logo_url}
                                                    alt={a.company_name}
                                                    className="h-10 w-10 rounded-full object-cover shrink-0"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-white/15 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-semibold">{a.job_title}</h3>
                                                <p className="text-sm text-white/70">
                                                    {a.company_name}
                                                    {a.have_interviewed ? " · Interviewed" : ""}
                                                </p>
                                                {a.application_status === "rejected" && a.reason_for_rejection && (
                                                    <p className="text-xs text-white/60 mt-1">
                                                        Reason: {a.reason_for_rejection}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`text-xs font-semibold rounded-full px-3 py-1 capitalize ${statusStyle(
                                                    a.application_status
                                                )}`}
                                            >
                                                {a.application_status}
                                            </span>
                                            {a.application_status === "pending" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleWithdraw(a)}
                                                    className="text-xs underline text-white/70 hover:text-white"
                                                >
                                                    Withdraw
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}