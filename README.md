# OpenFranz

OpenFranz is a Nuxt 4 chat workspace with a Google-only Better Auth sign-in, a small landing page, and per-user chat history stored in Neon through Drizzle ORM.

## Requirements

- Node.js 22.21+, 24.11+, or 26+
- pnpm
- A Neon PostgreSQL database
- A Google OAuth web client

## Setup

```bash
pnpm install
cp .env.example .env
```

Fill in `.env` locally. Never commit it.

Required variables:

```dotenv
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
OLLAMA_API_KEY=
OLLAMA_BASE_URL=https://ollama.com
```

Add this authorized redirect URI to the Google OAuth client:

```text
http://localhost:3000/api/auth/callback/google
```

## Database

Generate migrations after changing the schema:

```bash
pnpm db:generate
```

Apply migrations to the configured Neon database:

```bash
pnpm db:migrate
```

Check connectivity:

```bash
pnpm db:check
```

## Development

```bash
pnpm dev
```

Routes:

- `/` - landing page with Google sign-in
- `/app` - authenticated chat workspace

## Verification

```bash
pnpm test
pnpm exec nuxt typecheck
pnpm build
```
