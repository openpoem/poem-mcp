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
export declare function createSandboxServer(): Server<{
    method: string;
    params?: {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    } | undefined;
}, {
    method: string;
    params?: {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    } | undefined;
}, {
    [x: string]: unknown;
    _meta?: {
        [x: string]: unknown;
        progressToken?: string | number | undefined;
        "io.modelcontextprotocol/related-task"?: {
            taskId: string;
        } | undefined;
    } | undefined;
}>;
