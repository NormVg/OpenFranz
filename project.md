# OpenFranz

OpenFranz is a personal creative intelligence agent for content creation and scriptwriting. It is designed to become a continuously evolving companion that learns the craft of content creation alongside its user.

The goal is not only to generate scripts. OpenFranz turns scattered inspiration into a searchable, connected, reusable body of creative knowledge.

## Vision

OpenFranz learns from the Instagram Reels and posts a user shares. It looks beyond the topic of a post and studies how the creator communicates:

- Hooks and attention triggers
- Story structures and narrative patterns
- Teaching and explanation techniques
- Persuasive language and emotional triggers
- Retention devices, pacing, and curiosity loops
- Calls to action, opening lines, transitions, and closing lines
- Analogies, phrases, and reusable creative patterns

It extracts these insights, organizes them into a growing knowledge library, and connects related ideas through a knowledge graph. A separate creative arsenal holds reusable writing elements that can be applied directly during content creation.

Over time, OpenFranz should also learn from the user's scripts, edits, preferences, and feedback so it can understand their writing style and creative direction.

## Product principles

- **Learn the craft, not just the topic.** A useful insight is often how something was said, not only what was said.
- **Keep knowledge reusable.** Stored material should be easy to search, recall, connect, and apply.
- **Preserve provenance.** Every learned idea should remain traceable to its source post, document, or user edit.
- **Assist, do not overwrite.** The agent supports the user's creative direction rather than replacing it.
- **Public content only.** Instagram ingestion is limited to public posts and Reels. Private posts, profiles, and stories are rejected.

## Current implementation

OpenFranz is a Nuxt 4 application with a shared workspace, an Eve agent runtime, and a Neon PostgreSQL database.

### Workspace

- Google authentication through Better Auth
- Chat, Files, Brands, and Ingest views inside one application shell
- A shared workspace with no per-user filesystem or chat isolation
- Image attachments, collapsible reasoning, response copying, stop control, and scroll management in chat

### Knowledge filesystem

The database-backed virtual filesystem stores Markdown files and their relationships.

The root contains exactly two folders:

- `/arsenal`: reusable material for creating content
- `/knowledge`: concepts and understanding that ground the agent's answers

`/arsenal` contains:

- `hooks-attention`
- `language-bank`
- `storytelling`
- `frameworks-templates`
- `creative-techniques`
- `swipe-files`

`/knowledge` contains:

- `psychology-attention`
- `writing-copywriting`
- `storytelling-retention`
- `content-strategy`
- `creative-thinking`
- `audience-insights`

Each folder has a `README.md` describing its scope. The filesystem supports fuzzy path search, outgoing links, backlinks, related-node discovery, shortest link paths, and a full knowledge graph.

### Brands

Brands store product-specific facts used during writing:

- Name, slug, summary, website, audience, and tone
- Products with descriptions, features, and pricing
- Freeform product notes

A brand can be attached beside the image button in the composer. The message carries a hidden brand marker, and the agent reads that brand before answering.

### Ingest

The Ingest view saves source material into the shared filesystem:

- Pasted text becomes a titled Markdown document
- A public URL is fetched and saved with its source URL
- Files are written under `/arsenal` or `/knowledge`
- Slugged filenames avoid overwriting existing material

### Agent capabilities

The Eve agent currently has tools for:

- Filesystem list, read, write, mkdir, move, remove, and fuzzy search
- Links, related files, shortest paths, and knowledge-graph reads
- Brand list, read, create, and update
- Ollama web search and web fetch
- Public Instagram post and Reel media URLs

Normal turns use `gpt-oss:120b-cloud`. Turns containing images use `gemma4:31b-cloud`.

## Core workflows

### Research and ingest

1. A user pastes text or a public URL.
2. OpenFranz saves it as a Markdown document in the chosen root folder.
3. The agent can search, read, and link that material in later conversations.

### Brand-aware writing

1. A user selects a brand in the composer.
2. The agent reads the brand's products, audience, tone, features, pricing, and notes.
3. It draws on relevant arsenal and knowledge files to research and write.
4. The answer stays grounded in the stored product facts.

### Instagram learning loop

The intended complete loop is:

1. A user shares a public Instagram post or Reel.
2. OpenFranz acquires the available media and metadata.
3. It analyzes the content and the creator's techniques.
4. It extracts insights, frameworks, phrases, hooks, and creative patterns.
5. It writes them into the correct arsenal or knowledge folders with source references.
6. It links related ideas into the knowledge graph.
7. It reuses that material during brainstorming and scriptwriting.

The current `instagram_media` tool completes step 1 by returning public media URLs. Transcription, visual analysis, technique extraction, and automatic library writing are still being built.

## Data model

The main database tables are:

- Better Auth `user`, `session`, `account`, and `verification`
- `chats` for shared conversations and Eve session state
- `brands` for product and brand information
- `vfs_nodes` for files and directories
- `vfs_links` for relationships between files

## Planned next steps

- Instagram media transcription and frame analysis
- Technique extraction with source citations
- Automatic filing into arsenal and knowledge folders
- Deduplication and semantic retrieval
- Personal writing-style profiles learned from scripts, edits, and feedback
- Evaluation of extraction quality and answer grounding

## Development commands

```bash
pnpm dev
pnpm test
pnpm exec nuxt typecheck
pnpm build
pnpm db:generate
pnpm db:migrate
node_modules/.bin/eve build
```

The Eve agent build must register the filesystem, brand, web, and Instagram tools before those capabilities are used in chat.
