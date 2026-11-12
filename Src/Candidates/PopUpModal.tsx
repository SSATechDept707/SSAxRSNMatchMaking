import { useEffect } from "react";
import { Loader2, Wand, X } from "lucide-react";

type Props = {
    recipients: string[];
    onClose: () => void;
};

export default function PopUpModal({ recipients, onClose }: Props) {
    const mailto = `mailto:${recipients.join(",")}?subject=${encodeURIComponent("CV Application")}`;

    useEffect(() => {
        const timer = setTimeout(() => {
            window.location.href = mailto;
        }, 2000);
        return () => clearTimeout(timer); // cancels if the modal is closed early
    }, [mailto]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-2xl shadow-lg p-8 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

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

                <div className="mt-6 bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-800">
                        Make sure to get your CV ready before sending your application.
                    </p>
                </div>

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