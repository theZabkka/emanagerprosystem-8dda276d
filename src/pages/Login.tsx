import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast.error("Błąd logowania", { description: error.message });
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="w-full max-w-sm">
        <div className="bg-card rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              EMANAGER<span className="text-primary">.PRO</span>
            </h1>
            <p className="text-sm text-muted-foreground">Zaloguj się do swojego konta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="twoj@email.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>

          {/* Test accounts info */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Konta testowe (hasło: haslo1234):</p>
            <div className="space-y-1">
              {[
                { email: "boss@test.pl", role: "Boss" },
                { email: "koordynator@test.pl", role: "Koordynator" },
                { email: "specjalista@test.pl", role: "Specjalista" },
                { email: "praktykant@test.pl", role: "Praktykant" },
                { email: "klient@test.pl", role: "Klient" },
              ].map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted transition-colors flex justify-between"
                  onClick={() => { setEmail(acc.email); setPassword("haslo1234"); }}
                >
                  <span className="text-muted-foreground">{acc.email}</span>
                  <span className="font-medium text-foreground">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
