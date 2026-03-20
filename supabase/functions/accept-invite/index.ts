import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("<h2>Invalid invitation link</h2>", { status: 400, headers: { "Content-Type": "text/html" } });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find invite
    const { data: invite, error } = await adminClient
      .from("workspace_invites")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (error || !invite) {
      return new Response("<h2>Invitation not found or expired</h2><p>Please request a new invitation.</p>", { status: 404, headers: { "Content-Type": "text/html" } });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      await adminClient.from("workspace_invites").update({ status: "expired" }).eq("id", invite.id);
      return new Response("<h2>Invitation expired</h2><p>Please request a new invitation.</p>", { status: 410, headers: { "Content-Type": "text/html" } });
    }

    // Find user by email
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", invite.email)
      .maybeSingle();

    if (!profile) {
      // Redirect to register with prefilled email
      const registerUrl = `${url.origin}/register?email=${encodeURIComponent(invite.email)}&invite=${token}`;
      return Response.redirect(registerUrl, 302);
    }

    // Check if already a member
    const { data: existing } = await adminClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!existing) {
      await adminClient.from("workspace_members").insert({
        workspace_id: invite.workspace_id,
        user_id: profile.id,
        role: invite.role,
      });
    }

    // Mark invite as accepted
    await adminClient.from("workspace_invites").update({ status: "accepted" }).eq("id", invite.id);

    // Redirect to dashboard
    const dashUrl = `${url.origin}/dashboard/${invite.workspace_id}`;
    return Response.redirect(dashUrl, 302);
  } catch (err: any) {
    console.error("accept-invite error:", err);
    return new Response(`<h2>Error</h2><p>${err.message}</p>`, { status: 500, headers: { "Content-Type": "text/html" } });
  }
});
