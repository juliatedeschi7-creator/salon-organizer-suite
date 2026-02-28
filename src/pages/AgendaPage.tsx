import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSalon } from "@/contexts/SalonContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AppointmentCard from "@/components/agenda/AppointmentCard";
import AppointmentFormDialog from "@/components/agenda/AppointmentFormDialog";
import PackageConsumptionModal, { EligiblePackage } from "@/components/agenda/PackageConsumptionModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  client_user_id: string;
  service_id: string;
  salon_id: string;
  created_at: string;
  service_name?: string;
  client_name?: string;
  package_consumption_status?: string;
}

const AgendaPage = () => {
  const { salon } = useSalon();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [consumptionAppointment, setConsumptionAppointment] = useState<Appointment | null>(null);
  const [eligiblePackages, setEligiblePackages] = useState<EligiblePackage[]>([]);
  const [consumptionLoading, setConsumptionLoading] = useState(false);

  const fetchAppointments = async () => {
    if (!salon) return;
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("salon_id", salon.id)
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) { console.error(error); setLoading(false); return; }

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

  useEffect(() => { fetchAppointments(); }, [salon]);

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

  const handleUpdateStatus = async (a: Appointment, newStatus: string) => {
    if (!salon || !user) return;
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", a.id);
    if (error) { toast.error("Erro ao atualizar: " + error.message); return; }

    const titleMap: Record<string, string> = {
      aprovado: "Agendamento confirmado! ✅",
      recusado: "Agendamento recusado",
      concluido: "Atendimento concluído! ✨",
    };
    const messageMap: Record<string, string> = {
      aprovado: `Seu agendamento de ${a.service_name} foi aprovado pelo salão.`,
      recusado: `Seu agendamento de ${a.service_name} foi recusado pelo salão.`,
      concluido: `Seu atendimento de ${a.service_name} foi concluído. Obrigado!`,
    };

    await supabase.from("notifications").insert({
      user_id: a.client_user_id,
      salon_id: salon.id,
      type: newStatus === "concluido" ? "agendamento_concluido" : newStatus === "aprovado" ? "agendamento_aprovado" : "agendamento_recusado",
      title: titleMap[newStatus] || "Atualização",
      message: messageMap[newStatus] || `Seu agendamento de ${a.service_name} foi atualizado.`,
      reference_id: a.id,
    });

    const toastMap: Record<string, string> = { aprovado: "Agendamento aprovado!", recusado: "Agendamento recusado.", concluido: "Atendimento concluído!" };
    toast.success(toastMap[newStatus] || "Status atualizado.");
    fetchAppointments();
  };

  const handleCompleteAppointment = async (a: Appointment) => {
    if (!salon || !user) return;

    // If already decided, complete directly
    if (a.package_consumption_status === "consumido" || a.package_consumption_status === "nao_consumir") {
      await handleUpdateStatus(a, "concluido");
      return;
    }

    // Query eligible active packages for this client + service
    const now = new Date().toISOString();
    const { data: clientPkgs, error } = await supabase
      .from("client_packages")
      .select("id, package_id, sessions_used, expires_at, status")
      .eq("client_user_id", a.client_user_id)
      .eq("salon_id", salon.id)
      .eq("status", "ativo")
      .gte("expires_at", now);

    if (error) {
      toast.error("Erro ao verificar pacotes: " + error.message);
      return;
    }

    if (!clientPkgs || clientPkgs.length === 0) {
      await handleUpdateStatus(a, "concluido");
      return;
    }

    // Get package details to filter by service_id and check remaining sessions
    const packageIds = clientPkgs.map((cp) => cp.package_id);
    const { data: pkgDetails } = await supabase
      .from("packages")
      .select("id, name, service_id, total_sessions")
      .in("id", packageIds)
      .eq("service_id", a.service_id);

    const eligible: EligiblePackage[] = (pkgDetails || []).flatMap((pkg) => {
      const cp = clientPkgs.find((c) => c.package_id === pkg.id);
      if (!cp) return [];
      const remaining = pkg.total_sessions - cp.sessions_used;
      if (remaining <= 0) return [];
      return [{
        clientPackageId: cp.id,
        packageName: pkg.name,
        sessionsUsed: cp.sessions_used,
        totalSessions: pkg.total_sessions,
        expiresAt: cp.expires_at,
      }];
    });

    if (eligible.length === 0) {
      await handleUpdateStatus(a, "concluido");
      return;
    }

    setEligiblePackages(eligible);
    setConsumptionAppointment(a);
  };

  const handleConfirmConsume = async (clientPackageId: string) => {
    if (!consumptionAppointment || !salon || !user) return;
    setConsumptionLoading(true);
    try {
      // Increment sessions_used
      const cp = eligiblePackages.find((e) => e.clientPackageId === clientPackageId);
      if (!cp) {
        toast.error("Pacote selecionado não encontrado.");
        return;
      }

      const { error: cpError } = await supabase
        .from("client_packages")
        .update({ sessions_used: cp.sessionsUsed + 1 })
        .eq("id", clientPackageId);
      if (cpError) { toast.error("Erro ao consumir sessão: " + cpError.message); return; }

      // Update appointment status + audit fields
      const { error: apptError } = await supabase
        .from("appointments")
        .update({
          status: "concluido",
          package_consumption_status: "consumido",
          package_consumed_client_package_id: clientPackageId,
          package_consumed_service_id: consumptionAppointment.service_id,
          package_consumed_at: new Date().toISOString(),
          package_consumed_by: user.id,
        })
        .eq("id", consumptionAppointment.id);
      if (apptError) { toast.error("Erro ao atualizar agendamento: " + apptError.message); return; }

      // Insert usage log
      const { error: usageError } = await supabase.from("client_package_usages").insert({
        salon_id: salon.id,
        client_package_id: clientPackageId,
        service_id: consumptionAppointment.service_id,
        appointment_id: consumptionAppointment.id,
        quantity: 1,
        used_by: user.id,
      });
      if (usageError) {
        console.error("Erro ao registrar log de consumo:", usageError.message);
      }

      // Notify client
      await supabase.from("notifications").insert({
        user_id: consumptionAppointment.client_user_id,
        salon_id: salon.id,
        type: "agendamento_concluido",
        title: "Atendimento concluído! ✨",
        message: `Seu atendimento de ${consumptionAppointment.service_name} foi concluído. 1 sessão do pacote foi utilizada. Obrigado!`,
        reference_id: consumptionAppointment.id,
      });

      toast.success("Atendimento concluído e sessão consumida do pacote!");
      setConsumptionAppointment(null);
      fetchAppointments();
    } finally {
      setConsumptionLoading(false);
    }
  };

  const handleSkipConsumption = async (reason: string) => {
    if (!consumptionAppointment || !salon || !user) return;
    setConsumptionLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "concluido",
          package_consumption_status: "nao_consumir",
          package_skip_reason: reason,
          package_consumed_by: user.id,
          package_consumed_at: new Date().toISOString(),
        })
        .eq("id", consumptionAppointment.id);
      if (error) { toast.error("Erro ao atualizar agendamento: " + error.message); return; }

      await supabase.from("notifications").insert({
        user_id: consumptionAppointment.client_user_id,
        salon_id: salon.id,
        type: "agendamento_concluido",
        title: "Atendimento concluído! ✨",
        message: `Seu atendimento de ${consumptionAppointment.service_name} foi concluído. Obrigado!`,
        reference_id: consumptionAppointment.id,
      });

      toast.success("Atendimento concluído sem consumir sessão do pacote.");
      setConsumptionAppointment(null);
      fetchAppointments();
    } finally {
      setConsumptionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("appointments").delete().eq("id", deletingId);
    if (error) { toast.error("Erro ao excluir: " + error.message); }
    else { toast.success("Agendamento excluído."); }
    setDeletingId(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie os agendamentos do seu salão</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditingAppointment(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo agendamento
        </Button>
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
              <AppointmentCard
                key={a.id}
                appointment={a}
                showDate
                onApprove={(ap) => handleUpdateStatus(ap, "aprovado")}
                onReject={(ap) => handleUpdateStatus(ap, "recusado")}
                onEdit={(ap) => { setEditingAppointment(ap); setFormOpen(true); }}
                onDelete={(ap) => setDeletingId(ap.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Today */}
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
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onComplete={(ap) => handleCompleteAppointment(ap)}
                  onEdit={(ap) => { setEditingAppointment(ap); setFormOpen(true); }}
                  onDelete={(ap) => setDeletingId(ap.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future */}
      {futureAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {futureAppointments.slice(0, 10).map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                showDate
                onComplete={(ap) => handleCompleteAppointment(ap)}
                onEdit={(ap) => { setEditingAppointment(ap); setFormOpen(true); }}
                onDelete={(ap) => setDeletingId(ap.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchAppointments}
        appointment={editingAppointment}
      />

      {/* Package Consumption Modal */}
      {consumptionAppointment && (
        <PackageConsumptionModal
          open={!!consumptionAppointment}
          onOpenChange={(open) => { if (!open) setConsumptionAppointment(null); }}
          eligiblePackages={eligiblePackages}
          serviceName={consumptionAppointment.service_name || "Serviço"}
          onConfirmConsume={handleConfirmConsume}
          onSkip={handleSkipConsumption}
          loading={consumptionLoading}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agendamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgendaPage;
