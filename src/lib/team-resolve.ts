const NAME_TO_ID: Record<string, string> = {
  Mexico: "mexico",
  "South Africa": "south-africa",
  "Korea Republic": "korea",
  Czechia: "czechia",
  Canada: "canada",
  Switzerland: "switzerland",
  Qatar: "qatar",
  "Bosnia and Herzegovina": "bosnia",
  Brazil: "brazil",
  Morocco: "morocco",
  Haiti: "haiti",
  Scotland: "scotland",
  USA: "usa",
  Paraguay: "paraguay",
  Australia: "australia",
  Türkiye: "turkey",
  Germany: "germany",
  "Curaçao": "curacao",
  "Côte d'Ivoire": "ivory-coast",
  Ecuador: "ecuador",
  Netherlands: "netherlands",
  Japan: "japan",
  Tunisia: "tunisia",
  Sweden: "sweden",
  Belgium: "belgium",
  Egypt: "egypt",
  "IR Iran": "iran",
  "New Zealand": "new-zealand",
  Spain: "spain",
  "Cabo Verde": "cape-verde",
  "Saudi Arabia": "saudi-arabia",
  Uruguay: "uruguay",
  France: "france",
  Senegal: "senegal",
  Norway: "norway",
  Iraq: "iraq",
  Argentina: "argentina",
  Algeria: "algeria",
  Austria: "austria",
  Jordan: "jordan",
  Portugal: "portugal",
  "Congo DR": "congo-dr",
  Uzbekistan: "uzbekistan",
  Colombia: "colombia",
  England: "england",
  Croatia: "croatia",
  Ghana: "ghana",
  Panama: "panama",
};

export function resolveTeamId(name: string): string {
  if (NAME_TO_ID[name]) return NAME_TO_ID[name];
  return `tbd:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function isTbdTeam(teamId: string) {
  return teamId.startsWith("tbd:");
}

export function displayTeamName(teamId: string, teamMap: Record<string, { nameLt: string }>) {
  if (isTbdTeam(teamId)) {
    return teamId.replace("tbd:", "").toUpperCase();
  }
  return teamMap[teamId]?.nameLt ?? teamId;
}
