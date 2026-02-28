import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Package, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface EligiblePackage {
  clientPackageId: string;
  packageName: string;
  sessionsUsed: number;
  totalSessions: number;
  expiresAt: string;
}

interface PackageConsumptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligiblePackages: EligiblePackage[];
  serviceName: string;
  onConfirmConsume: (clientPackageId: string) => Promise<void>;
  onSkip: (reason: string) => Promise<void>;
  loading?: boolean;
}

const PackageConsumptionModal = ({
  open,
  onOpenChange,
  eligiblePackages,
  serviceName,
  onConfirmConsume,
  onSkip,
  loading = false,
}: PackageConsumptionModalProps) => {
  const [mode, setMode] = useState<"consumir" | "nao_consumir">("consumir");
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    eligiblePackages[0]?.clientPackageId ?? ""
  );
  const [skipReason, setSkipReason] = useState("");

  const handleConfirm = async () => {
    if (mode === "consumir") {
      await onConfirmConsume(selectedPackageId);
    } else {
      if (!skipReason.trim()) return;
      await onSkip(skipReason.trim());
    }
  };

  const canConfirm =
    mode === "consumir"
      ? !!selectedPackageId
      : skipReason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Consumo de pacote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>
              O cliente possui pacote(s) com saldo para <strong>{serviceName}</strong>. Escolha como registrar este atendimento.
            </span>
          </div>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "consumir" | "nao_consumir")} className="space-y-3">
            <div className="flex items-start space-x-3 rounded-md border p-3">
              <RadioGroupItem value="consumir" id="r-consumir" className="mt-0.5" />
              <Label htmlFor="r-consumir" className="cursor-pointer flex-1">
                <span className="font-medium">Confirmar consumo de sessão</span>
                <p className="text-xs text-muted-foreground mt-0.5">Deduz 1 sessão do pacote selecionado</p>
              </Label>
            </div>
            <div className="flex items-start space-x-3 rounded-md border p-3">
              <RadioGroupItem value="nao_consumir" id="r-nao" className="mt-0.5" />
              <Label htmlFor="r-nao" className="cursor-pointer flex-1">
                <span className="font-medium">Não consumir (pagou à parte)</span>
                <p className="text-xs text-muted-foreground mt-0.5">Mantém o saldo do pacote intacto</p>
              </Label>
            </div>
          </RadioGroup>

          {mode === "consumir" && eligiblePackages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selecionar pacote</Label>
              <RadioGroup
                value={selectedPackageId}
                onValueChange={setSelectedPackageId}
                className="space-y-2"
              >
                {eligiblePackages.map((ep) => {
                  const remaining = ep.totalSessions - ep.sessionsUsed;
                  return (
                    <div key={ep.clientPackageId} className="flex items-start space-x-3 rounded-md border px-3 py-2">
                      <RadioGroupItem value={ep.clientPackageId} id={`pkg-${ep.clientPackageId}`} className="mt-0.5" />
                      <Label htmlFor={`pkg-${ep.clientPackageId}`} className="cursor-pointer flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{ep.packageName}</span>
                          <Badge variant="outline" className="text-xs">
                            {remaining} sessão(ões) restante(s)
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Válido até {format(new Date(ep.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {mode === "nao_consumir" && (
            <div className="space-y-2">
              <Label htmlFor="skip-reason" className="text-sm font-medium">
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="skip-reason"
                placeholder="Ex: Cliente pagou à parte em dinheiro"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="resize-none"
                rows={3}
              />
              {skipReason.trim().length === 0 && (
                <p className="text-xs text-destructive">Informe o motivo para não consumir o pacote.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || loading}>
            {loading ? "Salvando..." : mode === "consumir" ? "Confirmar consumo" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PackageConsumptionModal;
