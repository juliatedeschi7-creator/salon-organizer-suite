import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Plus, CheckCircle2, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientMember {
  user_id: string;
  name: string | null;
  email: string | null;
}

interface Charge {
  id: string;
  client_user_id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: string;
  created_at: string;
}

interface Payment {
  id: string;
  client_user_id: string;
  charge_id: string | null;
  amount: number;
  method: string;
  notes: string | null;
  paid_at: string;
}

const methodLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  pix: "Pix",
  outro: "Outro",
};

const statusClass: Record<string, string> = {
  pendente: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  pago: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelado: "bg-muted text-muted-foreground border-border",
};

const toLocalDate = (dateStr: string) => new Date(dateStr + "T00:00:00");

// ── Owner view ──────────────────────────────────────────────────────────────

const OwnerContasPage = () => {
  const { salon } = useSalon();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientMember[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // New charge form
  const [chargeOpen, setChargeOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDue, setChargeDue] = useState("");
  const [saving, setSaving] = useState(false);

  // New payment form
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payClient, setPayClient] = useState("");
  const [payCharge, setPayCharge] = useState("none");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("pix");
  const [payNotes, setPayNotes] = useState("");

  const fetchData = useCallback(async () => {
    if (!salon) return;
    const [mRes, cRes, pRes] = await Promise.all([
      supabase
        .from("salon_members")
        .select("user_id, profiles(name, email)")
        .eq("salon_id", salon.id)
        .eq("role", "cliente"),
      supabase
        .from("client_charges")
        .select("*")
        .eq("salon_id", salon.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_payments")
        .select("*")
        .eq("salon_id", salon.id)
        .order("paid_at", { ascending: false }),
    ]);

    const mapped: ClientMember[] = (mRes.data ?? []).map((r: any) => ({
      user_id: r.user_id,
      name: r.profiles?.name ?? null,
      email: r.profiles?.email ?? null,
    }));

    setClients(mapped);
    setCharges((cRes.data ?? []) as Charge[]);
    setPayments((pRes.data ?? []) as Payment[]);
    setLoading(false);
  }, [salon]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clientName = (uid: string) => {
    const c = clients.find((cl) => cl.user_id === uid);
    return c?.name || c?.email || uid;
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !selectedClient || !chargeDesc || !chargeAmount) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("client_charges").insert({
      salon_id: salon.id,
      client_user_id: selectedClient,
      description: chargeDesc,
      amount: parseFloat(chargeAmount),
      due_date: chargeDue || null,
      status: "pendente",
    });
    if (error) {
      toast.error("Erro ao criar cobrança: " + error.message);
    } else {
      toast.success("Cobrança criada!");
      setChargeOpen(false);
      setSelectedClient("");
      setChargeDesc("");
      setChargeAmount("");
      setChargeDue("");
      fetchData();
    }
    setSaving(false);
  };

  const handleMarkPaid = async (chargeId: string) => {
    const { error } = await supabase
      .from("client_charges")
      .update({ status: "pago" })
      .eq("id", chargeId);
    if (error) { toast.error(error.message); return; }
    toast.success("Cobrança marcada como paga.");
    fetchData();
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !payClient || !payAmount) {
      toast.error("Selecione o cliente e informe o valor.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("client_payments").insert({
      salon_id: salon.id,
      client_user_id: payClient,
      charge_id: payCharge === "none" ? null : payCharge,
      amount: parseFloat(payAmount),
      method: payMethod,
      notes: payNotes || null,
    });
    if (error) {
      toast.error("Erro ao registrar pagamento: " + error.message);
    } else {
      toast.success("Pagamento registrado!");
      setPaymentOpen(false);
      setPayClient("");
      setPayCharge("none");
      setPayAmount("");
      setPayMethod("pix");
      setPayNotes("");
      fetchData();
    }
    setSaving(false);
  };

  const pendingCharges = charges.filter((c) => c.status === "pendente");
  const clientChargesForPay = payClient
    ? charges.filter((c) => c.client_user_id === payClient && c.status === "pendente")
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas</h1>
          <p className="text-sm text-muted-foreground">Gerencie cobranças e pagamentos das clientes</p>
        </div>
        <div className="flex gap-2">
          {/* New Charge */}
          <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Nova cobrança
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Cobrança</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateCharge} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient} required>
                    <SelectTrigger><SelectValue placeholder="Selecione a cliente" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id}>
                          {c.name || c.email || c.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={chargeDesc} onChange={(e) => setChargeDesc(e.target.value)} placeholder="Ex: Coloração + Corte" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="0.01" min="0" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input type="date" value={chargeDue} onChange={(e) => setChargeDue(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar cobrança
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* New Payment */}
          <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <CreditCard className="h-4 w-4" /> Registrar pagamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
              <form onSubmit={handleCreatePayment} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={payClient} onValueChange={(v) => { setPayClient(v); setPayCharge("none"); }} required>
                    <SelectTrigger><SelectValue placeholder="Selecione a cliente" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id}>
                          {c.name || c.email || c.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {clientChargesForPay.length > 0 && (
                  <div className="space-y-2">
                    <Label>Vincular a uma cobrança (opcional)</Label>
                    <Select value={payCharge} onValueChange={setPayCharge}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {clientChargesForPay.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            {ch.description} — R$ {Number(ch.amount).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="0.01" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Método *</Label>
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(methodLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Opcional" />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="pendencias" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendencias">Pendências ({pendingCharges.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas as Cobranças</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="pendencias">
          {pendingCharges.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-sm text-muted-foreground">Nenhuma pendência em aberto!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {pendingCharges.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{clientName(c.client_user_id)}</p>
                      <p className="text-sm text-foreground">{c.description}</p>
                      {c.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Vence: {format(toLocalDate(c.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-foreground">
                        R$ {Number(c.amount).toFixed(2)}
                      </span>
                      <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-400 hover:bg-green-50" onClick={() => handleMarkPaid(c.id)}>
                        <CheckCircle2 className="h-3 w-3" /> Pago
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="todas">
          {charges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {charges.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{clientName(c.client_user_id)}</p>
                      <p className="text-sm text-foreground">{c.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold">R$ {Number(c.amount).toFixed(2)}</span>
                      <Badge variant="outline" className={statusClass[c.status] ?? ""}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pagamentos">
          {payments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{clientName(p.client_user_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {methodLabels[p.method] ?? p.method} ·{" "}
                        {format(new Date(p.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                    </div>
                    <span className="text-base font-bold text-green-700">
                      R$ {Number(p.amount).toFixed(2)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Client view (read-only) ──────────────────────────────────────────────────

const ClientContasPage = () => {
  const { user } = useAuth();
  const { salon } = useSalon();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !salon) return;
    Promise.all([
      supabase
        .from("client_charges")
        .select("*")
        .eq("salon_id", salon.id)
        .eq("client_user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_payments")
        .select("*")
        .eq("salon_id", salon.id)
        .eq("client_user_id", user.id)
        .order("paid_at", { ascending: false }),
    ]).then(([cRes, pRes]) => {
      setCharges((cRes.data ?? []) as Charge[]);
      setPayments((pRes.data ?? []) as Payment[]);
      setLoading(false);
    });
  }, [user, salon]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = charges.filter((c) => c.status === "pendente");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minhas Contas</h1>
        <p className="text-sm text-muted-foreground">Veja suas pendências e histórico de pagamentos</p>
      </div>

      <Tabs defaultValue="pendencias" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pendencias">Pendências ({pending.length})</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="pendencias">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-sm text-muted-foreground">Nenhuma pendência em aberto 🎉</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {pending.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{c.description}</p>
                      {c.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Vence: {format(toLocalDate(c.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <span className="text-base font-bold text-yellow-700">
                      R$ {Number(c.amount).toFixed(2)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pagamentos">
          {payments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{methodLabels[p.method] ?? p.method}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                    </div>
                    <span className="text-base font-bold text-green-700">
                      R$ {Number(p.amount).toFixed(2)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Router ───────────────────────────────────────────────────────────────────

const ContasPage = () => {
  const { role } = useAuth();
  if (role === "dono" || role === "admin") return <OwnerContasPage />;
  return <ClientContasPage />;
};

export default ContasPage;
