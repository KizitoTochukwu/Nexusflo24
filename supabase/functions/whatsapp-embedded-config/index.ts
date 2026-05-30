// Public endpoint that returns the Meta App ID + Embedded Signup Config ID
// so the frontend can initialize FB.login(). These values are *public* by
// design (FB SDK requires them client-side); only the app secret stays server-only.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const appId = Deno.env.get("META_APP_ID") || "";
  const configId = Deno.env.get("META_EMBEDDED_SIGNUP_CONFIG_ID") || "";

  return new Response(
    JSON.stringify({
      appId,
      configId,
      configured: Boolean(appId && configId),
      graphVersion: "v21.0",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
