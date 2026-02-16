import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
  client_user_id: string;
  service_id: string;
  salon_id: string;
  created_at: string;
  service_name?: string;
  client_name?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  aprovado: { label: "Aprovado", className: "bg-primary/15 text-primary border-primary/30" },
  recusado: { label: "Recusado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border" },
  concluido: { label: "Concluído", className: "bg-green-500/15 text-green-700 border-green-500/30" },
};

const AgendaPage = () => {
  const { salon } = useSalon();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    if (!salon) return;
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("salon_id", salon.id)
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) { console.error(error); setLoading(false); return; }

    // Fetch service names and client names
    const serviceIds = [...new Set((data || []).map((a: any) => a.service_id))];
    const clientIds = [...new Set((data || []).map((a: any) => a.client_user_id))];

    const [servicesRes, profilesRes] = await Promise.all([
      serviceIds.length > 0
        ? supabase.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] }),
      clientIds.length > 0
        ? supabase.from("profiles").select("user_id, name").in("user_id", clientIds)
        : Promise.resolve({ data: [] }),
    ]);

    const serviceMap = Object.fromEntries((servicesRes.data || []).map((s: any) => [s.id, s.name]));
    const profileMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.user_id, p.name]));

    setAppointments(
      (data || []).map((a: any) => ({
        ...a,
        service_name: serviceMap[a.service_id] || "Serviço",
        client_name: profileMap[a.client_user_id] || "Cliente",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [salon]);

  // Realtime subscription
  useEffect(() => {
    if (!salon) return;
    const channel = supabase
      .channel("appointments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `salon_id=eq.${salon.id}` }, () => {
        fetchAppointments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [salon]);

  const handleUpdateStatus = async (appointmentId: string, newStatus: string, clientUserId: string, serviceName: string) => {
    if (!salon || !user) return;
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }

    // Notify client
    const titleMap: Record<string, string> = {
      aprovado: "Agendamento confirmado! ✅",
      recusado: "Agendamento recusado",
      concluido: "Atendimento concluído! ✨",
    };
    const messageMap: Record<string, string> = {
      aprovado: `Seu agendamento de ${serviceName} foi aprovado pelo salão.`,
      recusado: `Seu agendamento de ${serviceName} foi recusado pelo salão.`,
      concluido: `Seu atendimento de ${serviceName} foi concluído. Obrigado!`,
    };

    await supabase.from("notifications").insert({
      user_id: clientUserId,
      salon_id: salon.id,
      type: newStatus === "concluido" ? "agendamento_concluido" : newStatus === "aprovado" ? "agendamento_aprovado" : "agendamento_recusado",
      title: titleMap[newStatus] || "Atualização",
      message: messageMap[newStatus] || `Seu agendamento de ${serviceName} foi atualizado.`,
      reference_id: appointmentId,
    });

    const toastMap: Record<string, string> = { aprovado: "Agendamento aprovado!", recusado: "Agendamento recusado.", concluido: "Atendimento concluído!" };
    toast.success(toastMap[newStatus] || "Status atualizado.");
    fetchAppointments();
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments.filter((a) => a.appointment_date === today);
  const pendingAppointments = appointments.filter((a) => a.status === "pendente");
  const futureAppointments = appointments.filter((a) => a.appointment_date >= today && a.status !== "pendente");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground">Gerencie os agendamentos do seu salão</p>
      </div>

      {/* Pending approvals */}
      {pendingAppointments.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-yellow-700">
              <Clock className="h-5 w-5" />
              Aguardando aprovação ({pendingAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.service_name} — {format(new Date(a.appointment_date + "T00:00:00"), "dd/MM", { locale: ptBR })} às {a.start_time?.slice(0, 5)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-green-600 hover:bg-green-50" onClick={() => handleUpdateStatus(a.id, "aprovado", a.client_user_id, a.service_name || "")}>
                    <Check className="h-3 w-3" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleUpdateStatus(a.id, "recusado", a.client_user_id, a.service_name || "")}>
                    <X className="h-3 w-3" /> Recusar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Today's appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Agendamentos de hoje — {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum agendamento para hoje</p>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-primary">{a.start_time?.slice(0, 5)}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.client_name}</p>
                      <p className="text-xs text-muted-foreground">{a.service_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "aprovado" && (
                      <Button size="sm" variant="outline" className="gap-1 text-green-600 hover:bg-green-50" onClick={() => handleUpdateStatus(a.id, "concluido", a.client_user_id, a.service_name || "")}>
                        <Check className="h-3 w-3" /> Concluir
                      </Button>
                    )}
                    <Badge variant="outline" className={statusMap[a.status]?.className}>
                      {statusMap[a.status]?.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future appointments */}
      {futureAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {futureAppointments.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {format(new Date(a.appointment_date + "T00:00:00"), "dd/MM", { locale: ptBR })} {a.start_time?.slice(0, 5)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.client_name}</p>
                    <p className="text-xs text-muted-foreground">{a.service_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.status === "aprovado" && (
                    <Button size="sm" variant="outline" className="gap-1 text-green-600 hover:bg-green-50" onClick={() => handleUpdateStatus(a.id, "concluido", a.client_user_id, a.service_name || "")}>
                      <Check className="h-3 w-3" /> Concluir
                    </Button>
                  )}
                  <Badge variant="outline" className={statusMap[a.status]?.className}>
                    {statusMap[a.status]?.label}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgendaPage;
