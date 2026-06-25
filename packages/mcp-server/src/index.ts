#!/usr/bin/env node
/**
 * UI AI Helper – MCP Server
 *
 * Exposes 5 tools so any MCP-compatible AI agent can:
 *   1. get_frame_state  – inspect the frame window position & capture area
 *   2. capture_frame    – take a screenshot of the framed region
 *   3. show_overlay     – draw arrows, boxes, labels on screen for the user
 *   4. clear_overlay    – remove all hints
 *   5. set_frame        – move / resize the frame window
 *
 * Prerequisites:
 *   • The UI AI Helper desktop app must be running (starts HTTP server on port 7765).
 *
 * Usage:
 *   node dist/index.js          (stdio transport, for MCP clients like Claude Desktop)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, handleTool } from "./tools.js";

const server = new Server(
  {
    name: "ui-ai-helper",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  return handleTool(name, args as Record<string, unknown>);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("UI AI Helper MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
