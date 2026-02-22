import { readdir, readFile, writeFile, unlink, access } from "node:fs/promises";
import path from "node:path";

const POSTS_DIR = path.join(process.cwd(), "posts");

/**
 * Parse frontmatter from markdown content
 */
export function parseFrontmatter(content: string) {
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
export function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all posts
 */
export async function getAllPosts() {
  try {
    const files = await readdir(POSTS_DIR);
    const mdFiles = files.filter(f => f.endsWith(".md"));
    
    const posts = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = path.join(POSTS_DIR, filename);
        const content = await readFile(filePath, "utf-8");
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
    
    return posts;
  } catch (error) {
    console.error("Error reading posts:", error);
    return [];
  }
}

/**
 * Get single post by slug
 */
export async function getPostBySlug(slug: string) {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  
  try {
    if (!(await fileExists(filePath))) {
      return null;
    }
    
    const content = await readFile(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    
    return {
      slug,
      title: frontmatter.title || "Untitled",
      date: frontmatter.date || new Date().toISOString().split("T")[0],
      excerpt: frontmatter.excerpt || "",
      content: body,
    };
  } catch (error) {
    console.error("Error reading post:", error);
    return null;
  }
}

/**
 * Create new post
 */
export async function createPost(data: { title: string; slug: string; date?: string; excerpt?: string; content?: string }) {
  const { title, slug, date, excerpt, content } = data;
  
  if (!slug || !title) {
    return { error: "Slug and title are required", status: 400 };
  }
  
  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const filePath = path.join(POSTS_DIR, `${safeSlug}.md`);
  
  // Check if already exists
  if (await fileExists(filePath)) {
    return { error: "Post with this slug already exists", status: 409 };
  }
  
  const frontmatter = `---
title: ${title}
date: ${date || new Date().toISOString().split("T")[0]}
excerpt: ${excerpt || ""}
---

`;
  
  await writeFile(filePath, frontmatter + (content || ""));
  
  return { success: true, slug: safeSlug, message: "Post created successfully", status: 201 };
}

/**
 * Update existing post
 */
export async function updatePost(oldSlug: string, data: { title: string; slug?: string; date: string; excerpt?: string; content?: string }) {
  const { title, slug: newSlug, date, excerpt, content } = data;
  
  const oldPath = path.join(POSTS_DIR, `${oldSlug}.md`);
  
  if (!(await fileExists(oldPath))) {
    return { error: "Post not found", status: 404 };
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
    const newPath = path.join(POSTS_DIR, `${safeSlug}.md`);
    
    await unlink(oldPath);
    await writeFile(newPath, frontmatter + (content || ""));
    
    return { success: true, slug: safeSlug, message: "Post updated successfully" };
  }
  
  await writeFile(oldPath, frontmatter + (content || ""));
  
  return { success: true, slug: oldSlug, message: "Post updated successfully" };
}

/**
 * Delete post
 */
export async function deletePost(slug: string) {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  
  if (!(await fileExists(filePath))) {
    return { error: "Post not found", status: 404 };
  }
  
  await unlink(filePath);
  
  return { success: true, message: "Post deleted successfully" };
}
