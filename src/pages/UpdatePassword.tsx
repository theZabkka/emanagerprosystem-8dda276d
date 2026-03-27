import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoDark from "@/assets/logo-dark.png";

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef(false);
  const navigate = useNavigate();

  const markReady = () => {
    if (!readyRef.current) {
      readyRef.current = true;
      setIsVerifying(false);
      setError(null);
    }
  };

  useEffect(() => {
    // Step 3: Global auth listener as fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        markReady();
      }
    });

    const init = async () => {
      // Step 2: PKCE code exchange
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError) { markReady(); return; }
          console.error("[UpdatePassword] Code exchange failed:", exchangeError);
        } catch (err) {
          console.error("[UpdatePassword] Code exchange exception:", err);
        }
      }

      // Step 1: Immediate session check
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { markReady(); return; }

      // If nothing worked yet, the timeout (Step 4) will handle it
    };

    init();

    // Step 4: Timeout guard
    const timeout = setTimeout(() => {
      if (!readyRef.current) {
        setIsVerifying(false);
        setError("Link resetujący jest nieprawidłowy lub wygasł.");
      }
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("Hasło musi mieć min. 6 znaków"); return; }
    if (newPassword !== confirmPassword) { toast.error("Hasła nie są identyczne"); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (error) {
      toast.error("Błąd zmiany hasła: " + error.message);
      return;
    }
    toast.success("Hasło zostało pomyślnie zmienione");
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-3">
            <img src={logoDark} alt="EMANAGER.PRO" className="h-9 w-auto mx-auto" />
            <p className="text-sm text-muted-foreground">Ustaw nowe hasło</p>
          </div>

          {isVerifying ? (
            <p className="text-sm text-center text-muted-foreground">Weryfikacja tokenu resetowania...</p>
          ) : error ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login", { replace: true })}>
                Wróć do logowania
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nowe hasło</Label>
                <Input id="new-password" type="password" placeholder="Min. 6 znaków" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Powtórz nowe hasło</Label>
                <Input id="confirm-password" type="password" placeholder="Powtórz hasło" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Zmieniam..." : "Zmień hasło"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
