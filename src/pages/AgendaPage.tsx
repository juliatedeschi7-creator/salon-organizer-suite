import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";

const AgendaPage = () => {
  const mockAppointments = [
    { time: "09:00", client: "Ana Souza", service: "Corte + Escova", status: "confirmado" },
    { time: "10:30", client: "Carla Lima", service: "Manicure", status: "agendado" },
    { time: "13:00", client: "Julia Santos", service: "Coloração", status: "confirmado" },
    { time: "15:00", client: "Mariana Costa", service: "Pedicure", status: "agendado" },
    { time: "16:30", client: "Beatriz Lima", service: "Escova progressiva", status: "confirmado" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground">Gerencie os agendamentos do seu salão</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Agendamentos de hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockAppointments.map((a) => (
              <div
                key={a.time}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{a.time}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.client}</p>
                    <p className="text-xs text-muted-foreground">{a.service}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    a.status === "confirmado"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgendaPage;
