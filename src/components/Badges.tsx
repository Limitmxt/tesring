import type { DealCategory, Tag } from "@/lib/types";

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-emerald-600" : score >= 50 ? "bg-yellow-600" : "bg-red-600";
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${color}`}
      title="Deal score (0-100)"
    >
      {score}
    </span>
  );
}

export function CategoryBadge({ category }: { category: DealCategory }) {
  const map: Record<DealCategory, string> = {
    "Good Flip": "bg-emerald-500/15 text-emerald-300 border-emerald-600/40",
    Maybe: "bg-yellow-500/15 text-yellow-300 border-yellow-600/40",
    Avoid: "bg-red-500/15 text-red-300 border-red-600/40",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${map[category]}`}>
      {category}
    </span>
  );
}

export function TagPill({ tag }: { tag: Tag }) {
  const map = {
    good: "bg-emerald-500/10 text-emerald-300",
    bad: "bg-red-500/10 text-red-300",
    info: "bg-neutral-700/40 text-neutral-300",
  } as const;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] ${map[tag.tone]}`}>{tag.label}</span>
  );
}
