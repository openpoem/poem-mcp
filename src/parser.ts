/**
 * parser.ts - POEM Syntax Parser
 *
 * Parses .poem files into structured elements.
 * Not a compiler — a reader that understands POEM structure.
 */

export interface PoemConstant {
  kind: 'constant';
  name: string;
  value: string;
  comment?: string;
}

export interface PoemField {
  name: string;
  type: string;
  optional: boolean;
}

export interface PoemStruct {
  kind: 'struct';
  name: string;
  fields: PoemField[];
  implements?: string;
}

export interface PoemEnum {
  kind: 'enum';
  name: string;
  values: { name: string; value?: string }[];
}

export interface PoemParam {
  name: string;
  type: string;
}

export interface PoemFunction {
  kind: 'function';
  name: string;
  params: PoemParam[];
  returnType: string;
  body: string;
}

export interface PoemType {
  kind: 'type';
  name: string;
  definition: string;
}

export interface PoemVariable {
  kind: 'variable';
  name: string;
  mutable: boolean;
  type?: string;
  value: string;
}

export interface PoemTrait {
  kind: 'trait';
  name: string;
  methods: string[];
}

export type PoemElement = PoemConstant | PoemStruct | PoemEnum | PoemFunction | PoemType | PoemVariable | PoemTrait;

export interface PoemFile {
  filename?: string;
  version?: string;
  author?: string;
  elements: PoemElement[];
  raw: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    constants: number;
    structs: number;
    enums: number;
    functions: number;
    types: number;
    variables: number;
    traits: number;
    lines: number;
  };
}

/**
 * Parse a .poem file into structured elements
 */
export function parsePoemFile(source: string, filename?: string): PoemFile {
  const elements: PoemElement[] = [];
  const lines = source.split('\n');

  let version: string | undefined;
  let author: string | undefined;

  // Extract metadata from comments
  for (const line of lines) {
    const trimmed = line.trim();
    const versionMatch = trimmed.match(/^\/\/\s*version:\s*(.+)/i);
    if (versionMatch) version = versionMatch[1].trim();
    const authorMatch = trimmed.match(/^\/\/\s*author:\s*(.+)/i);
    if (authorMatch) author = authorMatch[1].trim();
  }

  // Parse constants
  const constRegex = /^const\s+(\w+)\s*=\s*(.+);/gm;
  let match;
  while ((match = constRegex.exec(source)) !== null) {
    const lineIdx = source.substring(0, match.index).split('\n').length - 1;
    const comment = extractInlineComment(lines[lineIdx]);
    elements.push({
      kind: 'constant',
      name: match[1],
      value: match[2].trim(),
      ...(comment && { comment }),
    });
  }

  // Parse type aliases
  const typeRegex = /^type\s+(\w+)\s*=\s*(.+);/gm;
  while ((match = typeRegex.exec(source)) !== null) {
    elements.push({
      kind: 'type',
      name: match[1],
      definition: match[2].trim(),
    });
  }

  // Parse enums
  const enumRegex = /^enum\s+(\w+)\s*\{([^}]+)\}/gm;
  while ((match = enumRegex.exec(source)) !== null) {
    const values = match[2].split(',').map(v => {
      const parts = v.trim().split('=').map(p => p.trim());
      return { name: parts[0], ...(parts[1] && { value: parts[1] }) };
    }).filter(v => v.name);
    elements.push({ kind: 'enum', name: match[1], values });
  }

  // Parse structs (including implements)
  const structRegex = /^struct\s+(\w+)(?:\s+implements\s+(\w+))?\s*\{([^}]+)\}/gm;
  while ((match = structRegex.exec(source)) !== null) {
    const fields = match[3].split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//') && !l.startsWith('fn '))
      .map(l => {
        const fieldMatch = l.match(/^(\w+)\s*:\s*(\w+\??(?:<[^>]+>)?(?:\[\d*\])?);?/);
        if (!fieldMatch) return null;
        const type = fieldMatch[2].replace('?', '');
        const optional = fieldMatch[2].includes('?');
        return { name: fieldMatch[1], type, optional };
      })
      .filter((f): f is PoemField => f !== null);

    elements.push({
      kind: 'struct',
      name: match[1],
      fields,
      ...(match[2] && { implements: match[2] }),
    });
  }

  // Parse functions
  const fnRegex = /^fn\s+(\w+)\s*\(([^)]*)\)\s*->\s*(\w+(?:<[^>]+>)?)\s*\{/gm;
  while ((match = fnRegex.exec(source)) !== null) {
    const params = match[2].split(',')
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        const parts = p.split(':').map(s => s.trim());
        return { name: parts[0], type: parts[1] || 'any' };
      });

    // Find matching closing brace
    const bodyStart = match.index + match[0].length;
    const body = extractBody(source, bodyStart);

    elements.push({
      kind: 'function',
      name: match[1],
      params,
      returnType: match[3],
      body: body.trim(),
    });
  }

  // Parse variables
  const varRegex = /^(let|var)\s+(\w+)(?:\s*:\s*(\S+))?\s*=\s*(.+);/gm;
  while ((match = varRegex.exec(source)) !== null) {
    elements.push({
      kind: 'variable',
      name: match[2],
      mutable: match[1] === 'var',
      ...(match[3] && { type: match[3] }),
      value: match[4].trim(),
    });
  }

  // Parse traits
  const traitRegex = /^trait\s+(\w+)\s*\{([^}]+)\}/gm;
  while ((match = traitRegex.exec(source)) !== null) {
    const methods = match[2].split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('fn '));
    elements.push({ kind: 'trait', name: match[1], methods });
  }

  return { filename, version, author, elements, raw: source };
}

