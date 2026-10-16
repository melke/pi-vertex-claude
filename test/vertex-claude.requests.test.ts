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

vi.mock("@earendil-works/pi-ai", () => ({
	calculateCost: () => undefined,
	createAssistantMessageEventStream: () => ({
		push(event: unknown) { mocks.events.push(event); },
		end() {},
	}),
}));

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

async function request(modelId: string, options: Record<string, unknown> = {}) {
	const model = {
		...VERTEX_CLAUDE_MODELS.find(({ id }) => id === modelId)!,
		api: "vertex-claude-api",
		provider: "google-vertex-claude",
		baseUrl: "https://aiplatform.googleapis.com",
	};
	streamVertexClaude(model, {
		systemPrompt: "Be helpful.",
		messages: [{ role: "user", content: "Say hello.", timestamp: 0 }],
		tools: [{ name: "read_file", description: "Read a file", parameters: { type: "object", properties: {} } }],
	} as any, { maxTokens: 4096, temperature: 0.5, ...options });
	await vi.waitFor(() => expect(mocks.events.at(-1)?.type).toBe("done"));
	expect(mocks.create).toHaveBeenCalledTimes(1);
	return mocks.create.mock.calls[0][0];
}

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
