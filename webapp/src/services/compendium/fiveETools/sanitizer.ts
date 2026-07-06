import type {
  FiveEEntry,
  FiveEEntryObject,
  FiveETagContext,
  FiveETagHandler,
  FiveEToolsSanitizerOptions,
  ParsedInlineTag,
  ParseEntriesResult,
  SanitizedText,
} from './types';

/** Captura tags `{@tag}` ou `{@tag body}`. */
export const FIVEE_TAG_PATTERN = /\{@([a-zA-Z0-9]+)\s+([^}]*)\}|\{@([a-zA-Z0-9]+)\}/g;

const REFERENCE_TAGS = new Set([
  'spell',
  'item',
  'creature',
  'class',
  'classfeature',
  'subclassfeature',
  'feat',
  'race',
  'background',
  'object',
  'optfeature',
  'action',
  'condition',
  'status',
  'skill',
  'sense',
  'language',
  'deity',
  'disease',
  'reward',
  'trap',
  'hazard',
  'vehicle',
  'table',
  'variantrule',
]);

const FORMATTING_TAGS = new Set(['b', 'bold', 'i', 'italic', 's']);

const ATK_LABELS: Record<string, string> = {
  mw: 'Melee Weapon Attack',
  rw: 'Ranged Weapon Attack',
  ms: 'Melee Spell Attack',
  rs: 'Ranged Spell Attack',
  m: 'Melee',
  r: 'Ranged',
  a: 'Area',
  w: 'Weapon',
  s: 'Spell',
};

function splitTagPayload(raw: string): string[] {
  return raw.split('|').map((s) => s.trim());
}

function mergeSanitized(parts: SanitizedText[]): SanitizedText {
  return {
    plainText: parts.map((p) => p.plainText).filter(Boolean).join('\n\n'),
    markdown: parts.some((p) => p.markdown)
      ? parts.map((p) => p.markdown ?? p.plainText).filter(Boolean).join('\n\n')
      : undefined,
    tags: parts.flatMap((p) => p.tags),
  };
}

function emptySanitized(): SanitizedText {
  return { plainText: '', tags: [] };
}

export class FiveEToolsSanitizer {
  private readonly defaultSource: string;
  private readonly outputFormat: 'plain' | 'markdown' | 'both';
  private readonly extractRefs: boolean;
  private readonly tagHandlers: Partial<Record<string, FiveETagHandler>>;

  constructor(options?: FiveEToolsSanitizerOptions) {
    this.defaultSource = options?.defaultSource ?? 'PHB';
    this.outputFormat = options?.outputFormat ?? 'plain';
    this.extractRefs = options?.extractRefs ?? true;
    this.tagHandlers = options?.tagHandlers ?? {};
  }

  parseInlineTags(input: string, ctx?: FiveETagContext): SanitizedText {
    if (!input) return emptySanitized();

    const context: FiveETagContext = {
      defaultSource: ctx?.defaultSource ?? this.defaultSource,
      entityType: ctx?.entityType,
    };

    const tags: ParsedInlineTag[] = [];
    let plainText = '';
    let markdownText = '';
    let lastIndex = 0;

    const pattern = new RegExp(FIVEE_TAG_PATTERN.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(input)) !== null) {
      plainText += input.slice(lastIndex, match.index);
      if (this.outputFormat !== 'plain') {
        markdownText += input.slice(lastIndex, match.index);
      }

      const tagName = (match[1] ?? match[3] ?? '').toLowerCase();
      const payload = match[2] ?? '';
      const raw = match[0];
      const segments = payload ? splitTagPayload(payload) : [];

      const customHandler = this.tagHandlers[tagName];
      if (customHandler) {
        const result = customHandler(tagName, segments, raw, context);
        const resolved = typeof result === 'string' ? { plainText: result, tags: [] } : result;
        plainText += resolved.plainText;
        if (this.outputFormat !== 'plain') {
          markdownText += resolved.markdown ?? resolved.plainText;
        }
        tags.push(...resolved.tags);
      } else {
        const parsed = this.resolveTag(tagName, segments, raw, context);
        plainText += parsed.displayText;
        if (this.outputFormat !== 'plain') {
          markdownText += parsed.markdownText ?? parsed.displayText;
        }
        if (this.extractRefs) tags.push(parsed.parsed);
      }

      lastIndex = pattern.lastIndex;
    }

    plainText += input.slice(lastIndex);
    if (this.outputFormat !== 'plain') {
      markdownText += input.slice(lastIndex);
    }