/**
 * Validate a .poem file
 */
export function validatePoemFile(source: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = source.split('\n');

  let constants = 0, structs = 0, enums = 0, functions = 0, types = 0, variables = 0, traits = 0;

  // Check for basic structure
  if (!source.trim()) {
    errors.push('Empty file');
    return { valid: false, errors, warnings, stats: { constants, structs, enums, functions, types, variables, traits, lines: 0 } };
  }

  // Count and validate elements
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    if (line.startsWith('const ')) {
      constants++;
      if (!line.includes('=')) errors.push(`Line ${lineNum}: const without assignment`);
      if (!/^const\s+[A-Z_][A-Z0-9_]*\s*=/.test(line)) {
        warnings.push(`Line ${lineNum}: constants should be UPPER_SNAKE_CASE`);
      }
    }
    if (line.startsWith('struct ')) structs++;
    if (line.startsWith('enum ')) enums++;
    if (line.startsWith('fn ')) {
      functions++;
      if (!/^fn\s+[a-z_][a-z0-9_]*\s*\(/.test(line)) {
        warnings.push(`Line ${lineNum}: functions should be snake_case`);
      }
    }
    if (line.startsWith('type ')) types++;
    if (line.startsWith('let ') || line.startsWith('var ')) variables++;
    if (line.startsWith('trait ')) traits++;
  }

  // Check brace balance
  const opens = (source.match(/\{/g) || []).length;
  const closes = (source.match(/\}/g) || []).length;
  if (opens !== closes) {
    errors.push(`Brace mismatch: ${opens} opening, ${closes} closing`);
  }

  // Warnings
  if (functions === 0 && structs === 0 && constants === 0) {
    warnings.push('File has no functions, structs, or constants');
  }

  const stats = { constants, structs, enums, functions, types, variables, traits, lines: lines.length };
  return { valid: errors.length === 0, errors, warnings, stats };
}

function extractInlineComment(line: string): string | undefined {
  const match = line?.match(/\/\/\s*(.+)$/);
  return match ? match[1].trim() : undefined;
}

function extractBody(source: string, start: number): string {
  let depth = 1;
  let i = start;
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    i++;
  }
  return source.substring(start, i - 1);
}
