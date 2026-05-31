// Paystack checkout (NGN). Stub until PAYSTACK_SECRET_KEY is configured.
// Returns 503 with a friendly message; UI surfaces it as a toast.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) {
    return new Response(
      JSON.stringify({
        error: "Paystack (NGN) payments aren't enabled yet. Please switch to USD, GBP or EUR, or contact support.",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Full Paystack implementation will go here once PAYSTACK_SECRET_KEY is added.
  // Initialize transaction at https://api.paystack.co/transaction/initialize, return authorization_url.
  return new Response(
    JSON.stringify({ error: "Paystack integration is configured but not yet implemented." }),
    { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
