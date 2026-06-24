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
    values: {
        name: string;
        value?: string;
    }[];
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
export declare function parsePoemFile(source: string, filename?: string): PoemFile;
/**
 * Validate a .poem file
 */
export declare function validatePoemFile(source: string): ValidationResult;
