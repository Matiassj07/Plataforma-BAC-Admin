import { scoreColorClasses } from "@/lib/utils";

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-bac-gray-alt px-2 py-0.5 text-xs font-medium text-bac-gray-text">
        Sin datos
      </span>
    );
  }
  const { bg, text } = scoreColorClasses(score);
  return (
    <span className={`inline-flex items-center rounded-full ${bg} ${text} px-2 py-0.5 text-xs font-semibold`}>
      {score}%
    </span>
  );
}
