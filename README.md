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

Claude Fable 5.1 is available on the `eu`, `us`, and `global` endpoints.

Use the provider:

```bash
pi --provider google-vertex-claude --model claude-fable-5-1
```

## Shell Helper

Add to `~/.bashrc` or `~/.zshrc`:

```bash
piv() {
  GOOGLE_CLOUD_PROJECT=your-project-id \
  GOOGLE_CLOUD_LOCATION=eu \
  pi --provider google-vertex-claude --model claude-fable-5-1 "$@"
}
```

## Available Models

| Model | Context | Output |
|-------|---------|--------|
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

## Claude Fable 5.1 compatibility

Claude Fable 5.1 uses always-on adaptive thinking. Pi's five reasoning levels map to Anthropic's `low`, `medium`, `high`, `xhigh`, and `max` effort levels.

The provider uses automatic tool selection. Fable 5.1 rejects forced `tool_choice` values (`any` or a named tool); use `auto` or `none` in custom request paths.

Keep Fable 5.1 conversations append-only. Editing the system prompt, tools, or earlier messages can invalidate signed thinking blocks. Fable 5.1 can read thinking from earlier Claude models, but earlier models cannot read Fable 5.1 thinking; this provider omits those incompatible blocks when switching back.

## Prerequisites

- Google Cloud project with Vertex AI API enabled
- Claude models enabled in [Model Garden](https://console.cloud.google.com/vertex-ai/model-garden)
- `gcloud` CLI installed

## License

MIT
