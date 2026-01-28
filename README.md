
# Fix My Car AI
## 📽 Project Demo

[![Watch the demo](https://img.youtube.com/vi/GIsSCbKAi7U/0.jpg)](https://www.youtube.com/watch?v=GIsSCbKAi7U)

## Features

- Conversational AI agent powered by OpenAI GPT-4o-mini
- Vector database search using ChromaDB for car information
- RESTful API for chat interactions
- Data ingestion scripts for populating the knowledge base

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
OPENAI_API_KEY=your_openai_api_key
CHROMA_DB_PATH=path_to_chroma_db
```

3. Ingest car data (optional):
```bash
pnpm run ingest
```

## Running the Application

```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run start:prod
```

## API Usage

Send a POST request to `/chat/send-message`:

```json
{
  "message": "How do I fix a flat tire?",
  "threadId": "unique-thread-id"
}
```

## Scripts

- `pnpm run ingest` - Populate the database with car information
- `pnpm run inspect` - Inspect the database contents
- `pnpm run wipe` - Clear the database

## Tech Stack

- **NestJS** - Node.js framework
- **LangChain/LangGraph** - AI agent orchestration
- **ChromaDB** - Vector database
- **OpenAI** - LLM and embeddings
