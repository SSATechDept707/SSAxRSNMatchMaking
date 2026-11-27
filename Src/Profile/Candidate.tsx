import { useState, useEffect, useRef } from "react";
import { UserRoundPen } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

interface ProfileC {
    full_name: string;
    preferred_name: string | null;
    email: string;
    headshot_url: string | null;
    verification_status: string | null; // display only
    dob: string | null; // display only
    past_role: string | null;
}

type FormState = { name: string; prefName: string; email: string; pastJobRole: string };

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const labelClass = "text-sm text-[#4B5563]";
const inputClass = "w-full rounded-xl border border-gray-300 px-3 py-2 text-black";
const readOnlyClass = `${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`;

// asks our API for a short-lived upload link, PUTs the file to it, returns the public URL
async function uploadHeadshot(file: File): Promise<string> {
    const res = await fetch("/api/uploadUrl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "headshot", contentType: file.type, size: file.size }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not start upload");

    const put = await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
    });
    if (!put.ok) throw new Error("Upload failed");

    return data.publicUrl as string;
}

export default function Candidate() {
    const { setRole, logout } = useAuth();
    const [profile, setProfile] = useState<ProfileC | null>(null);
    const [form, setForm] = useState<FormState>({ name: "", prefName: "", email: "", pastJobRole: "" });
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [pw, setPw] = useState({ current: "", next: "" });
    const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [savingPw, setSavingPw] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // sets the profile AND resets the editable fields (only use after loading / saving the details)
    function fillForm(p: ProfileC) {
        setProfile(p);
        setForm({
            name: p.full_name,
            prefName: p.preferred_name ?? "",
            email: p.email,
            pastJobRole: p.past_role ?? "",
        });
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const meRes = await fetch("/api/candidates");

                // session expired: clearing the role makes the route guard send them to login
                if (meRes.status === 401) {
                    setRole(null);
                    return;
                }
                if (!meRes.ok) throw new Error("request failed");

                const me: ProfileC = await meRes.json();
                if (!cancelled) {
                    fillForm(me);
                    setLoadState("ready");
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) setLoadState("error");
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [setRole]);

    function update(field: keyof FormState) {
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
        return data as ProfileC;
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setProfileMsg(null);
        if (!profile) return;

        // only send what changed (the API leaves unsent fields alone)
        const payload: Record<string, unknown> = {};
        if (form.name.trim() !== profile.full_name) payload.name = form.name.trim();
        if (form.email.trim().toLowerCase() !== profile.email.toLowerCase()) payload.email = form.email.trim();
        if (form.prefName.trim() !== (profile.preferred_name ?? "")) payload.prefName = form.prefName.trim();
        if (form.pastJobRole.trim() !== (profile.past_role ?? "")) payload.pastJobRole = form.pastJobRole.trim();

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

    async function handleHeadshot(e: React.ChangeEvent<HTMLInputElement>) {
        const input = e.target;
        const file = input.files?.[0];
        if (!file) return;

        setProfileMsg(null);
        if (file.size > MAX_PHOTO_BYTES) {
            setProfileMsg({ ok: false, text: "Photo must be 2 MB or smaller" });
            input.value = "";
            return;
        }

        setUploading(true);
        try {
            const publicUrl = await uploadHeadshot(file);
            const updated = await patch({ headshotUrl: publicUrl });
            // setProfile only: fillForm would wipe anything typed but not saved yet
            setProfile(updated);
            setProfileMsg({ ok: true, text: "Photo updated" });
        } catch (err) {
            setProfileMsg({ ok: false, text: (err as Error).message });
        } finally {
            setUploading(false);
            input.value = ""; // so picking the same file again still fires onChange
        }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();
        setPwMsg(null);
        if (!pw.current || !pw.next) {
            setPwMsg({ ok: false, text: "Fill in both password fields" });
            return;
        }
        setSavingPw(true);
        try {
            await patch({ currentPassword: pw.current, newPassword: pw.next });
            setPw({ current: "", next: "" });
            setPwMsg({ ok: true, text: "Password changed" });
        } catch (err) {
            setPwMsg({ ok: false, text: (err as Error).message });
        } finally {
            setSavingPw(false);
        }
    }

    const firstName = (profile?.preferred_name || profile?.full_name)?.split(" ")[0] ?? "there";
    const dobText = profile?.dob
        ? new Date(profile.dob).toLocaleDateString("en-GB", { timeZone: "UTC" })
        : "";

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

                {loadState === "ready" && profile && (
                    <>
                        {/* details */}
                        <form onSubmit={handleSaveProfile} className="bg-white rounded-[28px] p-6 mt-6 flex flex-col gap-3">
                            <h2 className="text-[#4B5563] text-lg font-bold">Your details</h2>

                            {/* photo: click the avatar to pick a file */}
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={uploading}
                                    aria-label="Change profile photo"
                                    className="shrink-0 rounded-full disabled:opacity-60"
                                >
                                    {profile.headshot_url ? (
                                        <img
                                            src={profile.headshot_url}
                                            alt="Your profile photo"
                                            className="h-28 w-28 rounded-full object-cover"
                                        />
                                    ) : (
                                        <UserRoundPen className="h-28 w-28 text-[#4B5563]" />
                                    )}
                                </button>
                                <input
                                    type="file"
                                    hidden
                                    ref={fileRef}
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleHeadshot}
                                />
                                <p className="text-sm text-gray-500">
                                    {uploading ? "Uploading..." : "Click the picture to change it (JPG, PNG or WebP, max 2 MB)"}
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className={labelClass}>Full name</label>
                                <input type="text" value={form.name} onChange={update("name")} className={inputClass} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={labelClass}>Preferred name</label>
                                <input type="text" value={form.prefName} onChange={update("prefName")} className={inputClass} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={labelClass}>Email</label>
                                <input type="email" value={form.email} onChange={update("email")} className={inputClass} />
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Date of birth</label>
                                    <input type="text" disabled value={dobText} className={readOnlyClass} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className={labelClass}>Verification status</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={profile.verification_status ?? ""}
                                        className={readOnlyClass}
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
                                disabled={saving || uploading}
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
                                disabled={savingPw}
                                className="self-start border border-[#262261] text-[#262261] hover:bg-[#262261]/5 disabled:opacity-60 px-6 py-2 rounded-xl transition-colors"
                            >
                                {savingPw ? "Updating..." : "Update password"}
                            </button>
                        </form>
                    </>
                )}
            </main>
        </div>
    );
}