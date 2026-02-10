import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  Send,
  Clock,
  Package,
  Plus,
  Users,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

// ── Mock data ──

interface Notification {
  id: string;
  type: "lembrete" | "pacote" | "personalizada";
  title: string;
  message: string;
  sentAt: string;
  status: "enviado" | "falhou" | "agendado";
  recipients: string[];
  segment?: string;
}

interface AutoReminder {
  id: string;
  type: string;
  enabled: boolean;
  description: string;
  timing: string;
}

const mockHistory: Notification[] = [
  {
    id: "1",
    type: "lembrete",
    title: "Lembrete de atendimento",
    message: "Olá Ana! Seu atendimento de Manicure é amanhã às 14:00.",
    sentAt: "2026-02-09 08:00",
    status: "enviado",
    recipients: ["Ana Costa"],
  },
  {
    id: "2",
    type: "pacote",
    title: "Pacote próximo do vencimento",
    message: "Seu pacote de Hidratação Capilar vence em 5 dias. Agende sua sessão!",
    sentAt: "2026-02-08 10:00",
    status: "enviado",
    recipients: ["Beatriz Lima"],
  },
  {
    id: "3",
    type: "personalizada",
    title: "Promoção de Fevereiro",
    message: "Aproveite 20% de desconto em todos os serviços de estética!",
    sentAt: "2026-02-07 09:00",
    status: "enviado",
    recipients: ["Todas as clientes"],
    segment: "todas",
  },
  {
    id: "4",
    type: "lembrete",
    title: "Lembrete de atendimento",
    message: "Olá Carla! Seu atendimento de Corte é amanhã às 10:00.",
    sentAt: "2026-02-06 08:00",
    status: "falhou",
    recipients: ["Carla Mendes"],
  },
  {
    id: "5",
    type: "personalizada",
    title: "Novidade: Extensão de cílios",
    message: "Agora oferecemos extensão de cílios! Agende pelo link.",
    sentAt: "2026-02-05 11:00",
    status: "enviado",
    recipients: ["Clientes de estética"],
    segment: "estetica",
  },
];

const mockAutoReminders: AutoReminder[] = [
  { id: "1", type: "atendimento", enabled: true, description: "Lembrete 1 dia antes do atendimento", timing: "24h antes" },
  { id: "2", type: "pacote_vencimento", enabled: true, description: "Aviso de pacote próximo do vencimento", timing: "5 dias antes" },
  { id: "3", type: "pacote_sessoes", enabled: false, description: "Aviso de poucas sessões restantes", timing: "2 sessões restantes" },
  { id: "4", type: "aniversario", enabled: false, description: "Mensagem de aniversário para a cliente", timing: "No dia" },
];

const mockClients = [
  { id: "1", name: "Ana Costa", category: "manicure" },
  { id: "2", name: "Beatriz Lima", category: "cabelo" },
  { id: "3", name: "Carla Mendes", category: "estetica" },
  { id: "4", name: "Diana Souza", category: "manicure" },
  { id: "5", name: "Eva Rodrigues", category: "cabelo" },
];

const segments = [
  { value: "todas", label: "Todas as clientes" },
  { value: "manicure", label: "Clientes de manicure" },
  { value: "cabelo", label: "Clientes de cabelo" },
  { value: "estetica", label: "Clientes de estética" },
  { value: "aniversariantes", label: "Aniversariantes do mês" },
  { value: "inativos", label: "Clientes inativos (30+ dias)" },
];

// ── Components ──

const StatusBadge = ({ status }: { status: Notification["status"] }) => {
  const map = {
    enviado: { label: "Enviado", className: "bg-[hsl(var(--salon-success))]/15 text-[hsl(var(--salon-success))] border-[hsl(var(--salon-success))]/30" },
    falhou: { label: "Falhou", className: "bg-destructive/15 text-destructive border-destructive/30" },
    agendado: { label: "Agendado", className: "bg-[hsl(var(--salon-warning))]/15 text-[hsl(var(--salon-warning))] border-[hsl(var(--salon-warning))]/30" },
  };
  const s = map[status];
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
};

const TypeBadge = ({ type }: { type: Notification["type"] }) => {
  const map = {
    lembrete: { label: "Lembrete", className: "bg-primary/15 text-primary border-primary/30" },
    pacote: { label: "Pacote", className: "bg-accent/15 text-accent border-accent/30" },
    personalizada: { label: "Personalizada", className: "bg-secondary text-secondary-foreground border-border" },
  };
  const t = map[type];
  return <Badge variant="outline" className={t.className}>{t.label}</Badge>;
};

