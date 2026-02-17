import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const nowStr = now.toISOString();

    // Get appointments in the next 25 hours that are approved
    const futureLimit = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const today = now.toISOString().split("T")[0];
    const tomorrow = futureLimit.toISOString().split("T")[0];

    const { data: appointments, error: fetchErr } = await supabase
      .from("appointments")
      .select("id, appointment_date, start_time, client_user_id, service_id, salon_id, status")
      .in("appointment_date", [today, tomorrow])
      .eq("status", "aprovado");

    if (fetchErr) {
      console.error("Error fetching appointments:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming appointments", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get service names
    const serviceIds = [...new Set(appointments.map((a) => a.service_id))];
    const { data: services } = await supabase
      .from("services")
      .select("id, name")
      .in("id", serviceIds);
    const serviceMap: Record<string, string> = {};
    (services || []).forEach((s: any) => { serviceMap[s.id] = s.name; });

    // Check existing reminder notifications to avoid duplicates
    const appointmentIds = appointments.map((a) => a.id);
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("reference_id, type")
      .in("reference_id", appointmentIds)
      .in("type", ["lembrete_24h", "lembrete_2h"]);

    const existingSet = new Set(
      (existingNotifs || []).map((n: any) => `${n.reference_id}_${n.type}`)
    );

    const notificationsToInsert: any[] = [];

    for (const appt of appointments) {
      const apptDateTime = new Date(`${appt.appointment_date}T${appt.start_time}`);
      const diffMs = apptDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const serviceName = serviceMap[appt.service_id] || "Serviço";
      const timeStr = appt.start_time.slice(0, 5);

      // 24h reminder: between 23-25 hours before
      if (diffHours > 0 && diffHours <= 25 && diffHours > 3) {
        const key24 = `${appt.id}_lembrete_24h`;
        if (!existingSet.has(key24)) {
          notificationsToInsert.push({
            user_id: appt.client_user_id,
            salon_id: appt.salon_id,
            type: "lembrete_24h",
            title: "Lembrete: atendimento amanhã! 📅",
            message: `Seu ${serviceName} está agendado para amanhã às ${timeStr}. Não esqueça!`,
            reference_id: appt.id,
          });
          existingSet.add(key24);
        }
      }

      // 2h reminder: between 0-3 hours before
      if (diffHours > 0 && diffHours <= 3) {
        const key2 = `${appt.id}_lembrete_2h`;
        if (!existingSet.has(key2)) {
          notificationsToInsert.push({
            user_id: appt.client_user_id,
            salon_id: appt.salon_id,
            type: "lembrete_2h",
            title: "Seu atendimento é daqui a pouco! ⏰",
            message: `${serviceName} às ${timeStr}. Estamos te esperando!`,
            reference_id: appt.id,
          });
          existingSet.add(key2);
        }
      }
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notificationsToInsert);
      if (insertErr) {
        console.error("Error inserting notifications:", insertErr);
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Sent ${notificationsToInsert.length} reminders`);
    return new Response(
      JSON.stringify({ message: "Reminders processed", sent: notificationsToInsert.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
