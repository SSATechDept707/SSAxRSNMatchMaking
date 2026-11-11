
import { useEffect, useState } from "react";

const inputClass =
    "w-full border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:border-[#262261] focus:ring-2 focus:ring-[#262261]/10";

const labelClass =
    "block text-sm font-semibold text-gray-700 mb-1.5";

type TagInputProps = {
    label: string;
    tags: string[];
    onChange: (tags: string[]) => void;
};

function TagInput({ label, tags, onChange }: TagInputProps) {
    const [text, setText] = useState("");

    function addTag() {
        const t = text.trim().replace(/,$/, "").trim();

        const exists = tags.some(
            (x) => x.toLowerCase() === t.toLowerCase()
        );

        if (t && !exists) {
            onChange([...tags, t]);
        }

        setText("");
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
        } else if (e.key === "Backspace" && !text && tags.length) {
            onChange(tags.slice(0, -1));
        }
    }

    return (
        <div>
            <label className={labelClass}>{label}</label>

            <div className="min-h-[48px] w-full border border-gray-200 bg-white rounded-xl px-3 py-2 flex flex-wrap gap-2 items-center focus-within:border-[#262261] focus-within:ring-2 focus-within:ring-[#262261]/10 transition-all">

                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-2 bg-[#262261]/10 text-[#262261] text-xs font-medium rounded-lg px-3 py-1.5"
                    >
                        {tag}

                        <button
                            type="button"
                            onClick={() =>
                                onChange(tags.filter((t) => t !== tag))
                            }
                            className="text-[#262261]/60 hover:text-red-600 font-bold"
                            aria-label={`Remove ${tag}`}
                        >
                            ×
                        </button>
                    </span>
                ))}

                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addTag}
                    placeholder={
                        tags.length ? "Add another..." : "Type a skill and press Enter"
                    }
                    className="flex-1 min-w-[140px] outline-none text-sm text-gray-800 placeholder:text-gray-400 py-1 bg-transparent"
                />
            </div>

            <p className="text-xs text-gray-400 mt-1.5">
                Press Enter or comma to add a skill.
            </p>
        </div>
    );
}

type PostJobModalProps = {
    onClose: () => void;
    onPosted: () => void;
};

export default function PostJobModal({
    onClose,
    onPosted,
}: PostJobModalProps) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        payRange: "",
        availOpening: "1",
        closingDate: "",
    });

    const [softSkills, setSoftSkills] = useState<string[]>([]);
    const [techSkills, setTechSkills] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const today = new Date().toLocaleDateString("en-CA");

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !saving) onClose();
        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, saving]);

    function update(field: keyof typeof form) {
        return (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        ) => {
            setForm((f) => ({
                ...f,
                [field]: e.target.value,
            }));
        };
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const {
            title,
            description,
            payRange,
            availOpening,
            closingDate,
        } = form;

        if (
            !title.trim() ||
            !description.trim() ||
            !payRange.trim() ||
            !closingDate
        ) {
            setError("Please fill in all required fields.");
            return;
        }

        const openings = Number(availOpening);

        if (!Number.isInteger(openings) || openings < 1) {
            setError("Openings must be a whole number of at least 1.");
            return;
        }

        if (closingDate < today) {
            setError("Closing date can't be in the past.");
            return;
        }

        const payload = {
            title: title.trim(),
            description: description.trim(),
            payRange: payRange.trim(),
            softSkills,
            techSkills,
            availOpening: openings,
            closingDate: `${closingDate}T23:59:59+08:00`,
        };

        setSaving(true);

        try {
            const res = await fetch("/api/jobPostings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Couldn't save the posting.");
                return;
            }

            onPosted();
            onClose();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => !saving && onClose()}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[680px] max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* HEADER */}
                <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-gray-100 bg-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-8 h-1 rounded-full bg-[#262261]" />
                            </div>

                            <h1 className="text-2xl font-bold text-gray-900">
                                Create a job posting
                            </h1>

                            <p className="text-sm text-gray-500 mt-1">
                                Provide the details below to advertise your
                                available position.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="w-9 h-9 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors text-xl disabled:opacity-50"
                            aria-label="Close modal"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* FORM BODY */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-7">

                    {/* JOB DETAILS */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-sm font-bold text-gray-900">
                                Job details
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Basic information about the position.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>
                                    Job title <span className="text-red-500">*</span>
                                </label>

                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={update("title")}
                                    placeholder="e.g. Marine Engineer"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Job description <span className="text-red-500">*</span>
                                </label>

                                <textarea
                                    value={form.description}
                                    onChange={update("description")}
                                    placeholder="Describe the role, responsibilities and requirements..."
                                    rows={5}
                                    className={`${inputClass} resize-y min-h-[130px]`}
                                />
                                <p className="text-xs text-gray-400 mt-1.5">
                                    Include the key responsibilities and
                                    qualifications expected.
                                </p>
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Pay range <span className="text-red-500">*</span>
                                </label>

                                <input
                                    type="text"
                                    value={form.payRange}
                                    onChange={update("payRange")}
                                    placeholder="e.g. $3,500 - $4,500 / month"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="border-t border-gray-100" />

                    {/* OPENINGS */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-sm font-bold text-gray-900">
                                Posting information
                            </h2>
                            <p className="text-xs text-gray-400 mt-1">
                                Set the number of vacancies and application deadline.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    Available openings <span className="text-red-500">*</span>
                                </label>

                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={form.availOpening}
                                    onChange={update("availOpening")}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Closing date <span className="text-red-500">*</span>
                                </label>

                                <input
                                    type="date"
                                    min={today}
                                    value={form.closingDate}
                                    onChange={update("closingDate")}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="border-t border-gray-100" />

                    {/* SKILLS */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-sm font-bold text-gray-900">
                                Skills and requirements
                            </h2>

                            <p className="text-xs text-gray-400 mt-1">
                                Add relevant skills to help match candidates
                                with your vacancy.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <TagInput
                                label="Technical skills"
                                tags={techSkills}
                                onChange={setTechSkills}
                            />

                            <TagInput
                                label="Soft skills"
                                tags={softSkills}
                                onChange={setSoftSkills}
                            />
                        </div>
                    </section>

                    {/* ERROR */}
                    {error && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3.5">
                            <span className="text-red-600 text-lg leading-none">
                                !
                            </span>

                            <p className="text-sm text-red-700">
                                {error}
                            </p>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-6 sm:px-8 py-4 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-gray-400">
                        <span className="text-red-500">*</span> Required fields
                    </p>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-300 bg-white text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-[#262261] hover:bg-[#393481] text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {saving ? "Publishing..." : "Publish job"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
