import { getPathValue, toNumber } from './pathUtils';

const FIELD_REF_PATTERN = /\{([a-zA-Z0-9_.]+)\}/g;

/**
 * Safe arithmetic evaluator for homebrew formulas.
 * Supports numbers, + - * / ( ), and `{field.path}` references.
 * Does not use `eval`.
 */
export function evaluateFormula(expression: string, context: Record<string, unknown>): number {
  const substituted = expression.replace(FIELD_REF_PATTERN, (_match, field: string) => {
    const value = toNumber(getPathValue(context, field));
    if (value === null) {
      throw new Error(`Formula reference "{${field}}" is not numeric in: ${expression}`);
    }
    return String(value);
  });

  return evaluateArithmetic(substituted.trim());
}

function evaluateArithmetic(expr: string): number {
  const tokens = tokenize(expr);
  let pos = 0;

  function parseExpression(): number {
    let value = parseTerm();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op !== '+' && op !== '-') break;
      pos += 1;
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op !== '*' && op !== '/') break;
      pos += 1;
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseFactor(): number {
    const token = tokens[pos];
    if (token === '(') {
      pos += 1;
      const value = parseExpression();
      if (tokens[pos] !== ')') {
        throw new Error(`Expected ")" in formula near position ${pos}`);
      }
      pos += 1;
      return value;
    }
    if (token === '-') {
      pos += 1;
      return -parseFactor();
    }
    const num = Number(token);
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid numeric token "${token}" in formula`);
    }
    pos += 1;
    return num;
  }

  const result = parseExpression();
  if (pos !== tokens.length) {
    throw new Error(`Unexpected token "${tokens[pos]}" in formula`);
  }
  return result;
}

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t') {
      i += 1;
      continue;
    }
    if ('()+-*/'.includes(ch)) {
      tokens.push(ch);
      i += 1;
      continue;
    }
    if (ch === '.' || (ch >= '0' && ch <= '9')) {
      let j = i + 1;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j += 1;
      tokens.push(expr.slice(i, j));
      i = j;
      continue;
    }
    throw new Error(`Invalid character "${ch}" in formula`);
  }
  return tokens;
}
