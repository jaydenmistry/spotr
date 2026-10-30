// Ranking for the command palette. Deliberately simple and predictable:
// a command's label beats its keywords, and a prefix beats a word start,
// which beats a plain substring. No fuzzy skipping — typing "pipe" should
// never surface "Sign out".

export interface SearchableCommand {
  id: string;
  label: string;
  keywords?: string[];
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
}

function scoreText(text: string, query: string): number {
  const haystack = normalize(text);
  if (!haystack) return 0;
  if (haystack === query) return 100;
  if (haystack.startsWith(query)) return 80;
  const words = haystack.split(/[\s/\-–—·]+/);
  if (words.some((word) => word.startsWith(query))) return 60;
  // Initials: "bb" → "Buy Box", "of" → "Opportunity Feed".
  if (query.length >= 2 && words.map((word) => word[0] ?? "").join("").startsWith(query)) return 50;
  if (haystack.includes(query)) return 30;
  return 0;
}

/** 0 means no match. Keyword matches rank just below the same match on the label. */
export function scoreCommand(command: SearchableCommand, rawQuery: string): number {
  const query = normalize(rawQuery);
  if (!query) return 1;
  const labelScore = scoreText(command.label, query);
  const keywordScore = Math.max(0, ...(command.keywords ?? []).map((keyword) => scoreText(keyword, query)));
  return Math.max(labelScore, keywordScore > 0 ? keywordScore - 5 : 0);
}

/** Matching commands, best first; ties keep their original order. */
export function rankCommands<T extends SearchableCommand>(commands: T[], query: string): T[] {
  if (!normalize(query)) return commands;
  return commands
    .map((command, index) => ({ command, index, score: scoreCommand(command, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.command);
}
