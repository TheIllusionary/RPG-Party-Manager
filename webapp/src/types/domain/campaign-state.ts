import type {
  CustomAttributes,
  DocumentId,
  DocumentMeta,
  HomebrewRules,
  IsoTimestamp,
} from './common';
import type { Actor } from './actor';
import type { LogicBlock } from './logic-block';

/**
 * Root campaign document — document-oriented, schema-flexible persistence.
 * Replaces relational tables; nested arrays/objects map 1:1 to JSON files.
 */
export interface CampaignState extends DocumentMeta {
  name: string;
  description?: string;
  /** House rules, formulas, and tables not covered by core types. */
  homebrewRules: HomebrewRules;
  customAttributes?: CustomAttributes;
  actors: Actor[];
  logicBlocks: LogicBlock[];
  /** Active encounter id, if combat is in progress. */
  activeEncounterId?: DocumentId;
  /** Optional bridge for legacy `IAppData` during migration. */
  legacyAppData?: Record<string, unknown>;
  updatedAt: IsoTimestamp;
}
