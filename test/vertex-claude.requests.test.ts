import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), events: [] as any[] }));

vi.mock("@anthropic-ai/vertex-sdk", () => ({
	AnthropicVertex: class {
		messages = { create: mocks.create };
	},
}));

vi.mock("@earendil-works/pi-ai", async (importOriginal) => ({
	...await importOriginal<typeof import("@earendil-works/pi-ai")>(),
	calculateCost: () => undefined,
	createAssistantMessageEventStream: () => ({
		push(event: unknown) { mocks.events.push(event); },
		end() {},
	}),
}));

import { normalizeContext, type Context } from "@earendil-works/pi-ai";
import { streamVertexClaude, VERTEX_CLAUDE_MODELS } from "../index.js";

const dir = mkdtempSync(join(tmpdir(), "vertex-claude-requests-"));
const credentialsPath = join(dir, "adc.json");
writeFileSync(credentialsPath, "{}");
afterAll(() => rmSync(dir, { recursive: true, force: true }));
afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
	vi.stubEnv("GOOGLE_CLOUD_PROJECT", "test-project");
	vi.stubEnv("GOOGLE_CLOUD_LOCATION", "global");
	vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", credentialsPath);
	mocks.events.length = 0;
	mocks.create.mockReset();
	mocks.create.mockImplementation(() => ({
		asResponse: async () => new Response([
			{ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
			{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "hello" } },
			{ type: "content_block_stop", index: 0 },
			{ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 1 } },
		].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")),
	}));
});

const readTool = { name: "read_file", description: "Read a file", parameters: { type: "object", properties: {} } } as const;
const defaultContext: Context = {
	systemPrompt: "Be helpful.",
	messages: [{ role: "user", content: "Say hello.", timestamp: 0 }],
	tools: [readTool],
};

async function request(modelId: string, options: Record<string, unknown> = {}, context: Context = defaultContext) {
	const model = {
		...VERTEX_CLAUDE_MODELS.find(({ id }) => id === modelId)!,
		api: "vertex-claude-api",
		provider: "google-vertex-claude",
		baseUrl: "https://aiplatform.googleapis.com",
	};
	streamVertexClaude(model, normalizeContext(context), { maxTokens: 4096, temperature: 0.5, ...options });
	await vi.waitFor(() => expect(mocks.events.at(-1)?.type).toBe("done"));
	expect(mocks.create).toHaveBeenCalledTimes(1);
	return mocks.create.mock.calls[0][0];
}

describe("transcript request conversion", () => {
	it("sends instructions, cwd, and tools declared only in a system message", async () => {
		const params = await request("claude-opus-5-5", {}, {
			messages: [
				{ role: "system", content: "", sections: {
					preamble: "You are a coding assistant.", cwd: "<cwd>/test/repo</cwd>",
				}, toolsAdded: [readTool], timestamp: 0 },
				{ role: "user", content: "Look at this repo.", timestamp: 1 },
			],
		});
		expect(params.system[0].text).toContain("You are a coding assistant.");
		expect(params.system[0].text).toContain("<cwd>/test/repo</cwd>");
		expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
		expect(params.tools[0].name).toBe("read_file");
		expect(params.messages).toEqual([{ role: "user", content: "Look at this repo." }]);
	});

	it("applies later prompt patches and tool additions, removals, and redefinitions", async () => {
		const params = await request("claude-opus-5-5", {}, {
			messages: [
				{ role: "system", content: "", sections: { rules: "Old rules", obsolete: "Remove me" },
					toolsAdded: [readTool, { ...readTool, name: "removed" }], timestamp: 0 },
				{ role: "user", content: "Continue.", timestamp: 1 },
				{ role: "system", content: "", sections: { rules: "New rules", obsolete: null },
					toolsRemoved: [{ name: "removed" }, { name: "read_file" }],
					toolsAdded: [{ ...readTool, description: "Updated reader" }, { ...readTool, name: "bash" }], timestamp: 2 },
			],
		});
		expect(params.system[0].text).toContain("New rules");
		expect(params.system[0].text).not.toMatch(/Old rules|Remove me/);
		expect(params.tools.map((tool: any) => tool.name)).toEqual(["read_file", "bash"]);
		expect(params.tools[0].description).toBe("Updated reader");
		expect(params.messages).toEqual([{ role: "user", content: "Continue." }]);
	});

	it("preserves a tool-call/result round trip around a system update", async () => {
		const params = await request("claude-opus-5-5", {}, {
			messages: [
				{ role: "system", content: "Use tools.", toolsAdded: [readTool], timestamp: 0 },
				{ role: "user", content: "Read README.md", timestamp: 1 },
				{ role: "assistant", content: [{ type: "toolCall", id: "call_read", name: "read_file",
					arguments: { path: "README.md" } }], api: "vertex-claude-api", provider: "google-vertex-claude",
					model: "claude-opus-5-5", stopReason: "toolUse", timestamp: 2 } as any,
				{ role: "system", content: "Then summarize.", timestamp: 3 },
				{ role: "toolResult", toolCallId: "call_read", toolName: "read_file",
					content: [{ type: "text", text: "Repo README" }], isError: false, timestamp: 4 },
			],
		});
		expect(params.messages.map((message: any) => message.role)).toEqual(["user", "assistant", "user"]);
		expect(params.messages[1].content[0]).toMatchObject({ type: "tool_use", id: "call_read", name: "read_file" });
		expect(params.messages[2].content[0]).toMatchObject({ type: "tool_result", tool_use_id: "call_read" });
		expect(params.system[0].text).toContain("Then summarize.");
	});

	it("omits empty system and tool fields", async () => {
		const params = await request("claude-opus-5-5", {}, { messages: defaultContext.messages });
		expect(params).not.toHaveProperty("system");
		expect(params).not.toHaveProperty("tools");
	});
});

describe("Claude 5.5 streaming requests", () => {
	it.each([
		["claude-opus-5-5", { type: "adaptive", display: "summarized" }],
		["claude-sonnet-5-5", { type: "between_tools" }],
		["claude-haiku-5-5", { type: "disabled" }],
	] as const)("uses a valid default thinking configuration for %s", async (id, thinking) => {
		const params = await request(id);
		expect(params).toMatchObject({ model: id, max_tokens: 4096, stream: true, thinking });
		expect(params).not.toHaveProperty("temperature");
		expect(params).not.toHaveProperty("output_config");
		expect(params.tools[0].name).toBe("read_file");
	});

	it.each(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"])(
		"sends adaptive thinking and max effort for %s at Pi's top reasoning level",
		async (id) => {
			const params = await request(id, { reasoning: "xhigh" });
			expect(params.thinking).toEqual({ type: "adaptive", display: "summarized" });
			expect(params.output_config).toEqual({ effort: "max" });
			expect(params).not.toHaveProperty("temperature");
			expect(params.max_tokens).toBe(4096);
		},
	);

	it("keeps the legacy Haiku 4.5 request path unchanged", async () => {
		const params = await request("claude-haiku-4-5@20251001");
		expect(params).not.toHaveProperty("thinking");
		expect(params.temperature).toBe(0.5);
	});
});
