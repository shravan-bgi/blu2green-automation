/** This function returns the distinct values a set of counters is reporting. */
// A reading where every counter agrees collapses to a single value, so the spec
// asserts on the length of what comes back. The values are returned rather than a
// boolean on purpose: on failure the received array names the numbers that
// disagreed, which a boolean would throw away.
export function distinctCounts(counts: Record<string, number>): number[] {
  return [...new Set(Object.values(counts))].sort((first, second) => first - second);
}
