import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, Star, Users, Zap, BarChart3, Mail, MessageCircle, Target } from "lucide-react";

const categories = [
{ icon: Zap, label: "AI Marketing", count: 8 },
{ icon: Target, label: "Funnels", count: 6 },
{ icon: Users, label: "CRM Automation", count: 5 },
{ icon: BarChart3, label: "Ads & Analytics", count: 7 },
{ icon: Mail, label: "Email Automation", count: 4 },
{ icon: MessageCircle, label: "WhatsApp Automation", count: 3 }];


const courses = [
{ title: "AI Marketing Fundamentals", category: "AI Marketing", duration: "2h 30m", lessons: 12, rating: 4.9, students: 1240, premium: false, image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=225&fit=crop" },
{ title: "Building High-Converting Funnels", category: "Funnels", duration: "3h 15m", lessons: 18, rating: 4.8, students: 890, premium: true, image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop" },
{ title: "CRM Automation Masterclass", category: "CRM Automation", duration: "4h", lessons: 24, rating: 4.7, students: 670, premium: true, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop" },
{ title: "WhatsApp Marketing 101", category: "WhatsApp Automation", duration: "1h 45m", lessons: 8, rating: 4.9, students: 2100, premium: false, image: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=400&h=225&fit=crop" },
{ title: "Facebook & Google Ads Strategy", category: "Ads & Analytics", duration: "3h 45m", lessons: 20, rating: 4.6, students: 560, premium: true, image: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=400&h=225&fit=crop" },
{ title: "Email Drip Campaigns That Convert", category: "Email Automation", duration: "2h", lessons: 10, rating: 4.8, students: 980, premium: false, image: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=400&h=225&fit=crop" }];


const testimonials = [
{ name: "Sarah M.", role: "Digital Marketer", quote: "NexusFlo24 Academy transformed how I approach AI marketing. The courses are practical and immediately applicable.", rating: 5 },
{ name: "James K.", role: "Agency Owner", quote: "The funnel building course alone paid for itself 10x over. Highly recommend to any serious marketer.", rating: 5 },
{ name: "Amina O.", role: "SaaS Founder", quote: "I automated my entire WhatsApp follow-up sequence after taking the WhatsApp Marketing course. Game changer!", rating: 5 }];


const Academy = () =>
<Layout>
    {/* Hero */}
    <section className="bg-hero py-20 md:py-28 text-center">
      <div className="container max-w-3xl">
        <Badge className="bg-accent/20 text-accent border-accent/30 mb-4">🎓 NexusFlo24 Academy</Badge>
        <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 animate-fade-up">
          Master AI Marketing <span className="text-gradient-gold">Automation</span>
        </h1>
        <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 animate-fade-up animation-delay-200">
          Learn from experts. Build real campaigns. Grow your business with AI-powered strategies.
        </p>
        <div className="flex gap-4 justify-center animate-fade-up animation-delay-400">
          <a href="https://nas.io/nexusflo24" target="_blank" rel="noopener noreferrer"><Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">Start Learning</Button></a>
          <a href="https://nas.io/nexusflo24/courses/nhza" target="_blank" rel="noopener noreferrer"><Button size="lg" variant="outline" className="border-primary-foreground/30 bg-primary-foreground text-primary">Join the Program</Button></a>
        </div>
      </div>
    </section>

    {/* Categories */}
    <section className="py-16 md:py-24 bg-surface">
      <div className="container max-w-5xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Course Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c, i) =>
        <Card key={i} className="cursor-pointer hover:shadow-card-hover transition-shadow shadow-card">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <c.icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.count} courses</p>
                </div>
              </CardContent>
            </Card>
        )}
        </div>
      </div>
    </section>

    {/* Featured Courses */}
    <section className="py-16 md:py-24">
      <div className="container max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Featured Courses</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c, i) =>
        <Card key={i} className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow group">
              <div className="relative h-44 overflow-hidden">
                <img src={c.image} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <Badge className={`absolute top-3 right-3 ${c.premium ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
                  {c.premium ? "Premium" : "Free"}
                </Badge>
                <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-12 w-12 text-primary-foreground" />
                </div>
              </div>
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs text-accent font-medium">{c.category}</p>
                <h3 className="font-semibold text-base leading-tight">{c.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {c.lessons} lessons</span>
                  <span>{c.duration}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 text-accent fill-accent" /> {c.rating}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> {c.students.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
        )}
        </div>
      </div>
    </section>

    {/* Testimonials */}
    <section className="py-16 md:py-24 bg-surface">
      <div className="container max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">What Students Say</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) =>
        <Card key={i} className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-0.5">{Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="h-4 w-4 text-accent fill-accent" />)}</div>
                <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
        )}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-hero py-16 text-center">
      <div className="container max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">Ready to Level Up Your Marketing?</h2>
        <p className="text-primary-foreground/80 mb-6">Join thousands of marketers learning AI automation with NexusFlo24 Academy.</p>
        <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">Join Academy Now</Button>
      </div>
    </section>
  </Layout>;


export default Academy;