

## Plan: Database-Backed Blog CMS (Admin Only)

### Overview
Create a `blog_posts` table and an admin-only Blog Manager page inside the dashboard. Public Blog and BlogArticle pages will fetch from the database instead of hardcoded arrays.

### 1. Database Migration — `blog_posts` table

```sql
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  image_url text,
  author text NOT NULL DEFAULT 'NexusFlo24 Team',
  read_time text NOT NULL DEFAULT '5 min',
  status text NOT NULL DEFAULT 'draft',  -- draft | published
  featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Public can view published posts"
  ON public.blog_posts FOR SELECT TO public
  USING (status = 'published');

-- Admins have full access
CREATE POLICY "Admins can manage blog_posts"
  ON public.blog_posts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

Seed the 6 existing hardcoded posts as published rows so no content is lost.

### 2. New Page — `src/pages/admin/AdminBlogManager.tsx`

Admin-only page at `/dashboard/:workspaceId/admin/blog` with:
- Table listing all posts (title, status, category, date) with search/filter
- "New Post" button opens a create/edit form
- Form fields: title, slug (auto-generated from title), category, excerpt, image URL, content (textarea with markdown), featured toggle, status (draft/published)
- Edit and Delete actions per row
- Uses `useIsAdmin` hook for protection (already handled by `AdminGuard` route)

### 3. Route Registration — `src/App.tsx`

Add route inside the existing `AdminGuard` block:
```
<Route path="admin/blog" element={<AdminBlogManager />} />
```

### 4. Admin Sidebar Link

Add a "Blog Manager" link in the admin section of the dashboard sidebar (visible only to admins).

### 5. Refactor Public Pages

**`src/pages/Blog.tsx`** — Replace hardcoded `posts` array with a query:
```ts
supabase.from("blog_posts").select("*").eq("status", "published").order("published_at", { ascending: false })
```

**`src/pages/BlogArticle.tsx`** — Replace hardcoded `articles` map with a query by slug:
```ts
supabase.from("blog_posts").select("*").eq("slug", slug).eq("status", "published").single()
```

Both pages get loading/empty states.

### Files Modified
- **New**: `src/pages/admin/AdminBlogManager.tsx`
- **Edit**: `src/App.tsx` (add route)
- **Edit**: `src/pages/Blog.tsx` (fetch from DB)
- **Edit**: `src/pages/BlogArticle.tsx` (fetch from DB)
- **Edit**: `src/components/dashboard/DashboardLayout.tsx` (add sidebar link for admins)
- **Migration**: Create `blog_posts` table + seed data

