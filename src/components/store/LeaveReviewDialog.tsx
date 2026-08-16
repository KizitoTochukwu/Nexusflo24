import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitReview } from "@/hooks/useStoreReviews";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productSlug: string;
  projectId: string;
  productName: string;
  defaultName?: string;
}

export default function LeaveReviewDialog({
  open, onOpenChange, productSlug, projectId, productName, defaultName,
}: Props) {
  const submit = useSubmitReview();
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({
    author_name: defaultName ?? "",
    business_name: "",
    title: "",
    body: "",
  });

  const handleSubmit = async () => {
    if (!form.author_name.trim()) {
      toast.error("Add the name you would like shown with your review.");
      return;
    }
    try {
      await submit.mutateAsync({
        product_slug: productSlug,
        project_id: projectId,
        rating,
        author_name: form.author_name.trim(),
        business_name: form.business_name.trim() || null,
        title: form.title.trim() || null,
        body: form.body.trim() || null,
      });
      toast.success("Thank you — your review has been sent for publishing.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not submit your review.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review {productName}</DialogTitle>
          <DialogDescription>
            Your review is checked by our team before it appears on the store page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Your rating</Label>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      value <= rating ? "fill-accent text-accent" : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="rev-name">Name shown</Label>
              <Input
                id="rev-name"
                value={form.author_name}
                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rev-business">Business (optional)</Label>
              <Input
                id="rev-business"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rev-title">Headline</Label>
            <Input
              id="rev-title"
              placeholder="Saves us hours every week"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="rev-body">Your experience</Label>
            <Textarea
              id="rev-body"
              rows={4}
              placeholder="What changed in your business after this automation went live?"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>

          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-gold-dark"
            onClick={handleSubmit}
            disabled={submit.isPending}
          >
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
