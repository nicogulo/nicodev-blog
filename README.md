# Nico's Blog - Dev Notes

Personal blog about development, tech stack, and coding journey.

## Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 7
- **Backend**: Hono
- **Markdown**: marked

## Development

```bash
# Install dependencies
bun install

# Run development server (Zo/Bun)
bun run dev

# Run with Node.js
npm run dev:node

# Build
bun run build
```

## Deployment

### Option 1: Zo Computer (Bun Runtime)

The blog is optimized for Zo Computer with Bun runtime:

```bash
bun run prod
```

Set environment variable:
```
BLOG_ADMIN_TOKEN=your_secret_token
```

### Option 2: Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nicogulo/nicodev-blog)

1. Fork or clone this repository
2. Connect to Vercel
3. Set environment variable in Vercel dashboard:
   - `BLOG_ADMIN_TOKEN` - Secret token for admin access

The API routes are located in `/api/[[...routes]].ts` using Hono with Vercel adapter.

## Project Structure

```
├── api/                    # Vercel Functions
│   └── [[...routes]].ts    # Catch-all API route
├── lib/                    # Shared utilities
│   └── posts.ts            # Post CRUD operations
├── posts/                  # Markdown blog posts
├── public/                 # Static assets
├── src/                    # React frontend
│   ├── components/         # UI components
│   └── pages/              # Page components
├── server.ts               # Zo/Bun server
├── vercel.json             # Vercel configuration
└── zosite.json             # Zo Computer config (gitignored)
```

## Admin Access

Navigate to `/admin` to manage posts. You'll need the `BLOG_ADMIN_TOKEN` to access admin features.

## Adding Posts

Posts are stored as Markdown files in `/posts/` directory with YAML frontmatter:

```markdown
---
title: Your Post Title
date: 2024-01-15
excerpt: Brief description of your post
---

Your markdown content here...
```

## License

MIT
