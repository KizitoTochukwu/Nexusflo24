import { Link, useParams } from "react-router-dom";
import { Lock, Users } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StorefrontShell from "@/components/commerce/StorefrontShell";
import { usePublicStore } from "@/hooks/useStorefront";
import { usePublicCommunities } from "@/hooks/useCommunity";

export default function StorefrontCommunities() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { data: store } = usePublicStore(storeSlug);
  const { data: communities = [], isLoading } = usePublicCommunities(storeSlug);

  if (!store) return <div className="p-10"><Skeleton className="h-64" /></div>;

  return (
    <StorefrontShell store={store}>
      <Seo
        title={`Communities | ${store.name}`}
        description={`Join the ${store.name} communities and connect with other members.`}
      />
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">Communities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spaces to learn, ask questions and connect with other {store.name} members.
        </p>

        {isLoading && <Skeleton className="mt-8 h-40" />}

        {!isLoading && communities.length === 0 && (
          <div className="mt-8 rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
            No communities are open right now. Check back soon.
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {communities.map((c) => (
            <div key={c.id} className="flex flex-col rounded-2xl border bg-card p-6">
              {c.cover_url && (
                <img src={c.cover_url} alt={`${c.name} cover`} loading="lazy"
                  className="mb-4 h-32 w-full rounded-xl object-cover" />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{c.name}</h2>
                <Badge variant={c.access_type === "paid" ? "default" : "secondary"}>
                  {c.access_type === "paid" ? <><Lock className="mr-1 h-3 w-3" /> Members only</> : "Free"}
                </Badge>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {c.tagline ?? c.description ?? ""}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {c.member_count} member{c.member_count === 1 ? "" : "s"}
              </p>
              <Button asChild className="mt-4">
                <Link to={`/s/${store.slug}/community/${c.slug}`}>
                  {c.access_type === "paid" ? "View details" : "Join the conversation"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </StorefrontShell>
  );
}
