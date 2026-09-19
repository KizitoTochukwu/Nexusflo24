// Client-side access to the canonical trigger matcher. The implementation
// lives in supabase/functions/_shared/triggerMatch.ts so the browser app and
// the edge runtime can never drift apart.
export * from "../../../supabase/functions/_shared/triggerMatch";
