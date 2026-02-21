import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowLeft, Share2, User } from "lucide-react";

const articles: Record<string, { title: string; category: string; date: string; readTime: string; author: string; image: string; content: string }> = {
  "ai-marketing-trends-2026": {
    title: "Top 10 AI Marketing Trends Shaping 2026",
    category: "AI Marketing", date: "Feb 18, 2026", readTime: "6 min", author: "NexusFlo24 Team",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=500&fit=crop",
    content: `Artificial intelligence continues to reshape the marketing landscape at an unprecedented pace. As we move through 2026, several key trends are emerging that every marketer needs to understand.\n\n## 1. Hyper-Personalized Customer Journeys\nAI now enables marketers to create truly individualized experiences at scale. From dynamic email content to personalized landing pages, every touchpoint can be tailored to the individual.\n\n## 2. Predictive Lead Scoring\nMachine learning models are becoming incredibly accurate at predicting which leads are most likely to convert, allowing sales teams to focus their efforts where they matter most.\n\n## 3. Conversational AI Marketing\nChatbots and conversational AI have evolved beyond simple FAQ responses. They now handle complex sales conversations, qualify leads, and even close deals.\n\n## 4. AI-Generated Content at Scale\nContent creation tools powered by AI can now produce high-quality blog posts, social media content, and ad copy that rivals human-written content.\n\n## 5. Automated A/B Testing\nAI can now run hundreds of variations simultaneously, automatically identifying winning combinations faster than traditional A/B testing.\n\n## 6. Voice Search Optimization\nWith voice assistants becoming ubiquitous, optimizing for voice search is no longer optional.\n\n## 7. Visual AI for Ad Creative\nAI tools can now generate and optimize ad creatives based on performance data.\n\n## 8. Real-Time Campaign Optimization\nAI monitors campaign performance in real-time and makes automatic adjustments to maximize ROI.\n\n## 9. Privacy-First AI Marketing\nWith increasing privacy regulations, AI is helping marketers achieve personalization without compromising user privacy.\n\n## 10. Cross-Channel Attribution\nAI-powered attribution models provide a clearer picture of which channels and touchpoints drive conversions.\n\n---\n\nStay ahead of these trends by leveraging NexusFlo24's AI-powered marketing automation platform.`,
  },
  "automate-lead-follow-up": {
    title: "How to Automate Your Lead Follow-Up in 5 Steps", category: "Automation Tips", date: "Feb 15, 2026", readTime: "4 min", author: "NexusFlo24 Team",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=500&fit=crop",
    content: `Following up with leads is critical, but doing it manually is unsustainable as your business grows. Here's how to automate it effectively.\n\n## Step 1: Define Your Follow-Up Triggers\nIdentify the key actions that should trigger a follow-up: form submissions, page visits, email opens, or cart abandonments.\n\n## Step 2: Segment Your Leads\nNot all leads are equal. Segment them by source, behavior, and engagement level.\n\n## Step 3: Create Your Sequences\nBuild multi-step follow-up sequences that include emails, SMS, and WhatsApp messages.\n\n## Step 4: Personalize at Scale\nUse dynamic content and merge tags to make each message feel personal.\n\n## Step 5: Monitor and Optimize\nTrack open rates, reply rates, and conversion rates. Use AI to identify what's working and what isn't.\n\n---\n\nWith NexusFlo24, you can set up automated follow-up sequences in minutes.`,
  },
};

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? articles[slug] : null;

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

  return (
    <Layout>
      {/* Hero Image */}
      <div className="w-full h-64 md:h-96 overflow-hidden">
        <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
      </div>

      <article className="container max-w-3xl py-10 md:py-16">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        <Badge className="bg-accent/10 text-accent border-accent/30 mb-4">{article.category}</Badge>
        <h1 className="text-2xl md:text-4xl font-extrabold mb-4">{article.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
          <span className="flex items-center gap-1"><User className="h-4 w-4" /> {article.author}</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {article.date}</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {article.readTime}</span>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none">
          {article.content.split("\n\n").map((block, i) => {
            if (block.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-8 mb-3">{block.replace("## ", "")}</h2>;
            if (block === "---") return <hr key={i} className="my-8 border-border" />;
            return <p key={i} className="text-muted-foreground leading-relaxed mb-4">{block}</p>;
          })}
        </div>

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
