import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Users, Building2, Trash2 } from "lucide-react";

const AdminPage = () => {
  const mockUsers = [
    { id: "1", name: "Marina Silva", email: "marina@teste.com", role: "dono", salon: "Studio Beleza" },
    { id: "2", name: "Carlos Rocha", email: "carlos@teste.com", role: "funcionario", salon: "Studio Beleza" },
    { id: "3", name: "Fernanda Lima", email: "fernanda@teste.com", role: "dono", salon: "Salão Glamour" },
  ];

  const mockSalons = [
    { id: "1", name: "Studio Beleza", owner: "Marina Silva", status: "ativo" },
    { id: "2", name: "Salão Glamour", owner: "Fernanda Lima", status: "pendente" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Painel Administrativo
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários e salões da plataforma</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Usuários ({mockUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · {u.salon}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                    {u.role}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Salões ({mockSalons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockSalons.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">Dono: {s.owner}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.status === "ativo" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground"
                    }`}
                  >
                    {s.status}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
