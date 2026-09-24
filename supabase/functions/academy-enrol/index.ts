// Academy enrolment: stores the enrolment form, then opens Stripe Checkout for
// paid courses. "verify" confirms payment after Stripe redirects back.
// The live class date is agreed with the student after payment (set by admin).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const clean = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const CURRENCIES: Record<string, string> = { GBP: "gbp", USD: "usd", EUR: "eur", NGN: "ngn" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  try {
    const body = await req.json();

    if (body.action === "verify") {
      const id = clean(body.enrolmentId, 64);
      const { data: en } = await db.from("academy_enrolments").select("*").eq("id", id).maybeSingle();
      if (!en) return json({ error: "Enrolment not found" }, 404);
      if (en.status === "pending_payment" && en.stripe_session_id && stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const s = await stripe.checkout.sessions.retrieve(en.stripe_session_id);
        if (s.payment_status === "paid") {
          await db.from("academy_enrolments")
            .update({ status: "awaiting_date", paid_at: new Date().toISOString() })
            .eq("id", id).eq("status", "pending_payment");
          return json({ status: "awaiting_date", course_title: en.course_title });
        }
      }
      return json({ status: en.status, course_title: en.course_title });
    }

    // Create enrolment
    const slug = clean(body.courseSlug, 120);
    const full_name = clean(body.fullName, 120);
    const email = clean(body.email, 200).toLowerCase();
    if (!slug || !full_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Please enter your name and a valid email." }, 400);
    }
    const { data: course } = await db.from("academy_courses")
      .select("slug,title,premium,price_minor,currency,published").eq("slug", slug).maybeSingle();
    if (!course || !course.published) return json({ error: "Course not found" }, 404);
    if (course.premium && course.price_minor <= 0) {
      return json({ error: "Enrolment for this course opens soon — the price hasn't been set yet." }, 400);
    }

    let user_id: string | null = null;
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await db.auth.getClaims(token);
      user_id = (data?.claims?.sub as string) ?? null;
      if (data?.claims?.role !== "authenticated") user_id = null;
    }

    const paid = course.price_minor > 0;
    const { data: en, error } = await db.from("academy_enrolments").insert({
      course_slug: course.slug,
      course_title: course.title,
      user_id,
      full_name,
      email,
      phone: clean(body.phone, 40) || null,
      business_type: clean(body.businessType, 120) || null,
      goals: clean(body.goals, 1000) || null,
      amount_minor: course.price_minor,
      currency: course.currency,
      status: paid ? "pending_payment" : "awaiting_date",
    }).select("id").single();
    if (error) throw error;

    if (!paid) return json({ enrolmentId: en.id, status: "awaiting_date" });
    if (!stripeKey) return json({ error: "Payments are not available right now." }, 500);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://nexusflo24.com";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCIES[course.currency] ?? "gbp",
          unit_amount: course.price_minor,
          product_data: { name: `${course.title} — NexusFlo24 Academy live class` },
        },
      }],
      success_url: `${origin}/academy/${course.slug}?enrolment=${en.id}`,
      cancel_url: `${origin}/academy/${course.slug}?enrolment_cancelled=1`,
      metadata: { kind: "academy_enrolment", enrolment_id: en.id, course_slug: course.slug },
    });
    await db.from("academy_enrolments").update({ stripe_session_id: session.id }).eq("id", en.id);
    return json({ enrolmentId: en.id, url: session.url });
  } catch (e) {
    console.error("[academy-enrol]", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
