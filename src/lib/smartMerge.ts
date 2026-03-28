/**
 * smartMerge — merges multiple starter-pack item lists without duplicates.
 * PRD §7.3: "Clicking multiple bubbles sequentially adds all items without duplicates."
 *
 * Deduplication is case-insensitive and trims whitespace.
 * Insertion order is preserved; later duplicates are discarded.
 */

/**
 * Merges `incoming` items into `existing` items, skipping any that are already
 * present (case-insensitive).
 *
 * @returns A new array — `existing` is not mutated.
 */
export function smartMerge(existing: readonly string[], incoming: readonly string[]): string[] {
  const seen = new Set(existing.map(normalizeItem))
  const result: string[] = [...existing]

  for (const item of incoming) {
    const key = normalizeItem(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }

  return result
}

/**
 * Applies multiple bubble packs sequentially into a single deduplicated list.
 * Equivalent to calling smartMerge repeatedly.
 */
export function mergeMultiplePacks(
  existing: readonly string[],
  packs: readonly (readonly string[])[],
): string[] {
  let result: string[] = [...existing]
  for (const pack of packs) {
    result = smartMerge(result, pack)
  }
  return result
}

function normalizeItem(item: string): string {
  return item.toLowerCase().trim()
}
