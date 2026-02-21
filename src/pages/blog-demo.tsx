import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IconCalendar, IconArrowLeft, IconPencil, IconLoader2 } from "@tabler/icons-react";
import { marked } from "marked";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SITE_NAME = "Nico Gulo";
const SITE_DESCRIPTION = "Frontend Engineer at Reku. Writing about development, tech stack, and coding journey.";

/**
 * Blog page - reads markdown files from posts/ directory.
 * 
 * Each post is a .md file with YAML frontmatter:
 * ---
 * title: Post Title
 * date: 2025-01-15
 * excerpt: Brief description
 * ---
 * 
 * Markdown content follows...
 */

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  content?: string;
}

export default function BlogDemo() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const postSlug = params.get("post");

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all posts on mount
  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch posts:", err);
        setLoading(false);
      });
  }, []);

  // Fetch single post when postSlug changes
  useEffect(() => {
    if (postSlug) {
      setLoading(true);
      fetch(`/api/posts/${postSlug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setCurrentPost(null);
          } else {
            setCurrentPost(data);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch post:", err);
          setLoading(false);
        });
    } else {
      setCurrentPost(null);
    }
  }, [postSlug]);

  // Get base path without query params
  const basePath = location.pathname;

  // Update document title when viewing an article
  useEffect(() => {
    if (currentPost) {
      document.title = `${currentPost.title} - ${SITE_NAME}`;
    } else {
      document.title = `${SITE_NAME} - Dev Notes`;
    }
  }, [currentPost]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-16 flex items-center justify-center">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (currentPost) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate(basePath)}
          >
            <IconArrowLeft className="mr-2 size-4" />
            Back to posts
          </Button>

          <article className="prose prose-neutral dark:prose-invert max-w-none">
            <header className="mb-8">
              <Badge variant="outline" className="mb-4">
                <IconPencil className="mr-1 size-3" />
                Blog Post
              </Badge>
              <h1 className="mb-2 text-4xl font-semibold tracking-tight">
                {currentPost.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconCalendar className="size-4" />
                <time dateTime={currentPost.date}>
                  {new Date(currentPost.date).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
            </header>

            <div
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: marked.parse(currentPost.content || "") as string,
              }}
            />
          </article>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12">
          <Badge variant="outline" className="mb-4">
            Nico's Blog
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Dev Notes
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Tulisan tentang development, tech stack, dan perjalanan ngoding
          </p>
        </header>

        {posts.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-xl">Belum ada post</CardTitle>
              <CardDescription>
                Tambahkan file markdown ke folder <code>posts/</code> untuk mulai menulis.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card
                key={post.slug}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => navigate(`${basePath}?post=${post.slug}`)}
              >
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <IconCalendar className="size-4" />
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <CardTitle className="text-2xl hover:text-primary">
                    {post.title}
                  </CardTitle>
                  {post.excerpt && (
                    <CardDescription className="text-base">
                      {post.excerpt}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
