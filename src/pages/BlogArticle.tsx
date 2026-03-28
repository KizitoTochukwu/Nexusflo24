import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, ArrowLeft, Share2, User } from "lucide-react";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <Skeleton className="w-full h-64 md:h-96" />
        <div className="container max-w-3xl py-10 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist yet.</p>
          <Button asChild><Link to="/blog"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Blog</Link></Button>
        </div>
      </Layout>
    );
  }

  const shareUrl = window.location.href;
  const dateStr = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <Layout>
      {/* Hero Image */}
      {article.image_url && (
        <div className="w-full h-64 md:h-96 overflow-hidden">
          <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <article className="container max-w-3xl py-10 md:py-16">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        <Badge className="bg-accent/10 text-accent border-accent/30 mb-4">{article.category}</Badge>
        <h1 className="text-2xl md:text-4xl font-extrabold mb-4">{article.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
          <span className="flex items-center gap-1"><User className="h-4 w-4" /> {article.author}</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {dateStr}</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {article.read_time}</span>
        </div>

        {/* Content */}
        <div
          className="prose prose-slate max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-accent hover:prose-a:text-accent/80"
          dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }}
        />

        {/* Share */}
        <div className="border-t mt-12 pt-6 flex items-center gap-3">
          <span className="text-sm font-medium">Share:</span>
          <Button variant="outline" size="sm" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`, "_blank")}>Twitter</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank")}>LinkedIn</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${article.title} ${shareUrl}`)}`, "_blank")}>WhatsApp</Button>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(shareUrl); }}><Share2 className="h-4 w-4" /></Button>
        </div>
      </article>

      {/* CTA */}
      <section className="bg-hero py-12 text-center">
        <div className="container max-w-lg">
          <h2 className="text-xl md:text-2xl font-bold text-primary-foreground mb-3">Want More Insights?</h2>
          <p className="text-primary-foreground/80 mb-6 text-sm">Explore NexusFlo24 and automate your marketing today.</p>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"><Link to="/register">Get Started Free</Link></Button>
        </div>
      </section>
    </Layout>
  );
};

export default BlogArticle;
