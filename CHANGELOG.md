# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Claude Opus 5.5 (`claude-opus-5-5`), Sonnet 5.5 (`claude-sonnet-5-5`), and Haiku 5.5 (`claude-haiku-5-5`) with 1M context, 128K output, adaptive thinking, explicit Pi effort mappings, and current Vertex pricing.
- Haiku 5.5 request-wide pricing for prompts over 100K tokens, including cached input and the regional premium.
- Model-specific lowest thinking settings: always-on adaptive thinking for Opus 5.5, `between_tools` for Sonnet 5.5, and `disabled` for Haiku 5.5.
- Claude Fable 5.1 (`claude-fable-5-1`) with a 1M context window, 128K output, adaptive thinking, and Vertex global pricing ($10 input / $50 output / $0.25 cache read / $12.50 5-minute cache write per MTok).
- Claude Opus 4.8 (`claude-opus-4-8`) with the same 1M context / 128K output profile and Opus 4.7+ request handling.
- Explicit Opus 4.7/4.8 thinking metadata and shifted adaptive effort mapping so the top UI effort reaches Anthropic's `max` effort.

### Fixed
- Apply Claude 5.5 sampling restrictions, reject forced tool use on Opus/Sonnet 5.5, and respect Vertex's directional thinking-block compatibility when switching models.
- Preserve signed thinking blocks even when their display text is empty or whitespace-only, as required by current Claude tool-use loops.
- Apply Fable 5.1 request restrictions: strip unsupported sampling parameters, reject forced tool choices, and omit its one-way thinking blocks when switching back to an earlier Claude model.
- Use the explicit `$ENV_VAR` provider `apiKey` syntax required by newer Pi versions.
- Create assistant streams through Pi's extension-safe `createAssistantMessageEventStream` factory and accept both string and string-array system prompts for newer/forked Pi runtimes.
- Remove deprecated Anthropic beta headers; fine-grained tool streaming is configured per tool and interleaved thinking is GA for adaptive-thinking models.
- Validate Vertex AI region values and pass an explicit Google Vertex base URL to prevent malicious env/settings values from redirecting requests off `googleapis.com`.

### Changed
- Use Opus 5.5 in usage examples and Haiku 5.5 in the optional ADC integration smoke test; keep all previously registered models available.
- Default Vertex requests to the EU multi-region endpoint (`eu`) when no location is configured, and apply Google's regional 10% premium to displayed model costs outside the global endpoint.
- Switch Pi peer dependencies/imports from deprecated `@mariozechner/*` packages to `@earendil-works/*`.
- Mark this extension fork as GitHub-only/private; it does not exist as an npm package, so Pi installation is documented via the GitHub repository URL.
- Upgrade `@anthropic-ai/sdk` to `^0.135.0` and `@anthropic-ai/vertex-sdk` to `^0.21.0` for Claude 5.5 request types (including `between_tools`); use Vitest `^3.2.7` for the current Pi runtime ecosystem.

## [0.1.7] - 2026-04-30

### Fixed
- "Invalid `signature` in `thinking` block" 400 from Vertex when swapping providers mid-conversation (e.g. Claude → ChatGPT → Kimi → Claude). Thinking-signature passthrough is now gated on `api`+`provider` match; foreign turns are rewrapped as text inside `<external-reasoning>` tags so Claude reads them as outside context. Same-provider signed thinking is now passed unsanitized so the signed bytes match what Anthropic verifies.
- Integration smoke test switched from retired `claude-3-5-haiku@20241022` to `claude-haiku-4-5@20251001`.

## [0.1.6] - 2026-04-27

### Added
- Cascade Vertex config from `.claude/settings.{local,}.json` so `claude-code-templates --setting=api/vertex-configuration` can drive the plugin without exporting env vars.

## [0.1.5] - 2026-04-24

### Fixed
- Strip non-default sampling params (`temperature`, `top_p`, `top_k`) for Opus 4.7, which now rejects them with a 400.

### Changed
- Bump `@anthropic-ai/sdk` to `^0.90.0`.

## [0.1.4] - 2026-04-22

### Added
- Claude Opus 4.7 (`claude-opus-4-7`) with adaptive thinking and `output_config.effort` mapping.
- Claude Sonnet 4.6 (`claude-sonnet-4-6`) and 1M context windows on Opus 4.7 / Sonnet 4.6 / Opus 4.6.
- Per-tool `eager_input_streaming` (replaces deprecated `fine-grained-tool-streaming-2025-05-14` beta header).

### Fixed
- Own the Anthropic SSE parsing loop to repair malformed tool JSON (raw control characters, invalid `\` escapes) that the SDK's `JSON.parse` would otherwise reject.
- Normalize `tool_use.id` and `tool_use_id` to Anthropic's `^[a-zA-Z0-9_-]+` pattern (max 64 chars).
- Synthesize a "No result provided" `tool_result` for orphaned `tool_use` blocks left behind by aborted turns.
- Pin Opus 4.7 thinking `display` to `summarized` to keep `tool_use` partial_json delivery intact.

### Changed
- Upgrade `@anthropic-ai/vertex-sdk` to `0.16.0`.
- Rebrand package to `@carze` scope.
- Extract `buildThinkingConfig` helper and expand its test coverage.

## [0.1.3] - 2026-02-07

### Added
- Support for Claude Opus 4.6 model (`claude-opus-4-6`)

## [0.1.2] - 2025-01-30

### Changed
- Further simplified README - removed Features and Common Issues sections
- Cleaner title and structure following Pi extension conventions
- Removed copyright from LICENSE and README

### Removed
- GitHub Actions workflow (tests need peer dependencies)

## [0.1.1] - 2025-01-30

### Changed
- Simplified README - removed unnecessary sections (pricing, fish shell, excessive troubleshooting)
- Cleaner, more focused documentation

## [0.1.0] - 2025-01-30

### Added
- Initial release
- Support for all Vertex AI Claude models (Opus, Sonnet, Haiku)
- Full streaming support
- Extended thinking for reasoning models
- Tool/function calling support
- Image input support
- Prompt caching
- Token usage tracking and cost calculation
- Comprehensive test suite
- NPM and GitHub distribution
