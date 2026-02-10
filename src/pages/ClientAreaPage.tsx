import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalon } from "@/contexts/SalonContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Package, Clock } from "lucide-react";

const ClientAreaPage = () => {
  const { user } = useAuth();
  const { salon } = useSalon();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {user?.name?.split(" ")[0]} 💅</h1>
        <p className="text-sm text-muted-foreground">Bem-vinda ao {salon.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer transition hover:shadow-md">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Agendar</p>
              <p className="text-xs text-muted-foreground">Marque um horário</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition hover:shadow-md">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Fichas</p>
              <p className="text-xs text-muted-foreground">Anamnese e histórico</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition hover:shadow-md">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Package className="h-8 w-8 text-accent" />
            <div>
              <p className="font-semibold">Pacotes</p>
              <p className="text-xs text-muted-foreground">Seus pacotes ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximos agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "12/02", time: "14:00", service: "Manicure + Pedicure" },
              { date: "19/02", time: "10:00", service: "Escova progressiva" },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{a.service}</p>
                    <p className="text-xs text-muted-foreground">{a.date} às {a.time}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Detalhes</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAreaPage;
