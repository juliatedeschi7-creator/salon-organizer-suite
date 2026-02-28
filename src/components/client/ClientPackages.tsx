import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CalendarClock, ListChecks, Loader2, History } from "lucide-react";
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
  source?: string;
  legacy_notes?: string;
}

interface ClientPackageItem {
  id: string;
  client_package_id: string;
  service_name: string;
  quantity_total: number;
  quantity_used: number;
}

const statusMap: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  concluido: { label: "Concluído", className: "bg-primary/15 text-primary border-primary/30" },
  finalizado: { label: "Finalizado", className: "bg-primary/15 text-primary border-primary/30" },
  expirado: { label: "Expirado", className: "bg-muted text-muted-foreground border-border" },
  cancelado: { label: "Cancelado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PackageCard = ({
  cp,
  pkg,
  items,
}: {
  cp: ClientPackageRow;
  pkg: PackageRow;
  items: ClientPackageItem[];
}) => {
  const sessionsRemaining = pkg.total_sessions - cp.sessions_used;
  const progress = pkg.total_sessions > 0 ? (cp.sessions_used / pkg.total_sessions) * 100 : 0;
  const expired = isPast(new Date(cp.expires_at));
  const effectiveStatus = expired && cp.status === "ativo" ? "expirado" : cp.status;
  const st = statusMap[effectiveStatus] || statusMap.ativo;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
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

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const itemProgress = item.quantity_total > 0 ? (item.quantity_used / item.quantity_total) * 100 : 0;
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{item.service_name}</span>
                  <span>{item.quantity_used}/{item.quantity_total}</span>
                </div>
                <Progress value={itemProgress} className="h-1.5" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sessões: {cp.sessions_used} de {pkg.total_sessions}</span>
            <span>{sessionsRemaining} restante(s)</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          Comprado em {format(new Date(cp.purchased_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          Válido até {format(new Date(cp.expires_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        {pkg.price > 0 && <span>R$ {Number(pkg.price).toFixed(2)}</span>}
      </div>

      {pkg.rules && pkg.rules.trim() !== "" && (
        <div className="rounded-md bg-muted/50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-1">
            <ListChecks className="h-3.5 w-3.5" /> Regras do pacote
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-line">{pkg.rules}</p>
        </div>
      )}

      {cp.legacy_notes && cp.legacy_notes.trim() !== "" && (
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground whitespace-pre-line">{cp.legacy_notes}</p>
        </div>
      )}
    </div>
  );
};

const ClientPackages = () => {
  const { user } = useAuth();
  const { salon } = useSalon();
  const [clientPackages, setClientPackages] = useState<ClientPackageRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [packageItems, setPackageItems] = useState<ClientPackageItem[]>([]);
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
          .order("purchased_at", { ascending: false }),
        supabase
          .from("packages")
          .select("*")
          .eq("salon_id", salon.id),
      ]);
      const fetchedPackages = (cpRes.data || []) as ClientPackageRow[];
      setClientPackages(fetchedPackages);
      setPackages((pRes.data || []) as PackageRow[]);

      if (fetchedPackages.length > 0) {
        const ids = fetchedPackages.map((cp) => cp.id);
        const { data: itemsData } = await supabase
          .from("client_package_items")
          .select("*")
          .in("client_package_id", ids);
        setPackageItems((itemsData || []) as ClientPackageItem[]);
      }

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

  const activePackages = clientPackages.filter((cp) => {
    const pkg = packageMap[cp.package_id];
    if (!pkg) return false;
    const expired = isPast(new Date(cp.expires_at));
    const effectiveStatus = expired && cp.status === "ativo" ? "expirado" : cp.status;
    return effectiveStatus === "ativo";
  });

  const historyPackages = clientPackages.filter((cp) => {
    const pkg = packageMap[cp.package_id];
    if (!pkg) return false;
    const expired = isPast(new Date(cp.expires_at));
    const effectiveStatus = expired && cp.status === "ativo" ? "expirado" : cp.status;
    return effectiveStatus !== "ativo";
  });

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
            Você ainda não possui pacotes
          </p>
        ) : (
          <Tabs defaultValue="ativos">
            <TabsList className="mb-4">
              <TabsTrigger value="ativos" className="gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Ativos {activePackages.length > 0 && `(${activePackages.length})`}
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                Histórico {historyPackages.length > 0 && `(${historyPackages.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ativos" className="space-y-4">
              {activePackages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pacote ativo no momento</p>
              ) : (
                activePackages.map((cp) => {
                  const pkg = packageMap[cp.package_id];
                  if (!pkg) return null;
                  const items = packageItems.filter((i) => i.client_package_id === cp.id);
                  return <PackageCard key={cp.id} cp={cp} pkg={pkg} items={items} />;
                })
              )}
            </TabsContent>

            <TabsContent value="historico" className="space-y-4">
              {historyPackages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pacote anterior</p>
              ) : (
                historyPackages.map((cp) => {
                  const pkg = packageMap[cp.package_id];
                  if (!pkg) return null;
                  const items = packageItems.filter((i) => i.client_package_id === cp.id);
                  return <PackageCard key={cp.id} cp={cp} pkg={pkg} items={items} />;
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientPackages;

