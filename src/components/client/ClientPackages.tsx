import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, CalendarClock, ListChecks, Loader2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PackageRow {
  id: string;
  name: string;
  description: string;
  total_sessions: number;
  price: number;
  validity_days: number;
  rules: string;
  service_id: string | null;
}

interface ClientPackageRow {
  id: string;
  package_id: string;
  sessions_used: number;
  purchased_at: string;
  expires_at: string;
  status: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  concluido: { label: "Concluído", className: "bg-primary/15 text-primary border-primary/30" },
  expirado: { label: "Expirado", className: "bg-muted text-muted-foreground border-border" },
  cancelado: { label: "Cancelado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const ClientPackages = () => {
  const { user } = useAuth();
  const { salon } = useSalon();
  const [clientPackages, setClientPackages] = useState<ClientPackageRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user || !salon) return;
      const [cpRes, pRes] = await Promise.all([
        supabase
          .from("client_packages")
          .select("*")
          .eq("client_user_id", user.id)
          .eq("salon_id", salon.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("packages")
          .select("*")
          .eq("salon_id", salon.id)
          .eq("is_active", true),
      ]);
      setClientPackages((cpRes.data || []) as ClientPackageRow[]);
      setPackages((pRes.data || []) as PackageRow[]);
      setLoading(false);
    };
    fetch();
  }, [user, salon]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const packageMap = Object.fromEntries(packages.map((p) => [p.id, p]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5 text-primary" /> Meus Pacotes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clientPackages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Você ainda não possui pacotes ativos
          </p>
        ) : (
          <div className="space-y-4">
            {clientPackages.map((cp) => {
              const pkg = packageMap[cp.package_id];
              if (!pkg) return null;

              const sessionsRemaining = pkg.total_sessions - cp.sessions_used;
              const progress = (cp.sessions_used / pkg.total_sessions) * 100;
              const expired = isPast(new Date(cp.expires_at));
              const effectiveStatus = expired && cp.status === "ativo" ? "expirado" : cp.status;
              const st = statusMap[effectiveStatus] || statusMap.ativo;

              return (
                <div
                  key={cp.id}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={st.className}>
                      {st.label}
                    </Badge>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Sessões: {cp.sessions_used} de {pkg.total_sessions}</span>
                      <span>{sessionsRemaining} restante(s)</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Validity */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Válido até {format(new Date(cp.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    {pkg.price > 0 && (
                      <span>R$ {Number(pkg.price).toFixed(2)}</span>
                    )}
                  </div>

                  {/* Rules */}
                  {pkg.rules && pkg.rules.trim() !== "" && (
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
                        <ListChecks className="h-3.5 w-3.5" /> Regras do pacote
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">
                        {pkg.rules}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientPackages;
