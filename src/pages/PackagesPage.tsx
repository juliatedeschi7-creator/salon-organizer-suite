import React, { useState, useEffect } from "react";
import { useSalon } from "@/contexts/SalonContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Loader2, History } from "lucide-react";
import { toast } from "sonner";

interface PackageModel {
  id: string;
  name: string;
  description: string;
  total_sessions: number;
  price: number;
  validity_days: number;
  rules: string;
  service_id: string | null;
  is_active: boolean;
}

interface SalonClient {
  user_id: string;
  name: string;
  email: string;
}

interface LegacyItemForm {
  service_name: string;
  quantity_total: number;
  quantity_used: number;
}

const PackagesPage = () => {
  const { salon } = useSalon();
  const [packages, setPackages] = useState<PackageModel[]>([]);
  const [clients, setClients] = useState<SalonClient[]>([]);
  const [loading, setLoading] = useState(true);

  // Legacy registration dialog state
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [legacySaving, setLegacySaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [legacyStatus, setLegacyStatus] = useState<"finalizado" | "expirado">("finalizado");
  const [legacyNotes, setLegacyNotes] = useState("");
  const [legacyItems, setLegacyItems] = useState<LegacyItemForm[]>([]);

  const fetchData = async () => {
    if (!salon) return;
    const [pkgRes, membersRes] = await Promise.all([
      supabase
        .from("packages")
        .select("*")
        .eq("salon_id", salon.id)
        .order("name"),
      supabase
        .from("salon_members")
        .select("user_id")
        .eq("salon_id", salon.id)
        .eq("role", "cliente"),
    ]);
    setPackages((pkgRes.data || []) as PackageModel[]);

    const memberUserIds = (membersRes.data || []).map((m: any) => m.user_id);
    if (memberUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", memberUserIds);
      setClients(
        (profilesData || []).map((p: any) => ({
          user_id: p.user_id,
          name: p.name || p.user_id,
          email: p.email || "",
        }))
      );
    } else {
      setClients([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [salon]);

  // When a package is selected, auto-populate items from package total_sessions
  const handlePackageSelect = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const pkg = packages.find((p) => p.id === pkgId);
    if (pkg) {
      setLegacyItems([
        {
          service_name: pkg.name,
          quantity_total: pkg.total_sessions,
          quantity_used: 0,
        },
      ]);
      // Auto-set purchase date to today if not already set
      if (!purchasedAt) setPurchasedAt(new Date().toISOString().slice(0, 10));
    }
  };

  const updateItem = (idx: number, field: keyof LegacyItemForm, value: string | number) => {
    setLegacyItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    setLegacyItems((prev) => [
      ...prev,
      { service_name: "", quantity_total: 1, quantity_used: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    setLegacyItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateItems = (): boolean => {
    for (const item of legacyItems) {
      if (!item.service_name.trim()) {
        toast.error("Preencha o nome do serviço em todos os itens");
        return false;
      }
      if (item.quantity_used < 0 || item.quantity_used > item.quantity_total) {
        toast.error(`Sessões usadas deve ser entre 0 e ${item.quantity_total} para "${item.service_name}"`);
        return false;
      }
    }
    return true;
  };

  const handleLegacySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    if (!selectedClientId) { toast.error("Selecione um cliente"); return; }
    if (!selectedPackageId) { toast.error("Selecione um pacote"); return; }
    if (!purchasedAt) { toast.error("Informe a data de compra"); return; }
    if (!expiresAt) { toast.error("Informe a data de expiração"); return; }
    if (legacyItems.length === 0) { toast.error("Adicione pelo menos um item de serviço"); return; }
    if (!validateItems()) return;

    setLegacySaving(true);
    try {
      const totalUsed = legacyItems.reduce((sum, i) => sum + i.quantity_used, 0);

      const { data: cpData, error: cpError } = await supabase
        .from("client_packages")
        .insert({
          salon_id: salon.id,
          package_id: selectedPackageId,
          client_user_id: selectedClientId,
          purchased_at: new Date(purchasedAt).toISOString(),
          expires_at: new Date(expiresAt).toISOString(),
          status: legacyStatus,
          sessions_used: totalUsed,
          source: "legacy",
          legacy_notes: legacyNotes.trim(),
        })
        .select("id")
        .single();

      if (cpError) throw cpError;

      const itemsToInsert = legacyItems.map((item) => ({
        client_package_id: cpData.id,
        service_name: item.service_name.trim(),
        quantity_total: item.quantity_total,
        quantity_used: item.quantity_used,
      }));

      const { error: itemsError } = await supabase
        .from("client_package_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success("Pacote histórico registrado com sucesso!");
      setLegacyOpen(false);
      resetLegacyForm();
    } catch (err: any) {
      toast.error("Erro ao registrar pacote: " + err.message);
    } finally {
      setLegacySaving(false);
    }
  };

  const resetLegacyForm = () => {
    setSelectedClientId("");
    setSelectedPackageId("");
    setPurchasedAt("");
    setExpiresAt("");
    setLegacyStatus("finalizado");
    setLegacyNotes("");
    setLegacyItems([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pacotes</h1>
          <p className="text-sm text-muted-foreground">Gerencie os pacotes do salão</p>
        </div>
        <Dialog
          open={legacyOpen}
          onOpenChange={(open) => {
            setLegacyOpen(open);
            if (!open) resetLegacyForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <History className="h-4 w-4" />
              Registrar Pacote Histórico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Pacote Histórico</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLegacySubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum cliente registrado</p>
                    )}
                    {clients.map((c) => (
                      <SelectItem key={c.user_id} value={c.user_id}>
                        {c.name} {c.email ? `(${c.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Pacote *</Label>
                <Select value={selectedPackageId} onValueChange={handlePackageSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pacote" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum pacote cadastrado</p>
                    )}
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Data de Compra *</Label>
                  <Input
                    type="date"
                    value={purchasedAt}
                    onChange={(e) => setPurchasedAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de Expiração *</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select value={legacyStatus} onValueChange={(v) => setLegacyStatus(v as "finalizado" | "expirado")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="expirado">Expirado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sessões por serviço *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                </div>
                {legacyItems.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    Selecione um pacote ou adicione itens manualmente
                  </p>
                )}
                {legacyItems.map((item, idx) => (
                  <div key={idx} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => removeItem(idx)}
                      >
                        ×
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Serviço</Label>
                      <Input
                        placeholder="Nome do serviço"
                        value={item.service_name}
                        onChange={(e) => updateItem(idx, "service_name", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Total de sessões</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity_total}
                          onChange={(e) => updateItem(idx, "quantity_total", parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Sessões utilizadas</Label>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity_total}
                          value={item.quantity_used}
                          onChange={(e) => updateItem(idx, "quantity_used", parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Notas sobre este pacote histórico..."
                  value={legacyNotes}
                  onChange={(e) => setLegacyNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLegacyOpen(false)}
                  disabled={legacySaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={legacySaving}>
                  {legacySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Package Models List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" /> Modelos de Pacote
          </CardTitle>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum pacote cadastrado
            </p>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-start justify-between rounded-lg border border-border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{pkg.name}</p>
                      {!pkg.is_active && (
                        <Badge variant="outline" className="text-xs">Inativo</Badge>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground">{pkg.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {pkg.total_sessions} sessões · Validade: {pkg.validity_days} dias
                      {pkg.price ? ` · R$ ${Number(pkg.price).toFixed(2)}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PackagesPage;
