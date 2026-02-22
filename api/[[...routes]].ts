import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getAllPosts, getPostBySlug, createPost, updatePost, deletePost } from "../lib/posts";

export const config = {
  runtime: "nodejs20.x",
};

const app = new Hono().basePath("/api");

const ADMIN_TOKEN = process.env.BLOG_ADMIN_TOKEN || "";

// Auth middleware
app.use("/posts/*", async (c, next) => {
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
app.get("/auth-status", (c) => {
  return c.json({
    mode: "production",
    requiresAuth: !!ADMIN_TOKEN,
    hasToken: !!ADMIN_TOKEN,
  });
});

// Get all posts
app.get("/posts", async (c) => {
  const posts = await getAllPosts();
  return c.json({ posts });
});

// Get single post
app.get("/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const post = await getPostBySlug(slug);
  
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }
  
  return c.json(post);
});

// Create post
app.post("/posts", async (c) => {
  const body = await c.req.json();
  const result = await createPost(body);
  
  if (result.error) {
    return c.json({ error: result.error }, result.status);
  }
  
  return c.json(result, result.status);
});

// Update post
app.put("/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.json();
  const result = await updatePost(slug, body);
  
  if (result.error) {
    return c.json({ error: result.error }, result.status);
  }
  
  return c.json(result);
});

// Delete post
app.delete("/posts/:slug", async (c) => {
  const slug = c.req.param("slug");
  const result = await deletePost(slug);
  
  if (result.error) {
    return c.json({ error: result.error }, result.status);
  }
  
  return c.json(result);
});

// Hello endpoint
app.get("/hello-zo", (c) => c.json({ msg: "Hello from Vercel" }));

export default handle(app);
