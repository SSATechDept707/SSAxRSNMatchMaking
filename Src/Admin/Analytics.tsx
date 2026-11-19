import { useEffect, useMemo, useState } from "react";
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type AgeRow = { age: number; total: number };
type AppRow = { applications: number; candidates: number };
type AnalyticsData = { ages: AgeRow[]; applications: AppRow[] };


////////////////////////////////////
/* ---------- helpers ---------- */
//////////////////////////////////
function fillAges(rows: AgeRow[]) {
    if (!rows.length) return [];
    const map = new Map(rows.map((r) => [r.age, r.total]));
    const ages = rows.map((r) => r.age);
    const min = Math.min(...ages);
    const max = Math.max(...ages);
    const out: { age: number; signups: number }[] = [];
    for (let a = min; a <= max; a++) out.push({ age: a, signups: map.get(a) ?? 0 });
    return out;
}
// light pink → deep red, scaled between the smallest and largest value
const LIGHT = [254, 226, 226];
const DEEP = [153, 27, 27];
function shade(value: number, min: number, max: number) {
    const t = max === min ? 0.6 : (value - min) / (max - min);
    const c = LIGHT.map((l, i) => Math.round(l + (DEEP[i] - l) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/* ---------- card that fades in ---------- */

function FadeCard({
    title, subtitle, delay = 0, action, children,
}: {
    title: string;
    subtitle: string;
    delay?: number;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setShown(true), 30);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            style={{ transitionDelay: `${delay}ms` }}
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
        >
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-[#262261]">{title}</h2>
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

/* ---------- tooltip for the stacked bar ---------- */

type TipItem = { dataKey?: string | number; name?: string; value?: number };

function AppTooltip({
    active, payload, hoverKey,
}: {
    active?: boolean;
    payload?: TipItem[];
    hoverKey: string | null;
}) {
    if (!active || !payload?.length) return null;
    const item = payload.find((p) => p.dataKey === hoverKey) ?? payload[0];
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-sm">
            <p className="font-semibold text-[#262261]">{item.name}</p>
            <p className="text-gray-600">{item.value} candidates</p>
        </div>
    );
}

/* ---------- main component ---------- */

export default function Analytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [bucket, setBucket] = useState<5 | 10>(5);
    const [hoverKey, setHoverKey] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin?analytics=true")
            .then((r) => {
                if (!r.ok) throw new Error("Failed to load analytics");
                return r.json();
            })
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const ageData = useMemo(() => (data ? fillAges(data.ages) : []), [data]);

    const ticks = useMemo(() => {
        if (!ageData.length) return [];
        const start = Math.floor(ageData[0].age / bucket) * bucket;
        const end = Math.ceil(ageData[ageData.length - 1].age / bucket) * bucket;
        const t: number[] = [];
        for (let a = start; a <= end; a += bucket) t.push(a);
        return t;
    }, [ageData, bucket]);

    if (loading) return <p className="text-gray-400 text-sm">Loading analytics...</p>;
    if (error || !data) return <p className="text-red-500 text-sm">{error || "No data"}</p>;

    // applications chart: one "Yes" column split into segments, one "No" column
    const submitted = data.applications.filter((a) => a.applications > 0);
    const notSubmitted = data.applications.find((a) => a.applications === 0)?.candidates ?? 0;
    const counts = submitted.map((a) => a.candidates);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    console.log(submitted, min, max);

    
    const yesRow: Record<string, string | number> = { name: "Yes" };
    submitted.forEach((a) => { yesRow[`a${a.applications}`] = a.candidates; });
    const barData = [yesRow, { name: "No", none: notSubmitted }];

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* LINE: sign-ups by age */}
            <FadeCard
                title="Sign-ups by age"
                subtitle="Verified candidates, grouped by age"
                action={
                    <div className="flex gap-1">
                        <span className="text-xs text-gray-500 mr-1">Axis every</span>
                        {([5, 10] as const).map((n) => (
                            <button
                                key={n}
                                onClick={() => setBucket(n)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium ${bucket === n ? "bg-[#262261] text-white" : "bg-gray-100 text-gray-600"
                                    }`}
                            >
                                {n} yrs
                            </button>
                        ))}
                    </div>
                }
            >
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ageData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis
                                dataKey="age"
                                type="number"
                                domain={[ticks[0], ticks[ticks.length - 1]]}
                                ticks={ticks}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip
                                labelFormatter={(a) => `Age ${a}`}
                                formatter={(v) => [`${v} sign-ups`, "Verified"]}
                            />
                            <Line
                                type="monotone"
                                dataKey="signups"
                                stroke="#262261"
                                strokeWidth={3}
                                dot={{ r: 4, fill: "#262261" }}
                                activeDot={{ r: 7, fill: "#8274C7" }}
                                animationDuration={1400}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </FadeCard>

            {/* BAR: has the candidate submitted an application? */}
            <FadeCard
                title="Applications submitted"
                subtitle="Yes is split by how many applications each candidate sent"
                delay={150}
                action={
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        fewer
                        <div
                            className="h-2 w-24 rounded"
                            style={{ background: `linear-gradient(to right, ${shade(0, 0, 1)}, ${shade(1, 0, 1)})` }}
                        />
                        more candidates
                    </div>
                }
            >
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip
                                cursor={false}
                                content={<AppTooltip hoverKey={hoverKey} />}
                            />
                            {submitted.map((a) => (
                                <Bar
                                    key={a.applications}
                                    dataKey={`a${a.applications}`}
                                    name={`${a.applications} application${a.applications === 1 ? "" : "s"}`}
                                    stackId="s"
                                    fill={shade(a.candidates, min, max)}
                                    stroke="#fff"
                                    animationDuration={1200}
                                    onMouseEnter={() => setHoverKey(`a${a.applications}`)}
                                    onMouseLeave={() => setHoverKey(null)}
                                />
                            ))}
                            <Bar
                                dataKey="none"
                                name="Not submitted"
                                stackId="s"
                                fill="#94a3b8"
                                animationDuration={1200}
                                onMouseEnter={() => setHoverKey("none")}
                                onMouseLeave={() => setHoverKey(null)}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </FadeCard>

        </div>
    );
}