/**
 * Utility functions for the 5etools ETL pipeline.
 */

/**
 * Generates a unique composite key for 5etools entities to prevent namespace collisions.
 * Pattern: `name.toLowerCase()|source.toUpperCase()`
 *
 * @param name - The entity name (e.g., "Fireball")
 * @param source - The source book code (e.g., "PHB")
 * @returns The composite key (e.g., "fireball|PHB")
 */
export function generateCompositeKey(name: string, source: string): string {
  if (!name || !source) {
    throw new Error('generateCompositeKey requires both name and source');
  }
  return `${name.toLowerCase()}|${source.toUpperCase()}`;
}
