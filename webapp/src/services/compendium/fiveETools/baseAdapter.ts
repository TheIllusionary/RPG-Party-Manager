import type { CompendiumProvenance, FiveEToolsSanitizerOptions } from './types';
import type { FiveEToolsSanitizer } from './sanitizer';

export abstract class FiveEToolsBaseAdapter<TRaw, TMaster> {
  constructor(protected readonly sanitizer: FiveEToolsSanitizer) {}

  /**
   * Generates a stable entity key for upserts.
   * Format: `[source]-[entityType]-[normalized-name]`
   */
  protected generateEntityKey(source: string, type: string, name: string): string {
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safeSource = source.toLowerCase();
    return `${safeSource}-${type}-${safeName}`;
  }

  /**
   * Constructs the provenance metadata block.
   */
  protected buildProvenance(sourcePath: string): CompendiumProvenance {
    return {
      provider: '5etools',
      dataPath: sourcePath,
      sourceFile: sourcePath.split('/').pop() || sourcePath,
      ingestedAt: new Date().toISOString(),
    };
  }

  /**
   * Translates common source flags.
   */
  protected extractSourceFlags(raw: { srd?: boolean; basicRules?: boolean; edition?: string }): {
    srd?: boolean;
    basicRules?: boolean;
    edition?: string;
  } {
    return {
      srd: raw.srd,
      basicRules: raw.basicRules,
      edition: raw.edition,
    };
  }

  /**
   * Convert a single raw document to a master document.
   */
  public abstract toMasterDocument(raw: TRaw): TMaster;
}
