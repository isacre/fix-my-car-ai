# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fix My Car AI is a conversational AI assistant for car troubleshooting. It uses a NestJS backend with a LangGraph agent (GPT-4o-mini) that queries a ChromaDB vector database (three collections: `car-data`, `car-problems`, `car-parts`) and a React frontend using the `@assistant-ui/react` library.

## Commands

All commands use `pnpm`. Run from the respective subdirectory.

**Backend (`/backend`):**
```bash
pnpm start:dev        # Dev server with hot reload (port 8001)
pnpm run build        # Compile TypeScript → dist/
pnpm start:prod       # Run compiled output
pnpm test             # Jest unit tests
pnpm test:e2e         # End-to-end tests
pnpm run lint         # ESLint with auto-fix
pnpm run ingest       # Scrape Wikipedia and populate ChromaDB
pnpm run inspect      # Inspect ChromaDB collection contents
pnpm run wipe         # Clear all ChromaDB collections
```

**Frontend (`/frontend`):**
```bash
pnpm run dev          # Vite dev server (port 5173)
pnpm run build        # Production build
pnpm run lint         # ESLint checks
pnpm run preview      # Preview production build
```

## Architecture

### Backend (NestJS)

Module dependency chain: `AppModule → ChatModule → AIModule → ChromaModule + ConfigModule`

**Request flow:**
1. `POST /chat/send-message` (ChatController) receives `{ threadId, message }`
2. AIService runs a LangGraph agent with MemorySaver (keyed by `threadId` for conversation history)
3. The agent has two tools: `search_vector_database` (queries ChromaDB) and `search_internet` (stub, returns no results)
4. System prompt (`src/ai/system_prompt.ts`) instructs the agent to gather car info (year/make/model/trim) before searching
5. Response is streamed back to the client

**Key files:**
- `src/ai/ai.service.ts` — LangGraph agent setup and `generateResponse()`
- `src/ai/tools.ts` — Tool definitions with Zod schemas
- `src/chroma/chroma.service.ts` — ChromaDB client managing 3 collections
- `src/utils/index.ts` — SHA256-based `generateID()` for document deduplication
- `src/scripts/ingest.ts` — Wikipedia scraper populating the vector DB

### Frontend (React + Vite)

- `src/contexts/RuntimeProvider.tsx` — AssistantUI runtime context; manages streaming, threadId, and message state
- `src/services/index.tsx` — `sendMessageStream()` handles streaming response parsing (JSON and plain text chunks)
- `src/components/assistant-ui/thread.tsx` — Main chat thread UI

The frontend uses `@assistant-ui/react` for the chat interface, Zustand for state, and Tailwind CSS v4 for styling. The `@` path alias resolves to `./src`.

### Environment Variables

**Backend** (`.env`):
- `OPENAI_API_KEY` — OpenAI API key
- `CHROMA_URL` — ChromaDB URL (defaults to local)
- `LANGSMITH_API_KEY`, `LANGCHAIN_PROJECT` — LangSmith tracing (optional)

**Frontend** (`.env`):
- `VITE_API_URL` — Backend URL (default: `http://localhost:8001/`)

### API

Swagger docs available at `http://localhost:8001/api` when running the dev server.