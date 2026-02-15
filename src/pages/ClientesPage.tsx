import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Phone, Mail, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  birth_date: string | null;
  notes: string;
  created_at: string;
}

const ClientesPage = () => {
  const { salon } = useSalon();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    if (!salon) return;
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("salon_id", salon.id)
      .order("created_at", { ascending: false });
    setClients((data as ClientRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [salon]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("clients").insert({
      salon_id: salon.id,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Cliente adicionada!");
      setForm({ name: "", email: "", phone: "" });
      setOpen(false);
      fetchClients();
    }
    setSaving(false);
  };

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
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie as clientes do seu salão</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nova cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={saving || !form.name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Lista de Clientes ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma cliente cadastrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    </div>
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

export default ClientesPage;
