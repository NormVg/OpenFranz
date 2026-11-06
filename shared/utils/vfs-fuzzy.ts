export interface VfsFuzzyMatch {
  path: string;
  score: number;
}

export function fuzzyScore(query: string, candidate: string): number {
  const needle = query.trim().toLowerCase();
  const haystack = candidate.toLowerCase();

  if (!needle) return 0;
  if (haystack === needle) return 1000;

  const basename = haystack.slice(haystack.lastIndexOf("/") + 1);
  if (basename === needle) return 900;
  if (basename.startsWith(needle)) return 800 - basename.length * 0.01;
  if (haystack.includes(needle)) {
    return 700 - haystack.indexOf(needle) - haystack.length * 0.01;
  }

  let queryIndex = 0;
  let score = 0;
  let previousMatch = -2;

  for (let index = 0; index < haystack.length && queryIndex < needle.length; index += 1) {
    if (haystack[index] !== needle[queryIndex]) continue;

    score += 10;
    if (index === previousMatch + 1) score += 8;
    if (
      index === 0 ||
      haystack[index - 1] === "/" ||
      haystack[index - 1] === "-" ||
      haystack[index - 1] === "_" ||
      haystack[index - 1] === " "
    ) {
      score += 12;
    }

    previousMatch = index;
    queryIndex += 1;
  }

  if (queryIndex < needle.length) return 0;
  return score - haystack.length * 0.1;
}

export function rankVfsPaths(
  query: string,
  paths: string[],
  limit = 20,
): VfsFuzzyMatch[] {
  return paths
    .map((path) => ({ path, score: fuzzyScore(query, path) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, Math.min(Math.max(limit, 1), 100));
}
