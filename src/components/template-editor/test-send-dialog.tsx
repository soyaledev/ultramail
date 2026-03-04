"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TestSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  variables: string[];
}

export function TestSendDialog({
  open,
  onOpenChange,
  templateId,
  variables,
}: TestSendDialogProps) {
  const [email, setEmail] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  function handleVarChange(key: string, value: string) {
    setVars((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSend() {
    if (!email) {
      toast.error("Ingresa un email de destino");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          to: email,
          variables: vars,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al enviar");
        return;
      }

      toast.success("Email de prueba enviado");
      onOpenChange(false);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar email de prueba</DialogTitle>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <Label htmlFor="test-email">Email de destino</Label>
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@ejemplo.com"
            />
          </div>

          {variables.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <Label>Variables de prueba</Label>
              {variables.map((v) => (
                <div
                  key={v}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      minWidth: 120,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {`{{${v}}}`}
                  </span>
                  <Input
                    value={vars[v] ?? ""}
                    onChange={(e) => handleVarChange(v, e.target.value)}
                    placeholder={`Valor para ${v}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Enviando..." : "Enviar prueba"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
