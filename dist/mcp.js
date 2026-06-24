#!/usr/bin/env node
/**
 * mcp.ts - POEM MCP Server
 *
 * Pseudo-code Oriented Executable Markup.
 * Write specs once, get code in any language.
 *
 * Tools:
 * - poem_read: Parse a .poem file into structured elements
 * - poem_validate: Check syntax and conventions
 * - poem_translate: Prepare a .poem for translation (the LLM does the actual translation)
 *
 * Origin: OpenPoem.org
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { parsePoemFile, validatePoemFile } from "./parser.js";
const POEM_SPEC_SUMMARY = `POEM Syntax Quick Reference:
- Constants: const NAME = value;
- Types: type Vec = float[4];
- Structs: struct Name { field: Type; }
- Enums: enum Name { a, b, c }
- Functions: fn name(param: Type) -> ReturnType { body }
- Variables: let x = 5 (immutable), var y = 0 (mutable)
- Collections: List<T>, Map<K,V>, Set<T>
- Control: if/else, for..in, while, return/break/continue
- Naming: UPPER_SNAKE for constants, snake_case for functions, PascalCase for types`;
const tools = [
    {
        name: 'poem_read',
        description: `Read and parse a .poem file into structured elements (constants, structs, functions, etc).
Returns the parsed structure so you can understand, discuss, or translate the spec.

Use this when someone shares a .poem file or asks about its contents.`,
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'The .poem file content' },
                filename: { type: 'string', description: 'Optional filename for context' },
            },
            required: ['source'],
        },
    },
    {
        name: 'poem_validate',
        description: `Validate a .poem file for syntax correctness and convention compliance.
Checks: brace balance, naming conventions (UPPER_SNAKE for constants, snake_case for functions, PascalCase for types), and structural completeness.

Returns errors (must fix), warnings (should fix), and stats.`,
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'The .poem file content to validate' },
            },
            required: ['source'],
        },
    },
    {
        name: 'poem_translate',
        description: `Prepare a .poem spec for translation to a target language.
Parses the POEM, validates it, and returns a structured translation brief.

YOU (the LLM) then use this brief to generate idiomatic code in the target language.
The tool handles parsing and validation. You handle the translation.

Supported targets: any programming language (python, typescript, go, rust, java, sql, swift, kotlin, etc).`,
        inputSchema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'The .poem file content' },
                target: { type: 'string', description: 'Target language (e.g. "python", "go", "typescript")' },
                filename: { type: 'string', description: 'Optional source filename' },
                style: {
                    type: 'string',
                    description: 'Optional style hints: "idiomatic" (default), "minimal", "verbose", "production"',
                },
            },
            required: ['source', 'target'],
        },
    },
];
function createServer() {
    const server = new Server({ name: 'poem-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case 'poem_read': {
                    const parsed = parsePoemFile(args?.source, args?.filename);
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify({
                                    filename: parsed.filename,
                                    version: parsed.version,
                                    author: parsed.author,
                                    elements: parsed.elements,
                                    summary: {
                                        total: parsed.elements.length,
                                        breakdown: Object.entries(parsed.elements.reduce((acc, el) => {
                                            acc[el.kind] = (acc[el.kind] || 0) + 1;
                                            return acc;
                                        }, {})),
                                    },
                                }, null, 2),
                            }],
                    };
                }
                case 'poem_validate': {
                    const result = validatePoemFile(args?.source);
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify({
                                    valid: result.valid,
                                    errors: result.errors,
                                    warnings: result.warnings,
                                    stats: result.stats,
                                    verdict: result.valid
                                        ? result.warnings.length === 0
                                            ? 'Clean — no issues found'
                                            : `Valid with ${result.warnings.length} warning(s)`
                                        : `Invalid — ${result.errors.length} error(s)`,
                                }, null, 2),
                            }],
                    };
                }
                case 'poem_translate': {
                    const source = args?.source;
                    const target = (args?.target).toLowerCase();
                    const style = args?.style || 'idiomatic';
                    const filename = args?.filename;
                    // Parse and validate first
                    const parsed = parsePoemFile(source, filename);
                    const validation = validatePoemFile(source);
                    if (!validation.valid) {
                        return {
                            content: [{
                                    type: 'text',
                                    text: JSON.stringify({
                                        error: 'POEM validation failed — fix errors before translating',
                                        errors: validation.errors,
                                    }, null, 2),
                                }],
                        };
                    }
                    // Build translation brief
                    const brief = {
                        task: `Translate this POEM spec to ${target}`,
                        target_language: target,
                        style,
                        source_filename: filename,
                        poem_version: parsed.version,
                        validation: {
                            valid: true,
                            warnings: validation.warnings,
                        },
                        elements: parsed.elements,
                        raw_poem: source,
                        instructions: [
                            `Generate idiomatic ${target} code from this POEM spec.`,
                            `Style: ${style}.`,
                            'Translate ALL elements: constants, types, structs, functions, variables.',
                            `Use ${target} naming conventions where they differ from POEM.`,
                            'Preserve all comments and documentation.',
                            'Include necessary imports/includes for the target language.',
                            'Output only the code, no explanation.',
                        ],
                        poem_to_language_mapping: getPoemMapping(target),
                        spec_reference: POEM_SPEC_SUMMARY,
                    };
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(brief, null, 2),
                            }],
                    };
                }
                default:
                    return {
                        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                        isError: true,
                    };
            }
        }
        catch (error) {
            return {
                content: [{
                        type: 'text',
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    }],
                isError: true,
            };
        }
    });
    return server;
}
/**
 * Language-specific mapping hints for the LLM
 */
