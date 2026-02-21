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

export default function Admin() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    date: new Date().toISOString().split("T")[0],
    excerpt: "",
    content: "",
  });

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

  useEffect(() => {
    fetchPosts();
  }, []);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
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
      });

      if (!res.ok) {
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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <header className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate("/")}
          >
            <IconArrowLeft className="mr-2 size-4" />
            Kembali ke Blog
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-4">
                Post Management
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
