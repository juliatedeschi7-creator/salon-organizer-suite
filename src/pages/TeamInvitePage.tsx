import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Scissors, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface InviteInfo {
  id: string;
  salon_id: string;
  salon_name: string;
  salon_logo_url: string | null;
  role: string;
  expires_at: string;
  used_at: string | null;
}

const roleLabels: Record<string, string> = {
  dono: "Dono / Sócia",
  funcionario: "Funcionária",
};

const TeamInvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState("");

  // Auth form state
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Fetch invite metadata
  useEffect(() => {
    if (!token) { setInvalid(true); setInvalidMsg("Token inválido."); setLoading(false); return; }
    supabase
      .rpc("get_team_invite_by_token", { _token: token })
      .then(({ data, error }) => {
        if (error || !data || (data as any[]).length === 0) {
          setInvalid(true);
          setInvalidMsg("Convite não encontrado ou expirado.");
        } else {
          const row = Array.isArray(data) ? data[0] : data;
          const info = row as InviteInfo;
          if (info.used_at) {
            setInvalid(true);
            setInvalidMsg("Este convite já foi utilizado.");
          } else if (new Date(info.expires_at) < new Date()) {
            setInvalid(true);
            setInvalidMsg("Este convite expirou.");
          } else {
            setInvite(info);
          }
        }
        setLoading(false);
      });
  }, [token]);

  // If user is already authenticated, consume invite immediately
  useEffect(() => {
    if (!isAuthenticated || !invite || done) return;
    (async () => {
      setSubmitting(true);
      const { data, error } = await supabase.rpc("consume_team_invite", { _token: token! });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error ?? error?.message ?? "Erro ao aceitar convite.";
        toast.error(msg);
        setInvalid(true);
        setInvalidMsg(msg);
      } else {
        setDone(true);
        toast.success("Convite aceito! Bem-vinda à equipe.");
        setTimeout(() => navigate("/"), 2000);
      }
      setSubmitting(false);
    })();
  }, [isAuthenticated, invite, token, done]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);

    if (isLogin) {
      // Sign in then consume invite
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      // consume_team_invite will run via the useEffect above when isAuthenticated changes
    } else {
      // Sign up – token embedded in metadata so handle_new_user processes it
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, salon_team_invite_token: token },
          emailRedirectTo: window.location.origin + "/",
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(
          "Conta criada! Aguarde a aprovação do administrador para acessar o sistema."
        );
        setDone(true);
      }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <Scissors className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Convite inválido</h2>
            <p className="mt-2 text-sm text-muted-foreground">{invalidMsg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
            <h2 className="text-lg font-semibold">
              {isAuthenticated ? "Convite aceito!" : "Cadastro realizado!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAuthenticated
                ? "Você foi adicionada à equipe. Redirecionando..."
                : "Aguarde a aprovação do administrador para acessar o sistema."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthenticated && submitting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {invite?.salon_logo_url ? (
            <img
              src={invite.salon_logo_url}
              alt={invite.salon_name}
              className="mx-auto mb-3 h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Scissors className="h-7 w-7" />
            </div>
          )}
          <CardTitle className="text-xl">{invite?.salon_name}</CardTitle>
          <CardDescription>
            Você foi convidada como{" "}
            <strong>{roleLabels[invite?.role ?? ""] ?? invite?.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Entrar e aceitar convite" : "Criar conta e aceitar convite"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Criar conta" : "Fazer login"}
            </button>
          </p>
          {!isLogin && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Após o cadastro, sua conta precisará ser aprovada pelo administrador antes de você poder entrar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamInvitePage;
