import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const lid = searchParams.get("lid");
  const wid = searchParams.get("wid");
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error" | "invalid">("loading");

  useEffect(() => {
    if (!lid || !wid) {
      setStatus("invalid");
      return;
    }

    const doUnsubscribe = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("unsubscribe", {
          body: { lid, wid },
        });

        if (error) {
          console.error("Unsubscribe error:", error);
          setStatus("error");
          return;
        }

        if (data?.status === "already_unsubscribed") {
          setStatus("already");
        } else if (data?.status === "success") {
          setStatus("success");
        } else if (data?.status === "not_found") {
          setStatus("error");
        } else {
          setStatus("success");
        }
      } catch (err) {
        console.error("Unsubscribe error:", err);
        setStatus("error");
      }
    };

    doUnsubscribe();
  }, [lid, wid]);

  const titles: Record<string, string> = {
    loading: "Processing...",
    success: "Unsubscribed",
    already: "Already Unsubscribed",
    error: "Something Went Wrong",
    invalid: "Invalid Link",
  };

  const messages: Record<string, string> = {
    loading: "Please wait while we process your request.",
    success: "You have been successfully unsubscribed from our marketing emails. You will no longer receive promotional content from us.",
    already: "You have already been unsubscribed from our marketing emails.",
    error: "We couldn't process your unsubscribe request. Please try again later or contact support.",
    invalid: "This unsubscribe link is invalid or expired.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ fontFamily: "'Inter', Arial, sans-serif" }}>
      <div className="bg-white rounded-2xl p-12 max-w-md text-center shadow-lg">
        {status === "loading" ? (
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 border-4 border-[#0B1F3B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : status === "success" ? (
          <div className="text-4xl mb-4">✓</div>
        ) : status === "already" ? (
          <div className="text-4xl mb-4">📧</div>
        ) : (
          <div className="text-4xl mb-4">⚠</div>
        )}
        <h1 className="text-xl font-semibold text-[#0B1F3B] mb-3">{titles[status]}</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{messages[status]}</p>
        <span className="text-xs" style={{ color: "#C9A227" }}>
          &copy; NexusFlo24 &middot; AI-Powered Marketing Automation
        </span>
      </div>
    </div>
  );
};

export default Unsubscribe;
