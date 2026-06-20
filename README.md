# Repo-to-Text

Turn any public GitHub repository into a **single structured text file** you can paste straight into an LLM as context. Point it at a repo, and it walks the tree, skips the noise (lock files, build output, binaries, images), and concatenates the source into one prompt-ready document.

Built with React 19, Vite, and TypeScript.

## Why

LLMs work best when you hand them the whole picture. Copy-pasting files one by one is tedious; this bundles an entire repo into clean, labeled text in one step — ready to drop into Claude, ChatGPT, or Gemini.

## Features

- **Fetches any public repo** via the GitHub API (`services/githubService.ts`)
- **Smart filtering** — ignores `node_modules`, `.git`, `dist`, lock files, and binary/asset extensions so the output stays signal-dense
- **Structured output** — each file is labeled by path, ready to paste as a prompt

## Run locally

**Prerequisite:** [Node.js](https://nodejs.org/)

```bash
npm install
# add your Gemini API key (used for the AI Studio integration)
echo "GEMINI_API_KEY=your_key_here" > .env.local
npm run dev
```

```bash
npm run build    # production build
npm run preview  # preview the build
```

## License

[MIT](LICENSE)