const NotificationsPage = () => {
  const [history, setHistory] = useState(mockHistory);
  const [reminders, setReminders] = useState(mockAutoReminders);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [newOpen, setNewOpen] = useState(false);

  // New notification form
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newSegment, setNewSegment] = useState("todas");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [sendMode, setSendMode] = useState<"segment" | "individual">("segment");

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    toast.success("Configuração atualizada!");
  };

  const handleSend = () => {
    if (!newTitle.trim() || !newMessage.trim()) {
      toast.error("Preencha título e mensagem.");
      return;
    }
    const recipients =
      sendMode === "segment"
        ? [segments.find((s) => s.value === newSegment)?.label ?? ""]
        : mockClients.filter((c) => selectedClients.includes(c.id)).map((c) => c.name);

    if (recipients.length === 0) {
      toast.error("Selecione ao menos uma destinatária.");
      return;
    }

    const entry: Notification = {
      id: String(Date.now()),
      type: "personalizada",
      title: newTitle,
      message: newMessage,
      sentAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: "enviado",
      recipients,
      segment: sendMode === "segment" ? newSegment : undefined,
    };
    setHistory((prev) => [entry, ...prev]);
    setNewTitle("");
    setNewMessage("");
    setSelectedClients([]);
    setNewOpen(false);
    toast.success(`Notificação enviada para ${recipients.length} destinatária(s)!`);
  };

  const filtered = history.filter((n) => {
    const matchSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.recipients.some((r) => r.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === "todos" || n.type === filterType;
    return matchSearch && matchType;
  });

  const stats = {
    total: history.length,
    enviados: history.filter((n) => n.status === "enviado").length,
    falhas: history.filter((n) => n.status === "falhou").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
          <p className="text-sm text-muted-foreground">Gerencie lembretes e comunicações com suas clientes</p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Notificação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar Notificação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Promoção especial" />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escreva a mensagem..." rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Enviar para</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant={sendMode === "segment" ? "default" : "outline"} onClick={() => setSendMode("segment")}>
                    <Users className="mr-1 h-3 w-3" /> Segmento
                  </Button>
                  <Button size="sm" variant={sendMode === "individual" ? "default" : "outline"} onClick={() => setSendMode("individual")}>
                    <Filter className="mr-1 h-3 w-3" /> Individual
                  </Button>
                </div>
              </div>

              {sendMode === "segment" ? (
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Select value={newSegment} onValueChange={setNewSegment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {segments.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border border-border p-3">
                  {mockClients.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <Checkbox
                        checked={selectedClients.includes(c.id)}
                        onCheckedChange={(checked) =>
                          setSelectedClients((prev) =>
                            checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                          )
                        }
                      />
                      <span className="text-sm">{c.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">{c.category}</Badge>
                    </label>
                  ))}
                </div>
              )}

              <Button onClick={handleSend} className="w-full gap-2">
                <Send className="h-4 w-4" /> Enviar agora
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total enviadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--salon-success))]/10">
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--salon-success))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.enviados}</p>
              <p className="text-xs text-muted-foreground">Entregues</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.falhas}</p>
              <p className="text-xs text-muted-foreground">Falhas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="historico" className="space-y-4">
        <TabsList>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="automaticas">Automáticas</TabsTrigger>
        </TabsList>

        {/* Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por título ou destinatária..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="lembrete">Lembretes</SelectItem>
                <SelectItem value="pacote">Pacotes</SelectItem>
                <SelectItem value="personalizada">Personalizadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="hidden md:table-cell">Destinatárias</TableHead>
                    <TableHead className="hidden sm:table-cell">Enviado em</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma notificação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell><TypeBadge type={n.type} /></TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{n.recipients.join(", ")}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{n.sentAt}</TableCell>
                        <TableCell><StatusBadge status={n.status} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automáticas */}
        <TabsContent value="automaticas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Lembretes Automáticos
              </CardTitle>
              <CardDescription>Configure quais notificações são enviadas automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      {r.type === "atendimento" && <Calendar className="h-4 w-4 text-primary" />}
                      {r.type.startsWith("pacote") && <Package className="h-4 w-4 text-primary" />}
                      {r.type === "aniversario" && <Bell className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.description}</p>
                      <p className="text-xs text-muted-foreground">Disparo: {r.timing}</p>
                    </div>
                  </div>
                  <Switch checked={r.enabled} onCheckedChange={() => toggleReminder(r.id)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
