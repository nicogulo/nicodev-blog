import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconArrowLeft,
  IconLoader2,
  IconCalendar,
  IconEye,
  IconEyeOff,
  IconLock,
  IconLogout,
} from "@tabler/icons-react";
import { marked } from "marked";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  content?: string;
}

interface AuthStatus {
  mode: string;
  requiresAuth: boolean;
  hasToken: boolean;
}

const TOKEN_KEY = "blog_admin_token";

export default function Admin() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Auth state
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    date: new Date().toISOString().split("T")[0],
    excerpt: "",
    content: "",
  });

  // Get headers with auth token
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["X-Admin-Token"] = token;
    }
    return headers;
  };

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth-status");
        const status: AuthStatus = await res.json();
        setAuthStatus(status);

        // If production mode, check for stored token
        if (status.requiresAuth) {
          const storedToken = localStorage.getItem(TOKEN_KEY);
          if (storedToken) {
            setToken(storedToken);
            setTokenInput(storedToken);
          }
        }
      } catch (error) {
        console.error("Failed to check auth status:", error);
      }
    };

    checkAuth();
  }, []);

  // Fetch posts
  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts when auth is ready
  useEffect(() => {
    if (authStatus && (!authStatus.requiresAuth || token)) {
      fetchPosts();
    }
  }, [authStatus, token]);

  // Handle token login
  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setAuthError("Token harus diisi");
      return;
    }
    setToken(tokenInput.trim());
    localStorage.setItem(TOKEN_KEY, tokenInput.trim());
    setAuthError("");
  };

  // Handle logout
  const handleLogout = () => {
    setToken("");
    localStorage.removeItem(TOKEN_KEY);
  };

  // Open create dialog
  const handleCreate = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      slug: "",
      date: new Date().toISOString().split("T")[0],
      excerpt: "",
      content: "",
    });
    setPreviewMode(false);
    setIsDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = async (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      date: post.date,
      excerpt: post.excerpt,
      content: post.content || "",
    });
    setPreviewMode(false);
    setIsDialogOpen(true);
  };

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    setFormData((prev) => ({
      ...prev,
      title,
      slug: editingPost ? prev.slug : slug,
    }));
  };

  // Save post (create or update)
  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      alert("Judul dan slug harus diisi!");
      return;
    }

    setSaving(true);
    try {
      const url = editingPost
        ? `/api/posts/${editingPost.slug}`
        : "/api/posts";
      const method = editingPost ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          throw new Error("Token tidak valid. Silakan login ulang.");
        }
        throw new Error(data.error || "Failed to save post");
      }

      setIsDialogOpen(false);
      fetchPosts();
    } catch (error) {
      console.error("Failed to save post:", error);
      alert("Gagal menyimpan post: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Delete post
  const handleDelete = async (slug: string) => {
    try {
      const res = await fetch(`/api/posts/${slug}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          alert("Token tidak valid. Silakan login ulang.");
          return;
        }
        throw new Error("Failed to delete post");
      }

      setDeleteConfirm(null);
      fetchPosts();
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("Gagal menghapus post");
    }
  };

  // Format date to Indonesian
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Show login form if production mode and no token
  if (authStatus?.requiresAuth && !token) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-6 py-16">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <IconLock className="size-6 text-primary" />
              </div>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>
                Masukkan token admin untuk mengakses halaman ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTokenSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">Admin Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="Masukkan token..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                </div>
                {authError && (
                  <p className="text-sm text-destructive">{authError}</p>
                )}
                <Button type="submit" className="w-full">
                  Masuk
                </Button>
              </form>
              <Button
                variant="ghost"
                className="mt-4 w-full"
                onClick={() => navigate("/")}
              >
                <IconArrowLeft className="mr-2 size-4" />
                Kembali ke Blog
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
            >
              <IconArrowLeft className="mr-2 size-4" />
              Kembali ke Blog
            </Button>

            {authStatus?.requiresAuth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-auto text-muted-foreground"
              >
                <IconLogout className="mr-2 size-4" />
                Logout
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-4">
                Post Management
                {authStatus?.requiresAuth && (
                  <span className="ml-2 text-green-500">• Authenticated</span>
                )}
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Kelola Post
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {posts.length} post ditemukan
              </p>
            </div>

            <Button onClick={handleCreate} className="gap-2">
              <IconPlus className="size-4" />
              Post Baru
            </Button>
          </div>
        </header>

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Belum ada post. Buat post pertama Anda!
              </p>
              <Button onClick={handleCreate} className="gap-2">
                <IconPlus className="size-4" />
                Buat Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.slug} className="transition-colors">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <IconCalendar className="size-4" />
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                      <span className="text-muted-foreground/50">•</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {post.slug}
                      </code>
                    </div>
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    {post.excerpt && (
                      <CardDescription className="mt-2">
                        {post.excerpt}
                      </CardDescription>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(post)}
                    >
                      <IconPencil className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(post.slug)}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? "Edit Post" : "Buat Post Baru"}
              </DialogTitle>
              <DialogDescription>
                Isi form di bawah untuk {editingPost ? "mengubah" : "membuat"}{" "}
                post. Konten menggunakan format Markdown.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul</Label>
                  <Input
                    id="title"
                    placeholder="Judul post..."
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    placeholder="judul-post"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-"),
                      }))
                    }
                    disabled={!!editingPost}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt (ringkasan)</Label>
                  <Input
                    id="excerpt"
                    placeholder="Deskripsi singkat..."
                    value={formData.excerpt}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        excerpt: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Konten (Markdown)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="gap-1"
                  >
                    {previewMode ? (
                      <>
                        <IconEyeOff className="size-4" /> Edit
                      </>
                    ) : (
                      <>
                        <IconEye className="size-4" /> Preview
                      </>
                    )}
                  </Button>
                </div>

                {previewMode ? (
                  <div className="min-h-[300px] rounded-md border bg-muted/30 p-4 prose prose-sm dark:prose-invert max-w-none">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(formData.content || "*Tidak ada konten*") as string,
                      }}
                    />
                  </div>
                ) : (
                  <Textarea
                    id="content"
                    placeholder="Tulis konten dalam format Markdown..."
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    rows={15}
                    className="font-mono text-sm"
                  />
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <IconLoader2 className="mr-2 size-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingPost ? (
                  "Simpan Perubahan"
                ) : (
                  "Buat Post"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={() => setDeleteConfirm(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus Post?</DialogTitle>
              <DialogDescription>
                Tindakan ini tidak dapat dibatalkan. Post akan dihapus permanen.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              >
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
