import React, { useState, useRef, useEffect } from "react";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Save, Link as LinkIcon, Clock, Bell, Palette, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const { salon, updateSalon, isLoading } = useSalon();
  const [form, setForm] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (salon) {
      setForm({ ...salon });
      setLogoPreview(salon.logo_url ?? null);
    }
  }, [salon]);

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const workingHours = Array.isArray(form.working_hours) ? form.working_hours : [];

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      setForm((f: any) => ({ ...f, logo_url: url }));
    }
  };

  const handleHoursChange = (index: number, field: string, value: string | boolean) => {
    const updated = [...workingHours];
    updated[index] = { ...updated[index], [field]: value };
    setForm((f: any) => ({ ...f, working_hours: updated }));
  };

  const handleSave = async () => {
    await updateSalon({
      name: form.name,
      description: form.description,
      address: form.address,
      phone: form.phone,
      logo_url: form.logo_url,
      client_link: form.client_link,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      notifications_enabled: form.notifications_enabled,
      working_hours: form.working_hours,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as informações e preferências do seu salão</p>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="visual">Visual</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5 text-primary" />
                Logo do Salão
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted transition hover:border-primary"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Clique para enviar</p>
                <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máx 2MB.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do salão</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LinkIcon className="h-5 w-5 text-primary" />
                Link da Cliente
              </CardTitle>
              <CardDescription>URL personalizada para suas clientes acessarem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{window.location.origin}/convite/</span>
                <Input
                  className="max-w-xs"
                  value={form.client_link}
                  onChange={(e) => setForm({ ...form, client_link: e.target.value.replace(/\s/g, "-").toLowerCase() })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/convite/${form.client_link}`}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/convite/${form.client_link}`);
                    toast.success("Link copiado!");
                  }}
                >
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Horários de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workingHours.map((wh: any, i: number) => (
                <div key={wh.day} className="flex items-center gap-4 rounded-lg border border-border p-3">
                  <Switch checked={wh.enabled} onCheckedChange={(v) => handleHoursChange(i, "enabled", v)} />
                  <span className="w-20 text-sm font-medium">{wh.day}</span>
                  {wh.enabled ? (
                    <>
                      <Input type="time" className="w-28" value={wh.open} onChange={(e) => handleHoursChange(i, "open", e.target.value)} />
                      <span className="text-muted-foreground">até</span>
                      <Input type="time" className="w-28" value={wh.close} onChange={(e) => handleHoursChange(i, "close", e.target.value)} />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Fechado</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-primary" />
                Identidade Visual
              </CardTitle>
              <CardDescription>Personalize as cores do seu salão</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor primária</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10 w-10 cursor-pointer rounded-md border border-border" />
                  <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="max-w-[120px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor de destaque</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="h-10 w-10 cursor-pointer rounded-md border border-border" />
                  <Input value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="max-w-[120px]" />
                </div>
              </div>
              <div className="col-span-full mt-4">
                <p className="mb-2 text-sm font-medium">Preview</p>
                <div className="flex gap-3">
                  <div className="h-12 w-24 rounded-lg shadow-sm" style={{ backgroundColor: form.primary_color }} />
                  <div className="h-12 w-24 rounded-lg shadow-sm" style={{ backgroundColor: form.accent_color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Notificações Push
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Ativar notificações</p>
                  <p className="text-xs text-muted-foreground">Receba alertas de agendamentos e estoque</p>
                </div>
                <Switch checked={form.notifications_enabled} onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Novos agendamentos</p>
                  <p className="text-xs text-muted-foreground">Quando uma cliente agendar</p>
                </div>
                <Switch defaultChecked disabled={!form.notifications_enabled} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Estoque baixo</p>
                  <p className="text-xs text-muted-foreground">Quando produto atingir mínimo</p>
                </div>
                <Switch defaultChecked disabled={!form.notifications_enabled} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Anamnese respondida</p>
                  <p className="text-xs text-muted-foreground">Quando cliente responder ficha</p>
                </div>
                <Switch defaultChecked disabled={!form.notifications_enabled} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar configurações
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
