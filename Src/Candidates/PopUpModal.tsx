import { useEffect, useState } from "react";
import { Loader2, Wand, X, MailOpen } from "lucide-react";

type Props = {
    jobId: number;
    recipients: string[];
    onClose: () => void;
    onSubmitted?: () => void;
};

export default function PopUpModal({ jobId, recipients, onClose,  onSubmitted }: Props) {
    const [phase, setPhase] = useState<"redirecting" | "waiting">("redirecting");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const mailto = `mailto:${recipients.join(",")}?subject=${encodeURIComponent("RSN X SSA Application – [Add Your Name]")}`;


    useEffect(() => {
        let fallback: ReturnType<typeof setTimeout>;

        const goWaiting = () => setPhase("waiting");
        const onVisibility = () => {
            if (document.visibilityState === "hidden") goWaiting();
        };

        window.addEventListener("blur", goWaiting);
        document.addEventListener("visibilitychange", onVisibility);

        const redirect = setTimeout(() => {
            window.location.href = mailto;
            // Outlook can take 5-8s to load, so switch the wording anyway
            fallback = setTimeout(goWaiting, 6000);
        }, 2000);

        return () => {
            clearTimeout(redirect);
            clearTimeout(fallback);
            window.removeEventListener("blur", goWaiting);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [mailto]);

    async function handleSubmitted() {
        setSaving(true); 
        setError("");

        try {

            const res = await fetch("api/applications", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ postingId: jobId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Something went wrong");
            onSubmitted?.();
            onClose();

        } catch(e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="relative bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
            <button
                onClick={onClose}
                disabled={saving}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>

            {phase === "redirecting" ? (
                <>
                    <div className="flex items-center gap-3">
                        <Wand className="w-6 h-6 text-purple-600 animate-pulse" />
                        <p className="text-lg font-semibold text-gray-800">
                            Please wait while we redirect you.
                        </p>
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                        <p className="text-sm text-gray-500">Preparing your application...</p>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-3">
                        <MailOpen className="w-6 h-6 text-purple-600" />
                        <p className="text-lg font-semibold text-gray-800">
                            Please keep this window open until your application is sent.
                        </p>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">
                        Attach your CV in your email app and send it. Then come back and confirm below.
                    </p>
                </>
            )}

            <div className="mt-6 bg-purple-50 rounded-xl p-4">
                <p className="text-sm text-purple-800">
                    Make sure to get your CV ready before sending your application.
                </p>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            {phase === "waiting" && (
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel submission
                    </button>
                    <button
                        onClick={handleSubmitted}
                        disabled={saving}
                        className="flex-1 rounded-xl bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "I have submitted"}
                    </button>
                </div>
            )}

            <p className="mt-4 text-xs text-gray-400">
                Nothing happening?{" "}
                <a href={mailto} className="text-purple-600 underline">
                    Open your email app
                </a>
            </p>
        </div>
    </div>
);
}