    return {
      plainText: plainText.replace(/\s{2,}/g, ' ').trim(),
      markdown:
        this.outputFormat === 'plain'
          ? undefined
          : (markdownText.replace(/\s{2,}/g, ' ').trim() || undefined),
      tags,
    };
  }

  parseEntries(entries: FiveEEntry | undefined, ctx?: FiveETagContext): ParseEntriesResult {
    if (entries == null) {
      return { blocks: [], merged: emptySanitized() };
    }

    const blocks: ParseEntriesResult['blocks'] = [];

    const walk = (node: FiveEEntry): SanitizedText => {
      if (typeof node === 'string') {
        return this.parseInlineTags(node, ctx);
      }
      if (Array.isArray(node)) {
        return mergeSanitized(node.map(walk));
      }
      return this.parseEntryObject(node, ctx);
    };

    if (typeof entries === 'string' || Array.isArray(entries)) {
      const merged = walk(entries);
      return { blocks, merged };
    }

    const merged = this.parseEntryObject(entries, ctx);
    blocks.push({ type: entries.type, name: entries.name, body: merged });
    return { blocks, merged };
  }

  stripDamageTags(text: string): string {
    return text
      .replace(/\{@damage\s+([^}|]+)(?:\|[^}]*)?\}/gi, '$1')
      .replace(/\{@scaledamage\s+([^|}]+)\|([^|}]+)\|([^}]+)\}/gi, '$1');
  }

  stripDiceTags(text: string): string {
    return text.replace(/\{@dice\s+([^}|]+)(?:\|([^}|]+))?(?:\|[^}]*)?\}/gi, (_m, _a, display) =>
      display ? String(display).trim() : String(_a).trim(),
    );
  }

  stripConditionTags(text: string): string {
    return text
      .replace(/\{@condition\s+([^|}\s]+)(?:\|[^}]*)?\}/gi, '$1')
      .replace(/\{@status\s+([^|}\s]+)(?:\|[^}]*)?\}/gi, '$1');
  }

  stripFormattingTags(text: string): string {
    return text.replace(/\{@(?:b|bold|i|italic|s)\s+([^}]+)\}/gi, '$1');
  }

  parseAtkTag(payload: string): string {
    const codes = payload.split(',').map((c) => c.trim().toLowerCase());
    const labels = codes.map((code) => ATK_LABELS[code] ?? code.toUpperCase());
    if (labels.length === 1) return `${labels[0]}:`;
    return `${labels.join(' or ')}:`;
  }

  parseHitTag(modifier: string): string {
    const trimmed = modifier.trim();
    if (!trimmed) return 'Hit:';
    const normalized = trimmed.startsWith('+') || trimmed.startsWith('-') ? trimmed : `+${trimmed}`;
    return `${normalized} to hit`;
  }

  parseScaledDamageTag(segments: string[]): { base: string; slotRange?: string; perSlot?: string } {
    return {
      base: segments[0] ?? '',
      slotRange: segments[1],
      perSlot: segments[2],
    };
  }

  parseReferenceTag(tag: string, segments: string[]): ParsedInlineTag {
    const displayText = segments[2] ?? segments[0] ?? '';
    const name = segments[0];
    const source = segments[1]?.toUpperCase();

    type RefKind = NonNullable<ParsedInlineTag['ref']>['kind'];
    let kind: RefKind = 'unknown';

    if (tag === 'spell') kind = 'spell';
    else if (tag === 'item') kind = 'item';
    else if (tag === 'creature') kind = 'monster';
    else if (tag === 'class') kind = 'class';
    else if (tag === 'feat') kind = 'feat';
    else if (tag === 'race') kind = 'race';
    else if (tag === 'condition' || tag === 'status') kind = 'condition';
    else if (tag === 'skill') kind = 'skill';

    return {
      tag,
      raw: `{@${tag} ${segments.join('|')}}`,
      segments,
      displayText,
      ref: { kind, name, source },
    };
  }

  private parseEntryObject(obj: FiveEEntryObject, ctx?: FiveETagContext): SanitizedText {
    let inner = emptySanitized();
    
    if (obj.type === 'list' && obj.items) {
      const listItems = obj.items.map((item: any) => {
         const parsed = this.parseEntries(item as any, ctx).merged;
         return {
            plainText: `- ${parsed.plainText}`,
            markdown: `- ${parsed.markdown || parsed.plainText}`,
            tags: parsed.tags
         };
      });
      inner = {
         plainText: listItems.map(l => l.plainText).join('\n'),
         markdown: listItems.map(l => l.markdown).join('\n'),
         tags: listItems.flatMap(l => l.tags)
      };
    } else if (obj.type === 'table' && obj.rows) {
      const header = obj.colLabels ? `| ${obj.colLabels.join(' | ')} |\n| ${obj.colLabels.map(() => '---').join(' | ')} |\n` : '';
      const rows = obj.rows.map((r: any) => {
         const rowArr = Array.isArray(r) ? r : (r.row || []);
         const cells = rowArr.map((c: any) => {
            if (typeof c === 'string') return this.parseInlineTags(c, ctx).plainText.replace(/\n/g, ' ');
            if (c.entry) return this.parseEntries(c.entry as any, ctx).merged.plainText.replace(/\n/g, ' ');
            if (c.exactRoll !== undefined) return String(c.exactRoll);
            if (c.min !== undefined && c.max !== undefined) return `${c.min}-${c.max}`;
            return '';
         });
         return `| ${cells.join(' | ')} |`;
      });
      const tableMd = header + rows.join('\n');
      inner = {
         plainText: tableMd,
         markdown: tableMd,
         tags: []
      };
    } else if ((obj.type === 'quote' || obj.type === 'inset') && obj.entries) {
      const q = this.parseEntries(obj.entries, ctx).merged;
      const wrap = (t: string) => t.split('\n').filter(Boolean).map((l: string) => `> ${l}`).join('\n');
      inner = {
         plainText: wrap(q.plainText),
         markdown: wrap(q.markdown || q.plainText),
         tags: q.tags
      };
    } else if (obj.entries != null) {
      inner = this.parseEntries(obj.entries, ctx).merged;
    }

    if (obj.name && inner.plainText) {
      return {
        plainText: `${obj.name}. ${inner.plainText}`,
        markdown: `**${obj.name}.** ${inner.markdown || inner.plainText}`,
        tags: inner.tags,
      };
    }

    return inner;
  }

  private resolveTag(
    tagName: string,
    segments: string[],
    raw: string,
    ctx: FiveETagContext,
  ): { displayText: string; markdownText?: string; parsed: ParsedInlineTag } {
    if (FORMATTING_TAGS.has(tagName)) {
      const text = segments[0] ?? '';
      const markdown =
        tagName === 'b' || tagName === 'bold'
          ? `**${text}**`
          : tagName === 's'
            ? `~~${text}~~`
            : `*${text}*`;
      return {
        displayText: text,
        markdownText: this.outputFormat !== 'plain' ? markdown : undefined,
        parsed: { tag: tagName, raw, segments, displayText: text },
      };
    }

    if (tagName === 'damage') {
      const formula = segments[0] ?? '';
      return {
        displayText: formula,
        parsed: {
          tag: tagName,
          raw,
          segments,
          displayText: formula,
          ref: { kind: 'damage', name: formula },
        },
      };
    }

    if (tagName === 'dice') {
      const formula = segments[1] ?? segments[0] ?? '';
      return {
        displayText: formula,
        parsed: {
          tag: tagName,
          raw,
          segments,
          displayText: formula,
          ref: { kind: 'dice', name: formula },
        },
      };
    }

    if (tagName === 'hit') {
      const displayText = this.parseHitTag(segments[0] ?? '');
      return {
        displayText,
        parsed: { tag: tagName, raw, segments, displayText },
      };
    }

    if (tagName === 'h') {
      return {
        displayText: 'Hit: ',
        parsed: { tag: tagName, raw, segments, displayText: 'Hit: ' },
      };
    }

    if (tagName === 'atk') {
      const displayText = this.parseAtkTag(segments[0] ?? '');
      return {
        displayText,
        parsed: { tag: tagName, raw, segments, displayText },
      };
    }

    if (tagName === 'scaledamage') {
      const scaled = this.parseScaledDamageTag(segments);
      let displayText = scaled.base;
      if (scaled.slotRange && scaled.perSlot) {
        displayText = `${scaled.base} (+${scaled.perSlot} per slot level above ${scaled.slotRange.split('-')[0]})`;
      }
      return {
        displayText,
        parsed: { tag: tagName, raw, segments, displayText, ref: { kind: 'damage', name: scaled.base } },
      };
    }

    if (tagName === 'recharge') {
      const n = segments[0] ?? '';
      const displayText = `(Recharge ${n})`;
      return { displayText, parsed: { tag: tagName, raw, segments, displayText } };
    }

    if (tagName === 'd20') {
      return {
        displayText: 'd20',
        parsed: { tag: tagName, raw, segments, displayText: 'd20', ref: { kind: 'dice', name: 'd20' } },
      };
    }

    if (tagName === 'dc') {
      const displayText = segments[0] ?? 'DC';
      return { displayText, parsed: { tag: tagName, raw, segments, displayText } };
    }

    if (REFERENCE_TAGS.has(tagName)) {
      const parsed = this.parseReferenceTag(tagName, segments);
      if (!parsed.ref?.source && segments.length === 1 && ctx.defaultSource) {
        parsed.ref = { ...parsed.ref!, source: ctx.defaultSource };
      }
      return { displayText: parsed.displayText, parsed };
    }

    if (tagName === 'filter') {
      const displayText = segments[0] ?? '';
      return { displayText, parsed: { tag: tagName, raw, segments, displayText } };
    }

    const fallback = segments[2] ?? segments[0] ?? raw;
    return {
      displayText: fallback,
      parsed: { tag: tagName, raw, segments, displayText: fallback, ref: { kind: 'unknown' } },
    };
  }
}

/** Normaliza chave composta name|SOURCE para mapas fluff/sources. */
export function fiveEEntityMapKey(name: string, source: string): string {
  return `${name}|${source.toUpperCase()}`;
}

export function slugifyEntityId(name: string, source: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `5etools_spell_${slug}_${source.toLowerCase()}`;
}
