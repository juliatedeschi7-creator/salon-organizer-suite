import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AnamnesesPage = () => {
  const mockForms = [
    { type: "Manicure / Pedicure", version: 2, responses: 18, lastUpdate: "10/02/2026" },
    { type: "Cabelo", version: 1, responses: 12, lastUpdate: "08/02/2026" },
    { type: "Estética / Maquiagem", version: 3, responses: 9, lastUpdate: "05/02/2026" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Anamnese</h1>
        <p className="text-sm text-muted-foreground">Fichas de avaliação das clientes</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {mockForms.map((f) => (
          <Card key={f.type} className="cursor-pointer transition hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-5 w-5 text-primary" />
                {f.type}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Versão</span>
                <Badge variant="outline">{f.version}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Respostas</span>
                <span className="font-medium">{f.responses}</span>
              </div>
              <p className="text-xs text-muted-foreground">Atualizado em {f.lastUpdate}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AnamnesesPage;
