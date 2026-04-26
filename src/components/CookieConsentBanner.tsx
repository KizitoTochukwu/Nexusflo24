import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type CookiePreferences = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "nexusflo_cookie_consent";

const getStoredPreferences = (): CookiePreferences | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    const stored = getStoredPreferences();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const save = (preferences: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setVisible(false);
    setShowManage(false);
  };

  const acceptAll = () => save({ necessary: true, functional: true, analytics: true, marketing: true });
  const rejectNonEssential = () => save({ necessary: true, functional: false, analytics: false, marketing: false });
  const savePrefs = () => save(prefs);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-background/95 backdrop-blur-lg shadow-lg">
      <div className="container px-3 py-2 sm:py-4">
        {!showManage ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="text-xs text-muted-foreground sm:text-sm">
              We use cookies to improve your experience.{" "}
              <Link to="/cookie-policy" className="text-accent hover:underline">Learn more</Link>
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Button size="sm" variant="outline" onClick={rejectNonEssential} className="h-8 flex-1 px-2 text-xs sm:h-9 sm:flex-none sm:px-3 sm:text-sm">
                Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowManage(true)} className="h-8 flex-1 px-2 text-xs sm:h-9 sm:flex-none sm:px-3 sm:text-sm">
                Manage
              </Button>
              <Button size="sm" className="h-8 flex-1 bg-accent px-2 text-xs text-accent-foreground hover:bg-gold-dark sm:h-9 sm:flex-none sm:px-3 sm:text-sm" onClick={acceptAll}>
                Accept All
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Cookie Preferences</p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              {([
                { key: "necessary" as const, label: "Strictly Necessary", locked: true },
                { key: "functional" as const, label: "Functional", locked: false },
                { key: "analytics" as const, label: "Analytics", locked: false },
                { key: "marketing" as const, label: "Marketing", locked: false },
              ]).map(({ key, label, locked }) => (
                <label key={key} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    disabled={locked}
                    onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                    className="accent-accent"
                  />
                  <span>{label}</span>
                  {locked && <span className="text-xs text-muted-foreground">(required)</span>}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowManage(false)}>Back</Button>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-gold-dark" onClick={savePrefs}>
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieConsentBanner;
