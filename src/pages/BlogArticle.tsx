import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { wsTrack } from "@/lib/analytics/workspacePixels";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  User,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  MessageCircle,
  Link2,
  ArrowRight,
} from "lucide-react";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

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
        <Skeleton className="w-full h-72 md:h-[420px]" />
        <div className="container max-w-3xl bg-slate-200 py-10 space-y-4">
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
        <div className="container py-32 text-center">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist yet.
          </p>
          <Button asChild>
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Blog
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const dateStr = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const trackShare = (network: string) => {
    wsTrack("blog_share_click", {
      network,
      post_slug: article.slug,
      post_title: article.title,
      url: shareUrl,
    });
  };

  const shareButtons = [
    {
      label: "Facebook",
      Icon: Facebook,
      onClick: () => {
        trackShare("facebook");
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank"
        );
      },
    },
    {
      label: "Twitter",
      Icon: Twitter,
      onClick: () => {
        trackShare("twitter");
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            shareUrl
          )}&text=${encodeURIComponent(article.title)}`,
          "_blank"
        );
      },
    },
    {
      label: "LinkedIn",
      Icon: Linkedin,
      onClick: () => {
        trackShare("linkedin");
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          "_blank"
        );
      },
    },
    {
      label: "WhatsApp",
      Icon: MessageCircle,
      onClick: () => {
        trackShare("whatsapp");
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${article.title} ${shareUrl}`)}`,
          "_blank"
        );
      },
    },
    {
      label: "Instagram",
      Icon: Instagram,
      onClick: () => {
        trackShare("instagram");
        window.open(`https://www.instagram.com/`, "_blank");
      },
    },
  ];

  return (
    <Layout>
      {/* Hero image */}
      <header className="relative bg-hero pt-20">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="block w-full h-auto max-h-[520px] mx-auto object-fill"
          />
        ) : (
          <div className="h-24" />
        )}
      </header>

      {/* Article body */}
      <article className="container max-w-3xl bg-slate-200 px-4 py-12 md:py-20 bg-secondary rounded-md">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        <Badge className="bg-accent text-accent-foreground hover:bg-accent border-0 mb-4 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          {article.category}
        </Badge>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground leading-[1.15] tracking-tight mb-5">
          {article.title}
        </h1>

        {article.excerpt && (
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">
            {article.excerpt}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-10 pb-6 border-b border-border">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-accent" /> {article.author}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-accent" /> {dateStr}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-accent" /> {article.read_time}
          </span>
        </div>

        <div
          className="article-body prose prose-slate prose-lg max-w-none
            prose-headings:text-foreground prose-headings:font-bold prose-headings:scroll-mt-24 prose-headings:tracking-tight
            prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-14 prose-h2:mb-5 prose-h2:pb-2 prose-h2:border-b prose-h2:border-accent/20
            prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-primary
            prose-h4:text-lg prose-h4:mt-8 prose-h4:mb-3
            prose-p:text-foreground/90 prose-p:leading-[1.85] prose-p:my-5 prose-p:text-[1.0625rem]
            prose-strong:text-foreground prose-strong:font-semibold
            prose-ul:list-disc prose-ul:pl-6 prose-ul:my-5 prose-ul:space-y-2
            prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-5 prose-ol:space-y-2
            prose-li:text-foreground/90 prose-li:leading-relaxed prose-li:marker:text-accent
            prose-a:text-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:bg-accent/5 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-md prose-blockquote:not-italic prose-blockquote:my-6
            prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
            prose-hr:my-10 prose-hr:border-border
            prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
            [&_*]:!text-inherit [&_a]:!text-accent [&_strong]:!text-foreground
            [&_h1]:!text-foreground [&_h2]:!text-foreground [&_h3]:!text-primary [&_h4]:!text-foreground"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Share row */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-md bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-primary-foreground">
                Share this article
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {shareButtons.map(({ label, Icon, onClick }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="icon"
                  onClick={onClick}
                  aria-label={`Share on ${label}`}
                  title={`Share on ${label}`}
                  className="h-9 w-9 rounded-full border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  trackShare("copy_link");
                  toast({ title: "Link copied", description: "Article URL copied to clipboard." });
                }}
                aria-label="Copy link"
                title="Copy link"
                className="h-9 w-9 rounded-full border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
              >
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </article>

      {/* CTA */}
      <section className="relative overflow-hidden bg-hero py-16 md:py-24 bg-primary">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--accent)/0.15),transparent_60%)]" />
        <div className="relative container max-w-3xl px-4 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            Ready to grow?
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-primary-foreground">
            Turn insights into <span className="text-gradient-gold">automated growth</span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-primary-foreground/80 max-w-xl mx-auto">
            Join thousands of creators and businesses automating their marketing with NexusFlo24.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold"
            >
              <Link to="/register">
                Start Free Trial <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/features">Explore Features</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BlogArticle;
