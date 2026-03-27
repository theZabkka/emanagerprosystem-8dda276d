import { useState, useEffect } from "react";
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
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-logs in the user from the recovery link hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if session already exists (user already authenticated via recovery token)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
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

          {!ready ? (
            <p className="text-sm text-center text-muted-foreground">Weryfikacja tokenu resetowania...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nowe hasło</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min. 6 znaków"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Powtórz nowe hasło</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Powtórz hasło"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
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
