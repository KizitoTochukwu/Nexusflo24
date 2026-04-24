import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/calendar";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Google Calendar not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-auth?action=callback`;

    if (action === "start") {
      // Validate the user session
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { workspace_id, booking_page_id } = body;

      if (!workspace_id || !booking_page_id) {
        return new Response(JSON.stringify({ error: "Missing workspace_id or booking_page_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Encode state as base64 JSON (simple, no JWT library needed in Deno)
      const state = btoa(JSON.stringify({
        user_id: user.id,
        workspace_id,
        booking_page_id,
        ts: Date.now(),
      }));

      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(`<html><body><h2>Authorization denied</h2><p>${error}</p><script>window.close()</script></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      if (!code || !stateParam) {
        return new Response(`<html><body><h2>Missing parameters</h2><script>window.close()</script></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Decode state
      let state: { user_id: string; workspace_id: string; booking_page_id: string; ts: number };
      try {
        state = JSON.parse(atob(stateParam));
      } catch {
        return new Response(`<html><body><h2>Invalid state</h2><script>window.close()</script></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Check state is not too old (10 min)
      if (Date.now() - state.ts > 10 * 60 * 1000) {
        return new Response(`<html><body><h2>Link expired</h2><script>window.close()</script></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return new Response(`<html><body><h2>Token exchange failed</h2><pre>${JSON.stringify(tokenData)}</pre><script>setTimeout(()=>window.close(),5000)</script></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      // Upsert token row (one per workspace for now)
      const { data: tokenRow, error: insertErr } = await supabase
        .from("google_calendar_tokens")
        .upsert({
          workspace_id: state.workspace_id,
          user_id: state.user_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || "",
          token_expires_at: expiresAt,
          calendar_id: "primary",
        }, { onConflict: "workspace_id" })
        .select("id")
        .single();

      if (insertErr) {
        // If upsert on workspace_id doesn't work (no unique), do insert
        const { data: insertedRow, error: insertErr2 } = await supabase
          .from("google_calendar_tokens")
          .insert({
            workspace_id: state.workspace_id,
            user_id: state.user_id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || "",
            token_expires_at: expiresAt,
            calendar_id: "primary",
          })
          .select("id")
          .single();

        if (insertErr2) {
          return new Response(`<html><body><h2>Failed to store token</h2><pre>${insertErr2.message}</pre><script>setTimeout(()=>window.close(),5000)</script></body></html>`, {
            headers: { "Content-Type": "text/html" },
          });
        }

        // Link to booking page
        await supabase
          .from("booking_pages")
          .update({ google_token_id: insertedRow.id })
          .eq("id", state.booking_page_id);
      } else {
        // Link to booking page
        await supabase
          .from("booking_pages")
          .update({ google_token_id: tokenRow.id })
          .eq("id", state.booking_page_id);
      }

      // Return HTML that closes the popup and signals success
      return new Response(`
        <html><body>
          <h2>✅ Google Calendar connected!</h2>
          <p>You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "GOOGLE_CALENDAR_CONNECTED" }, "*");
            }
            setTimeout(() => window.close(), 2000);
          </script>
        </body></html>
      `, { headers: { "Content-Type": "text/html" } });
    }

    // Disconnect action (called from frontend)
    if (action === "disconnect") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { booking_page_id, token_id } = body;

      const adminSb = createClient(supabaseUrl, serviceRoleKey);

      // Unlink from booking page
      if (booking_page_id) {
        await adminSb.from("booking_pages").update({ google_token_id: null }).eq("id", booking_page_id);
      }

      // Delete token
      if (token_id) {
        await adminSb.from("google_calendar_tokens").delete().eq("id", token_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List calendars action
    if (action === "calendars") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { token_id } = body;
      if (!token_id) {
        return new Response(JSON.stringify({ error: "Missing token_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminSb = createClient(supabaseUrl, serviceRoleKey);
      const { data: tokenRow } = await adminSb
        .from("google_calendar_tokens")
        .select("*")
        .eq("id", token_id)
        .single();

      if (!tokenRow) {
        return new Response(JSON.stringify({ error: "Token not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh if needed
      let accessToken = tokenRow.access_token;
      if (new Date(tokenRow.token_expires_at) <= new Date(Date.now() + 60000)) {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: tokenRow.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const data = await res.json();
        if (res.ok && data.access_token) {
          accessToken = data.access_token;
          await adminSb
            .from("google_calendar_tokens")
            .update({ access_token: data.access_token, token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() })
            .eq("id", token_id);
        }
      }

      const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!calRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch calendars" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const calData = await calRes.json();
      const calendars = (calData.items || []).map((c: any) => ({
        id: c.id,
        summary: c.summary,
        primary: c.primary || false,
        backgroundColor: c.backgroundColor,
      }));

      return new Response(JSON.stringify({ calendars, selected: tokenRow.calendar_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Select calendar action
    if (action === "select-calendar") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { token_id, calendar_id } = body;
      if (!token_id || !calendar_id) {
        return new Response(JSON.stringify({ error: "Missing token_id or calendar_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminSb = createClient(supabaseUrl, serviceRoleKey);
      await adminSb
        .from("google_calendar_tokens")
        .update({ calendar_id })
        .eq("id", token_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
