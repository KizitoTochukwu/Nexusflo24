import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, FileText, Upload, Loader2, Linkedin, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BlogContentEditor from "@/components/admin/BlogContentEditor";
import { format } from "date-fns";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  image_url: string | null;
  author: string;
  read_time: string;
  status: string;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  linkedin_shared_at: string | null;
  linkedin_post_id: string | null;
  linkedin_share_error: string | null;
};

const emptyPost = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "General",
  image_url: "",
  author: "NexusFlo24 Team",
  read_time: "5 min",
  status: "draft" as string,
  featured: false,
};

const categories = ["AI Sales Automation", "Lead Generation Systems", "Marketing Automation Tools", "Sales Funnels & Conversion", "WhatsApp & Email Automation"];

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminBlogManager = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPost);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only JPG, PNG, GIF, and WebP allowed.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("blog-assets").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("blog-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    toast({ title: "Image uploaded" });
    setUploading(false);
  };

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const shareToLinkedIn = async (postId: string, opts: { reshare?: boolean } = {}) => {
    try {
      if (opts.reshare) {
        await supabase
          .from("blog_posts")
          .update({ linkedin_shared_at: null, linkedin_post_id: null, linkedin_share_error: null })
          .eq("id", postId);
      }
      const { data, error } = await supabase.functions.invoke("share-to-linkedin", {
        body: { post_id: postId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Shared to LinkedIn ✓" });
        queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      } else if (data?.skipped) {
        toast({ title: "Already shared", description: "Use Re-share to post again." });
      } else {
        toast({ title: "LinkedIn share failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("LinkedIn share error:", err);
      toast({ title: "LinkedIn share failed", description: err.message, variant: "destructive" });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (post: typeof form & { id?: string }) => {
      const payload = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        image_url: post.image_url || null,
        author: post.author,
        read_time: post.read_time,
        status: post.status,
        featured: post.featured,
        published_at: post.status === "published" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: editingId ? "Post updated" : "Post created", description: "Newly published posts auto-share to LinkedIn." });
      resetForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: "Post deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm(emptyPost);
    setEditingId(null);
    setDialogOpen(false);
  };

  const openEdit = (post: BlogPost) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      image_url: post.image_url || "",
      author: post.author,
      read_time: post.read_time,
      status: post.status,
      featured: post.featured,
    });
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: editingId ? f.slug : slugify(title),
    }));
  };

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Blog Manager</h1>
            <p className="text-sm text-muted-foreground">Create, edit, and publish blog articles.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-gold-dark">
                <Plus className="h-4 w-4 mr-1" /> New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Post" : "New Post"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Article title" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="url-friendly-slug" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Read Time</Label>
                    <Input value={form.read_time} onChange={(e) => setForm((f) => ({ ...f, read_time: e.target.value }))} placeholder="5 min" />
                  </div>
                </div>
                <div>
                  <Label>Excerpt</Label>
                  <Textarea value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} placeholder="Short description..." rows={2} />
                </div>
                <div>
                  <Label>Cover Image</Label>
                  <div className="flex gap-2">
                    <Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://... or upload" className="flex-1" />
                    <Button type="button" variant="outline" size="icon" className="shrink-0" disabled={uploading} onClick={() => document.getElementById("blog-image-upload")?.click()}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input id="blog-image-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageUpload} />
                  </div>
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="mt-2 rounded-md max-h-32 object-cover border border-border" />
                  )}
                </div>
                <div>
                  <Label>Author</Label>
                  <Input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
                </div>
                <div>
                  <Label>Content</Label>
                  <BlogContentEditor value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
                    <Label>Featured</Label>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button onClick={() => saveMutation.mutate(form)} disabled={!form.title || !form.slug || saveMutation.isPending} className="bg-accent text-accent-foreground hover:bg-gold-dark">
                    {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-center text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No posts yet. Create your first article!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {post.featured && <Badge variant="outline" className="mr-2 text-xs">Featured</Badge>}
                        {post.title}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{post.category}</Badge></TableCell>
                      <TableCell>
                        <Badge className={post.status === "published" ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-muted text-muted-foreground"}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(post.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(post)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(post.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminBlogManager;
