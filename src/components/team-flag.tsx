import { teamMap } from "@/data/teams";

export function TeamFlag({
  teamId,
  size = 32,
}: {
  teamId: string;
  size?: number;
}) {
  const team = teamMap[teamId];
  if (!team) return null;

  return (
    <img
      src={`https://flagcdn.com/w${size * 2}/${team.flagCode}.png`}
      alt={team.nameLt}
      width={size}
      height={Math.round(size * 0.75)}
      className="rounded-sm object-cover shadow-sm"
    />
  );
}
