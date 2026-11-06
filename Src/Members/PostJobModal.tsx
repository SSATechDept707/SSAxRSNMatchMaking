import { useEffect, useState } from "react";

const inputClass = "w-full border rounded-lg px-3 py-2";
const labelClass = "block text-xs font-semibold text-gray-600 text-left";

type TagInputProps = {
    label: string;
    tags: string[];
    onChange: (tags: string[]) => void;
};

function TagInput({ label, tags, onChange }: TagInputProps) {
    const [text, setText] = useState("");

    function addTag() {
        const t = text.trim();
        const exists = tags.some((x) => x.toLowerCase() === t.toLowerCase());
        if (t && !exists) onChange([...tags, t]);
        setText("");
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault(); // stops Enter from submitting the whole form
            addTag();
        } else if (e.key === "Backspace" && !text && tags.length) {
            onChange(tags.slice(0, -1));
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <label className={labelClass}>{label}</label>
            <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 bg-[#262261]/10 text-[#262261] text-sm rounded-full px-3 py-1"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => onChange(tags.filter((t) => t !== tag))}
                            className="font-bold hover:text-red-600"
                            aria-label={`Remove ${tag}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addTag}
                placeholder="Type a skill, then press Enter"
                className={inputClass}
            />
        </div>
    );
}

export default function PostJobModal({ onClose }: { onClose: () => void }) {
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

    // today's date as YYYY-MM-DD in the user's local timezone
    const today = new Date().toLocaleDateString("en-CA");

    // close on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    function update(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const { title, description, payRange, availOpening, closingDate } = form;

        if (!title.trim() || !description.trim() || !payRange.trim() || !closingDate) {
            setError("Please fill in all required fields");
            return;
        }
        const openings = Number(availOpening);
        if (!Number.isInteger(openings) || openings < 1) {
            setError("Openings must be a whole number of at least 1");
            return;
        }
        if (closingDate < today) {
            setError("Closing date can't be in the past");
            return;
        }

        const payload = {
            action: "createJob",
            title: title.trim(),
            description: description.trim(),
            payRange: payRange.trim(),
            softSkills,
            techSkills,
            availOpening: openings,
            closingDate: `${closingDate}T23:59:59+08:00`, // end of the closing day
        };

        console.log(payload);
        // TODO: POST to the jobs API, then refresh the job list
        onClose();
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-[38px] px-[clamp(1.5rem,3vw,2.5rem)] py-[clamp(2rem,3vw,3rem)] shadow-xl"
            >
                <h1 className="text-[#4B5563] text-[clamp(18px,1.8vw,26px)] font-bold text-center mb-6">
                    Add posting
                </h1>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        <label className={labelClass}>Job title</label>
                        <input type="text" value={form.title} onChange={update("title")} className={inputClass} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className={labelClass}>Description</label>
                        <textarea
                            value={form.description}
                            onChange={update("description")}
                            className={`${inputClass} min-h-[140px] resize-y`}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className={labelClass}>Pay range</label>
                        <input
                            type="text"
                            value={form.payRange}
                            onChange={update("payRange")}
                            placeholder="e.g. $3,500 - $4,500 / month"
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                            <label className={labelClass}>Available openings</label>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={form.availOpening}
                                onChange={update("availOpening")}
                                className={inputClass}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className={labelClass}>Closing date</label>
                            <input
                                type="date"
                                min={today}
                                value={form.closingDate}
                                onChange={update("closingDate")}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <TagInput label="Technical skills (optional)" tags={techSkills} onChange={setTechSkills} />
                    <TagInput label="Soft skills (optional)" tags={softSkills} onChange={setSoftSkills} />

                    {error && <p className="text-red-600 text-sm">{error}</p>}

                    <div className="flex gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-1/3 border border-[#262261] text-[#262261] py-[clamp(0.6rem,1vw,0.85rem)] rounded-xl transition-all duration-200 hover:bg-[#262261]/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-[#262261] hover:bg-[#393481] text-white py-[clamp(0.6rem,1vw,0.85rem)] rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                        >
                            Post job
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}