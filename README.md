# Vertex Claude Provider for Pi

Access Claude models via Google Vertex AI.

> This repository is a GitHub-only fork of `@carze/pi-vertex-claude`, which was forked from `@isaacraja/pi-vertex-claude`. It is not published as an npm package. Install this fork in Pi from the GitHub repository URL below.

## Installation

Install this fork with Pi using its GitHub URL:

```bash
pi install https://github.com/melke/pi-vertex-claude
```

If you prefer SSH:

```bash
pi install git:git@github.com:melke/pi-vertex-claude
```

To pin a specific branch, tag, or commit, append `@ref`:

```bash
pi install https://github.com/melke/pi-vertex-claude@main
```

Use `-l` if you want to add it to project-local Pi settings instead of your global Pi settings:

```bash
pi install -l https://github.com/melke/pi-vertex-claude
```

## Setup

Authenticate with Google Cloud:

```bash
gcloud auth application-default login
```

Set your project. The provider defaults to the EU multi-region endpoint; setting the location explicitly is optional but shown here for clarity.

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=eu
```

Claude Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1 use the `eu`, `us`, and `global` endpoints. Availability depends on your project and Model Garden access; specific regional endpoints such as `us-east5` do not serve these newer models.

Use the provider:

```bash
pi --provider google-vertex-claude --model claude-opus-5-5
```

## Shell Helper

Add to `~/.bashrc` or `~/.zshrc`:

```bash
piv() {
  GOOGLE_CLOUD_PROJECT=your-project-id \
  GOOGLE_CLOUD_LOCATION=eu \
  pi --provider google-vertex-claude --model claude-opus-5-5 "$@"
}
```

## Available Models

| Model | Context | Output |
|-------|---------|--------|
| `claude-opus-5-5` | 1M | 128K |
| `claude-sonnet-5-5` | 1M | 128K |
| `claude-haiku-5-5` | 1M | 128K |
| `claude-fable-5-1` | 1M | 128K |
| `claude-opus-5` | 1M | 128K |
| `claude-sonnet-5` | 1M | 128K |
| `claude-opus-4-8` | 1M | 128K |
| `claude-opus-4-7` | 1M | 128K |
| `claude-opus-4-6` | 1M | 128K |
| `claude-sonnet-4-6` | 1M | 64K |
| `claude-opus-4-5@20251101` | 200K | 32K |
| `claude-sonnet-4-5@20250929` | 200K | 64K |
| `claude-haiku-4-5@20251001` | 200K | 64K |

Model IDs and limits follow [Anthropic's Vertex AI documentation](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai).

## Current-model compatibility

Claude 5.5 models and Fable 5.1 use adaptive thinking. Pi's five reasoning levels (`minimal` through `xhigh`) map to Anthropic's `low`, `medium`, `high`, `xhigh`, and `max` effort levels.

- **Opus 5.5 and Fable 5.1:** thinking is always on. Opus 5.5 uses its default `medium` effort when no reasoning level is supplied.
- **Sonnet 5.5:** Pi's thinking-off setting uses `between_tools`, which disables up-front reasoning but retains progress updates between tool calls.
- **Haiku 5.5:** Pi's thinking-off setting sends `thinking: {type: "disabled"}`. Enabled reasoning uses adaptive thinking, not a manual token budget.

The provider strips unsupported sampling parameters on these models and uses automatic tool selection. Opus 5.5, Sonnet 5.5, and Fable 5.1 reject forced `tool_choice` values (`any` or a named tool); use `auto` or `none` in custom request paths. Haiku 5.5 permits forced tool use.

Keep conversations append-only. Editing the system prompt, tools, or earlier messages can invalidate signed thinking blocks. When switching models, the provider omits thinking blocks the target model cannot read without changing stored history. On Vertex, Opus 5.5 can read Sonnet 5.5 and Haiku 5.5 thinking; Sonnet 5.5 can read Haiku 5.5 thinking. Reverse switches discard that reasoning for the request. Sonnet 5.5 and Haiku 5.5 thinking is also account-bound. See [preserved thinking](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking).

### Pricing

Costs use [Vertex global pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing#partner-models), with a 10% premium for `eu`, `us`, and regional endpoints. Opus 5.5 costs $4 input / $20 output per million tokens; Sonnet 5.5 costs $2 / $10. Cache reads cost $0.20 and $0.10 respectively.

Haiku 5.5 costs $0.10 input / $0.50 output per million tokens for prompts up to 100K tokens, and $0.50 / $2.50 for prompts over 100K. The provider declares this request-wide pricing tier, including cache rates, so Pi's cost calculation includes cached input when selecting the tier.

## Prerequisites

- Pi 1.3.0 or newer (the provider reads prompts and tools from transcript system messages)
- Google Cloud project with Vertex AI API enabled
- Claude models enabled in [Model Garden](https://console.cloud.google.com/vertex-ai/model-garden)
- `gcloud` CLI installed

## License

MIT
