import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { authApi } from "@/features/auth/auth.api";
import { useAuthStore } from "@/stores/auth.store";
import { getApiErrorMessage } from "@/lib/api-client";

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authApi.login({ email, password, mfaCode: mfaRequired ? mfaCode : undefined });
      setSession(result.user, result.accessToken);
      navigate("/admin");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error?.code === "MFA_REQUIRED") {
        setMfaRequired(true);
        setError(null);
      } else {
        setError(getApiErrorMessage(err, "Invalid email or password"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm animate-slide-up">
        <CardHeader className="items-center text-center">
          <ShieldCheck className="mb-2 h-8 w-8 text-primary" />
          <CardTitle>
            Tri<span className="text-gradient-brand">bastion</span> Admin
          </CardTitle>
          <CardDescription>Sign in to manage quizzes and live events</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={mfaRequired} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={mfaRequired}
              />
            </div>
            {mfaRequired && (
              <div className="space-y-1.5 animate-fade-in">
                <Label htmlFor="mfa">Authenticator code</Label>
                <Input
                  id="mfa"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : mfaRequired ? "Verify & sign in" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
