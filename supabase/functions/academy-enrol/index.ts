// Academy enrolment: stores the enrolment form, then opens checkout for paid
// courses in the student's chosen currency — Stripe for GBP/USD/EUR, Paystack
// for NGN. "verify" confirms payment after the provider redirects back.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fulfilAcademyEnrolment, academyBookingUrl } from "../_shared/academyFulfil.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const clean = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const STRIPE_CURRENCIES: Record<string, string> = { GBP: "gbp", USD: "usd", EUR: "eur" };
const SUPPORTED = ["GBP", "USD", "EUR", "NGN"];
const PAYSTACK_PREFIX = "ps:"; // Paystack references are stored in stripe_session_id with this prefix.

// MUST match src/lib/currency/academyPrice.ts so shown price == charged price.
function convertCoursePrice(minor: number, from: string, to: string, rates: Record<string, number>) {
  if (minor <= 0 || from === to) return minor;
  const f = rates[from], t = rates[to];
  if (!f || !t) return minor;
  const step = to === "NGN" ? 10000 : 50;
  return Math.max(step, Math.round(((minor * t) / f) / step) * step);
}

async function markPaid(db: any, id: string) {
  await db.from("academy_enrolments")
    .update({ status: "awaiting_date", paid_at: new Date().toISOString() })
    .eq("id", id).eq("status", "pending_payment");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

  try {
    const body = await req.json();

    if (body.action === "verify") {
      const id = clean(body.enrolmentId, 64);
      const { data: en } = await db.from("academy_enrolments").select("*").eq("id", id).maybeSingle();
      if (!en) return json({ error: "Enrolment not found" }, 404);
      let status = en.status;
      const ref: string = en.stripe_session_id ?? "";
      if (en.status === "pending_payment" && ref.startsWith(PAYSTACK_PREFIX) && paystackKey) {
        const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref.slice(PAYSTACK_PREFIX.length))}`, {
          headers: { Authorization: `Bearer ${paystackKey}` },
        });
        const j = await r.json();
        if (j?.data?.status === "success" && j.data.amount >= en.amount_minor && String(j.data.currency).toUpperCase() === en.currency) {
          await markPaid(db, id);
          status = "awaiting_date";
        }
      } else if (en.status === "pending_payment" && ref && stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const s = await stripe.checkout.sessions.retrieve(ref);
        if (s.payment_status === "paid") {
          await markPaid(db, id);
          status = "awaiting_date";
        }
      }
      if (status !== "pending_payment") await fulfilAcademyEnrolment(db, id);
      return json({
        status, course_title: en.course_title,
        booking_url: status !== "pending_payment" ? academyBookingUrl(en) : null,
      });
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

    // Charging currency + server-side price (never trust a client amount)
    const baseCurrency = (course.currency || "GBP").toUpperCase();
    const requested = clean(body.currency, 3).toUpperCase();
    let currency = SUPPORTED.includes(requested) ? requested : baseCurrency;
    let amount = course.price_minor;
    if (amount > 0 && currency !== baseCurrency) {
      const { data: rows } = await db.from("currency_rates").select("quote, rate").eq("base", "USD");
      const rates = Object.fromEntries((rows ?? []).map((r: any) => [r.quote, Number(r.rate)]));
      if (rates[currency] && rates[baseCurrency]) amount = convertCoursePrice(amount, baseCurrency, currency, rates);
      else currency = baseCurrency;
    }

    let user_id: string | null = null;
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await db.auth.getClaims(token);
      user_id = (data?.claims?.sub as string) ?? null;
      if (data?.claims?.role !== "authenticated") user_id = null;
    }

    const paid = amount > 0;
    const { data: en, error } = await db.from("academy_enrolments").insert({
      course_slug: course.slug,
      course_title: course.title,
      user_id,
      full_name,
      email,
      phone: clean(body.phone, 40) || null,
      business_type: clean(body.businessType, 120) || null,
      goals: clean(body.goals, 1000) || null,
      amount_minor: amount,
      currency,
      status: paid ? "pending_payment" : "awaiting_date",
    }).select("id").single();
    if (error) throw error;

    if (!paid) {
      await fulfilAcademyEnrolment(db, en.id);
      return json({ enrolmentId: en.id, status: "awaiting_date" });
    }

    const origin = req.headers.get("origin") || "https://nexusflo24.com";
    const successUrl = `${origin}/academy/${course.slug}?enrolment=${en.id}`;

    if (currency === "NGN") {
      if (!paystackKey) return json({ error: "Naira payments aren't available right now — please choose another currency." }, 503);
      const r = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email, amount, currency: "NGN", callback_url: successUrl,
          metadata: { type: "academy_enrolment", enrolment_id: en.id, course_slug: course.slug,
            cancel_action: `${origin}/academy/${course.slug}?enrolment_cancelled=1` },
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.status) {
        console.error("[academy-enrol] paystack init failed", r.status, j?.message);
        return json({ error: "Couldn't start Naira payment. Please try again or choose another currency.",
          detail: `Paystack said: ${clean(j?.message, 200) || `HTTP ${r.status}`}` }, 502);
      }
      await db.from("academy_enrolments").update({ stripe_session_id: PAYSTACK_PREFIX + j.data.reference }).eq("id", en.id);
      return json({ enrolmentId: en.id, url: j.data.authorization_url });
    }

    if (!stripeKey) return json({ error: "Payments are not available right now." }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: STRIPE_CURRENCIES[currency] ?? "gbp",
          unit_amount: amount,
          product_data: { name: `${course.title} — NexusFlo24 Academy live class` },
        },
      }],
      success_url: successUrl,
      cancel_url: `${origin}/academy/${course.slug}?enrolment_cancelled=1`,
      metadata: { kind: "academy_enrolment", enrolment_id: en.id, course_slug: course.slug },
    });
    await db.from("academy_enrolments").update({ stripe_session_id: session.id }).eq("id", en.id);
    return json({ enrolmentId: en.id, url: session.url });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    console.error("[academy-enrol]", m);
    const isStripe = (e as any)?.type?.startsWith?.("Stripe");
    return json({ error: isStripe ? "Couldn't start card payment. Please try again." : "Something went wrong. Please try again.",
      detail: isStripe ? `Stripe said: ${clean(m, 200)}` : undefined }, isStripe ? 502 : 500);
  }
});
