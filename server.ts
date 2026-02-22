import { serveStatic } from "hono/bun";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";
import config from "./zosite.json" assert { type: "json" };
import { Hono } from "hono";
import { getAllPosts, getPostBySlug, createPost, updatePost, deletePost } from "./lib/posts";

// AI agents: read README.md for navigation and contribution guidance.
type Mode = "development" | "production";
const app = new Hono();

const mode: Mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

const ADMIN_TOKEN = process.env.BLOG_ADMIN_TOKEN || "";

// Auth middleware
app.use("/api/posts/*", async (c, next) => {
  const method = c.req.method;
  if (method !== "POST" && method !== "PUT" && method !== "DELETE") {
    return next();
  }
  
  if (!ADMIN_TOKEN) {
    console.warn("Warning: BLOG_ADMIN_TOKEN not set. Admin endpoints are open!");
    return next();
  }

  const token = c.req.header("X-Admin-Token");
  
  if (!token || token !== ADMIN_TOKEN) {
    return c.json({ error: "Unauthorized - Invalid or missing admin token" }, 401);
  }
  
  return next();
});

// Auth status
app.get("/api/auth-status", (c) => {
  return c.json({
    mode,
    requiresAuth: !!ADMIN_TOKEN,
    hasToken: !!ADMIN_TOKEN,
  });
});

// Get all posts
app.get("/api/posts", async (c) => {
  const posts = await getAllPosts();
  return c.json({ posts });
});

// Get single post
app.get("/api/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const post = await getPostBySlug(slug);
  
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }
  
  return c.json(post);
});

// Create post
app.post("/api/posts", async (c) => {
  const body = await c.req.json();
  const result = await createPost(body);
  
  if (result.error) {
    return c.json({ error: result.error }, result.status);
  }
  
  return c.json(result, result.status);
});

// Update post
app.put("/api/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.json();
  const result = await updatePost(slug, body);
  
  if (result.error) {
    return c.json({ error: result.error }, result.status);
  }
  
  return c.json(result);
});

// Delete post
app.delete("/api/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const result = await deletePost(slug);
  
  if (result.error) {
    return c.json({ error: result.error }, result.status);
  }
  
  return c.json(result);
});

// Hello endpoint
app.get("/api/hello-zo", (c) => c.json({ msg: "Hello from Zo" }));

if (mode === "production") {
  configureProduction(app);
} else {
  await configureDevelopment(app);
}

const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : mode === "production"
    ? (config.publish?.published_port ?? config.local_port)
    : config.local_port;

export default { fetch: app.fetch, port, idleTimeout: 255 };

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
            "Cache-Control": "no-store, must-revalidate" },
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
