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

const INSTRUCTIONS = `\
You have access to the UI AI Helper, a desktop tool that lets you see the user's \
screen and draw visual guidance on it.

Use these tools whenever the user:
- asks for help navigating a website or desktop application
- is confused about where to click, what button to press, or how to find something
- asks "where is", "how do I", "what should I click", or similar UI navigation questions
- wants you to point something out or highlight an area on screen

Typical workflow:
1. Call capture_frame to take a screenshot of the framed region on the user's screen.
2. Analyse the screenshot to understand the UI the user is looking at.
3. Call show_overlay to draw arrows, boxes, or labels that guide the user visually.
4. Explain in text what the user should do. Keep the explanation short — the visual hints do most of the work.
5. Call clear_overlay when the user is done, or set ttlMs on show_overlay to auto-clear.

The user positions the blue-bordered frame window over whatever they need help with \
before asking you a question. The frame is always on top of other windows. \
Overlay coordinates are in physical pixels relative to the top-left corner of the \
capture area, which matches the pixel space of the screenshot returned by capture_frame.

If the desktop app is not running, tool calls will fail with a clear error message. \
Tell the user to start it with: cd apps/desktop && npm run dev\
`;

const server = new Server(
  {
    name: "ui-ai-helper",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: INSTRUCTIONS,
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
