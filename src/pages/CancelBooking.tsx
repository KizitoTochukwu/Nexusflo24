import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Ban, CheckCircle2, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";

export default function CancelBooking() {
  const { token } = useParams<{ token: string }>();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState("");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const handleCancel = async () => {
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/cancel-booking`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reschedule_token: token, reason: reason || undefined }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to cancel booking");
      setCancelled(true);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-0 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            {cancelled ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            ) : (
              <Ban className="w-7 h-7 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {cancelled ? "Booking cancelled" : "Cancel your booking?"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cancelled ? (
            <>
              <p className="text-center text-muted-foreground">
                Your booking has been cancelled. A confirmation email has been sent.
              </p>
              <Link to="/" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to home
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                This will permanently cancel your appointment. The host will be notified.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Let the host know why you're cancelling…"
                  rows={3}
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleCancel}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling…</>
                ) : (
                  <>Confirm cancellation</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