function getPoemMapping(target) {
    const mappings = {
        python: {
            'struct': 'dataclass or NamedTuple',
            'fn': 'def',
            'let/var': 'variable assignment',
            'float': 'float',
            'int': 'int',
            'string': 'str',
            'bool': 'bool',
            'List<T>': 'list[T]',
            'Map<K,V>': 'dict[K,V]',
            'Set<T>': 'set[T]',
            'optional (?)': 'Optional[T] or T | None',
        },
        typescript: {
            'struct': 'interface or type',
            'fn': 'function',
            'let': 'const',
            'var': 'let',
            'float': 'number',
            'int': 'number',
            'u64': 'bigint or number',
            'string': 'string',
            'bool': 'boolean',
            'List<T>': 'T[]',
            'Map<K,V>': 'Map<K,V> or Record<K,V>',
            'Set<T>': 'Set<T>',
            'optional (?)': 'T | undefined',
        },
        go: {
            'struct': 'struct',
            'fn': 'func',
            'let/var': 'var or :=',
            'float': 'float64',
            'int': 'int64',
            'u64': 'uint64',
            'string': 'string',
            'bool': 'bool',
            'List<T>': '[]T',
            'Map<K,V>': 'map[K]V',
            'Set<T>': 'map[T]struct{}',
            'optional (?)': '*T (pointer)',
        },
        rust: {
            'struct': 'struct',
            'fn': 'fn',
            'let': 'let',
            'var': 'let mut',
            'float': 'f64',
            'int': 'i64',
            'u64': 'u64',
            'string': 'String or &str',
            'bool': 'bool',
            'List<T>': 'Vec<T>',
            'Map<K,V>': 'HashMap<K,V>',
            'Set<T>': 'HashSet<T>',
            'optional (?)': 'Option<T>',
        },
        java: {
            'struct': 'class or record',
            'fn': 'method',
            'let': 'final var',
            'var': 'var',
            'float': 'double',
            'int': 'long',
            'u64': 'long (unsigned not native)',
            'string': 'String',
            'bool': 'boolean',
            'List<T>': 'List<T>',
            'Map<K,V>': 'Map<K,V>',
            'Set<T>': 'Set<T>',
            'optional (?)': 'Optional<T>',
        },
        swift: {
            'struct': 'struct',
            'fn': 'func',
            'let': 'let',
            'var': 'var',
            'float': 'Double',
            'int': 'Int',
            'u64': 'UInt64',
            'string': 'String',
            'bool': 'Bool',
            'List<T>': '[T]',
            'Map<K,V>': '[K: V]',
            'Set<T>': 'Set<T>',
            'optional (?)': 'T?',
        },
        sql: {
            'struct': 'TABLE',
            'fn': 'FUNCTION',
            'const': 'variable or parameter',
            'float': 'DECIMAL or DOUBLE PRECISION',
            'int': 'BIGINT',
            'string': 'VARCHAR or TEXT',
            'bool': 'BOOLEAN',
            'List<T>': 'ARRAY or separate table',
            'Map<K,V>': 'JSONB or separate table',
        },
        kotlin: {
            'struct': 'data class',
            'fn': 'fun',
            'let': 'val',
            'var': 'var',
            'float': 'Double',
            'int': 'Long',
            'string': 'String',
            'bool': 'Boolean',
            'List<T>': 'List<T>',
            'Map<K,V>': 'Map<K,V>',
            'Set<T>': 'Set<T>',
            'optional (?)': 'T?',
        },
    };
    return mappings[target] || {
        note: `No specific mapping for "${target}" — use general POEM spec rules and idiomatic ${target} conventions.`,
    };
}
// Smithery sandbox support
export function createSandboxServer() {
    return createServer();
}
async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('POEM MCP server running (v1.0.0 — openpoem.org)');
}
main().catch(console.error);
//# sourceMappingURL=mcp.js.map