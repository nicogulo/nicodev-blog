import { serveStatic } from "hono/bun";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";
import config from "./zosite.json";
import { Hono } from "hono";
import { readdir, unlink } from "node:fs/promises";

// AI agents: read README.md for navigation and contribution guidance.
type Mode = "development" | "production";
const app = new Hono();

const mode: Mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

/**
 * Admin token for write operations.
 * Set BLOG_ADMIN_TOKEN in environment to secure your blog.
 * If not set, admin endpoints will be open (not recommended for production).
 */
const ADMIN_TOKEN = process.env.BLOG_ADMIN_TOKEN || "";

/**
 * Authentication middleware for write operations.
 * Validates X-Admin-Token header against BLOG_ADMIN_TOKEN environment variable.
 * If BLOG_ADMIN_TOKEN is not set, logs warning and allows all requests.
 */
const requireAdminAuth = async (c: any, next: any) => {
  // If no token configured, allow all requests (development convenience)
  if (!ADMIN_TOKEN) {
    console.warn("Warning: BLOG_ADMIN_TOKEN not set. Admin endpoints are open!");
    return next();
  }

  // Validate token
  const token = c.req.header("X-Admin-Token");
  
  if (!token || token !== ADMIN_TOKEN) {
    return c.json({ error: "Unauthorized - Admin token required" }, 401);
  }
  
  return next();
};

// Apply auth middleware to write endpoints
app.post("/api/posts", requireAdminAuth);
app.put("/api/posts/:slug", requireAdminAuth);
app.delete("/api/posts/:slug", requireAdminAuth);

/**
 * API endpoint to check auth status (for frontend to know if token is needed)
 */
app.get("/api/auth-status", (c) => {
  return c.json({
    mode,
    requiresAuth: !!ADMIN_TOKEN, // Changed: now based on token presence, not mode
    hasToken: !!ADMIN_TOKEN,
  });
});

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
 * API: Create new post
 */
app.post("/api/posts", async (c) => {
  try {
    const { title, date, excerpt, content, slug } = await c.req.json();
    
    if (!slug || !title) {
      return c.json({ error: "Slug and title are required" }, 400);
    }
    
    const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    const filePath = `./posts/${safeSlug}.md`;
    
    // Check if already exists
    if (await Bun.file(filePath).exists()) {
      return c.json({ error: "Post with this slug already exists" }, 409);
    }
    
    const frontmatter = `---
title: ${title}
date: ${date || new Date().toISOString().split("T")[0]}
excerpt: ${excerpt || ""}
---

`;
    
    await Bun.write(filePath, frontmatter + (content || ""));
    
    return c.json({ 
      success: true, 
      slug: safeSlug,
      message: "Post created successfully" 
    }, 201);
  } catch (error) {
    console.error("Error creating post:", error);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

/**
 * API: Update existing post
 */
app.put("/api/posts/:slug", async (c) => {
  const oldSlug = c.req.param("slug");
  const { title, date, excerpt, content, slug: newSlug } = await c.req.json();
  
  try {
    const oldPath = `./posts/${oldSlug}.md`;
    
    if (!(await Bun.file(oldPath).exists())) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    const frontmatter = `---
title: ${title}
date: ${date}
excerpt: ${excerpt || ""}
---

`;
    
    // If slug changed, delete old file and create new one
    if (newSlug && newSlug !== oldSlug) {
      const safeSlug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
      const newPath = `./posts/${safeSlug}.md`;
      
      await unlink(oldPath);
      await Bun.write(newPath, frontmatter + (content || ""));
      
      return c.json({ 
        success: true, 
        slug: safeSlug,
        message: "Post updated successfully" 
      });
    }
    
    await Bun.write(oldPath, frontmatter + (content || ""));
    
    return c.json({ 
      success: true, 
      slug: oldSlug,
      message: "Post updated successfully" 
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return c.json({ error: "Failed to update post" }, 500);
  }
});

/**
 * API: Delete post
 */
app.delete("/api/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const filePath = `./posts/${slug}.md`;
  
  try {
    if (!(await Bun.file(filePath).exists())) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    await unlink(filePath);
    
    return c.json({ 
      success: true, 
      message: "Post deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return c.json({ error: "Failed to delete post" }, 500);
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
