import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Mail } from "lucide-react";

const ClientesPage = () => {
  const mockClients = [
    { name: "Ana Souza", email: "ana@email.com", phone: "(11) 99999-1111" },
    { name: "Carla Lima", email: "carla@email.com", phone: "(11) 99999-2222" },
    { name: "Julia Santos", email: "julia@email.com", phone: "(11) 99999-3333" },
    { name: "Mariana Costa", email: "mariana@email.com", phone: "(11) 99999-4444" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground">Gerencie as clientes do seu salão</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Lista de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockClients.map((c) => (
              <div key={c.email} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientesPage;
