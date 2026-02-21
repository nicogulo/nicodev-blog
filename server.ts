import { serveStatic } from "hono/bun";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";
import config from "./zosite.json";
import { Hono } from "hono";
import { readdir } from "node:fs/promises";

// AI agents: read README.md for navigation and contribution guidance.
type Mode = "development" | "production";
const app = new Hono();

const mode: Mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterLines = match[1].split("\n");
  const frontmatter: Record<string, string> = {};
  
  for (const line of frontmatterLines) {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(":").trim();
    }
  }
  
  return { frontmatter, body: match[2] };
}

/**
 * Get slug from filename (remove .md extension)
 */
function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

/**
 * API: Get all posts
 */
app.get("/api/posts", async (c) => {
  try {
    const postsDir = "./posts";
    const files = await readdir(postsDir);
    const mdFiles = files.filter(f => f.endsWith(".md"));
    
    const posts = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = `${postsDir}/${filename}`;
        const content = await Bun.file(filePath).text();
        const { frontmatter, body } = parseFrontmatter(content);
        
        return {
          slug: slugFromFilename(filename),
          title: frontmatter.title || "Untitled",
          date: frontmatter.date || new Date().toISOString().split("T")[0],
          excerpt: frontmatter.excerpt || "",
          content: body,
        };
      })
    );
    
    // Sort by date descending (newest first)
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return c.json({ posts });
  } catch (error) {
    console.error("Error reading posts:", error);
    return c.json({ posts: [] });
  }
});

/**
 * API: Get single post by slug
 */
app.get("/api/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const filePath = `./posts/${slug}.md`;
  
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    const content = await file.text();
    const { frontmatter, body } = parseFrontmatter(content);
    
    return c.json({
      slug,
      title: frontmatter.title || "Untitled",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      excerpt: frontmatter.excerpt || "",
      content: body,
    });
  } catch (error) {
    console.error("Error reading post:", error);
    return c.json({ error: "Failed to read post" }, 500);
  }
});

/**
 * Add any API routes here.
 */
app.get("/api/hello-zo", (c) => c.json({ msg: "Hello from Zo" }));

if (mode === "production") {
  configureProduction(app);
} else {
  await configureDevelopment(app);
}

/**
 * Determine port based on mode. In production, use the published_port if available.
 * In development, always use the local_port.
 * Ports are managed by the system and injected via the PORT environment variable.
 */
const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : mode === "production"
    ? (config.publish?.published_port ?? config.local_port)
    : config.local_port;

export default { fetch: app.fetch, port, idleTimeout: 255 };

/**
 * Configure routing for production builds.
 *
 * - Streams prebuilt assets from `dist`.
 * - Static files from `public/` are copied to `dist/` by Vite and served at root paths.
 * - Falls back to `index.html` for any other GET so the SPA router can resolve the request.
 */
function configureProduction(app: Hono) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.get("/favicon.ico", (c) => c.redirect("/favicon.svg", 302));
  app.use(async (c, next) => {
    if (c.req.method !== "GET") return next();

    const path = c.req.path;
    if (path.startsWith("/api/") || path.startsWith("/assets/")) return next();

    const file = Bun.file(`./dist${path}`);
    if (await file.exists()) {
      const stat = await file.stat();
      if (stat && !stat.isDirectory()) {
        return new Response(file);
      }
    }

    return serveStatic({ path: "./dist/index.html" })(c, next);
  });
}

/**
 * Configure routing for development builds.
 *
 * - Boots Vite in middleware mode for transforms.
 * - Static files from `public/` are served at root paths (matching Vite convention).
 * - Mirrors production routing semantics so SPA routes behave consistently.
 */
async function configureDevelopment(app: Hono): Promise<ViteDevServer> {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
  });

  app.use("*", async (c, next) => {
    if (c.req.path.startsWith("/api/")) return next();
    if (c.req.path === "/favicon.ico") return c.redirect("/favicon.svg", 302);

    const url = c.req.path;
    try {
      if (url === "/" || url === "/index.html") {
        let template = await Bun.file("./index.html").text();
        template = await vite.transformIndexHtml(url, template);
        return c.html(template, {
          headers: { "Cache-Control": "no-store, must-revalidate" },
        });
      }

      const publicFile = Bun.file(`./public${url}`);
      if (await publicFile.exists()) {
        const stat = await publicFile.stat();
        if (stat && !stat.isDirectory()) {
          return new Response(publicFile, {
            headers: { "Cache-Control": "no-store, must-revalidate" },
          });
        }
      }

      let result;
      try {
        result = await vite.transformRequest(url);
      } catch {
        result = null;
      }

      if (result) {
        return new Response(result.code, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-store, must-revalidate",
          },
        });
      }

      let template = await Bun.file("./index.html").text();
      template = await vite.transformIndexHtml("/", template);
      return c.html(template, {
        headers: { "Cache-Control": "no-store, must-revalidate" },
      });
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error(error);
      return c.text("Internal Server Error", 500);
    }
  });

  return vite;
}
