/** JSON-safe primitive values for document-oriented storage. */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

/** Opaque document identifier (UUID or slug). */
export type DocumentId = string;

/** ISO-8601 timestamp string. */
export type IsoTimestamp = string;

/** Schema version for forward-compatible migrations. */
export type SchemaVersion = number;

/** Flexible homebrew payload without `any`. */
export type HomebrewRules = Record<string, unknown>;

/** Per-entity custom fields (subclass traits, house rules, etc.). */
export type CustomAttributes = Record<string, unknown>;

export interface DocumentMeta {
  id: DocumentId;
  schemaVersion: SchemaVersion;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
