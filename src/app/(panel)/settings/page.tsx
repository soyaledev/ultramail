"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import styles from "./settings.module.css";

interface ApiKeyEntry {
  id: string;
  name: string;
  key: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [gmailStatus, setGmailStatus] = useState<
    "checking" | "ok" | "error"
  >("checking");
  const [gmailError, setGmailError] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
    checkGmail();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      setKeys(data);
    } catch {
      toast.error("Error al cargar API keys");
    } finally {
      setLoading(false);
    }
  }

  async function checkGmail() {
    setGmailError(null);
    try {
      const res = await fetch("/api/gmail-status");
      const data = await res.json();
      setGmailStatus(data.connected ? "ok" : "error");
      if (data.error) setGmailError(data.error);
    } catch {
      setGmailStatus("error");
    }
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) {
      toast.error("Nombre requerido");
      return;
    }

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!res.ok) {
        toast.error("Error al crear API key");
        return;
      }

      const data = await res.json();
      setCreatedKey(data.key);
      setNewKeyName("");
      fetchKeys();
      toast.success("API key creada");
    } catch {
      toast.error("Error de conexión");
    }
  }

  async function handleToggleKey(id: string, active: boolean) {
    try {
      await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      fetchKeys();
      toast.success(active ? "API key activada" : "API key desactivada");
    } catch {
      toast.error("Error al actualizar");
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("¿Eliminar esta API key?")) return;

    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE" });
      fetchKeys();
      toast.success("API key eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>Estado de Gmail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.gmailStatus}>
            <Badge
              variant={
                gmailStatus === "ok"
                  ? "default"
                  : gmailStatus === "checking"
                  ? "secondary"
                  : "destructive"
              }
            >
              {gmailStatus === "ok"
                ? "Conectado"
                : gmailStatus === "checking"
                ? "Verificando..."
                : "Desconectado"}
            </Badge>
            <span className={styles.gmailHint}>
              {gmailStatus === "error" &&
                (gmailError || "Verifica las variables de entorno GMAIL_* en tu configuración.")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className={styles.keysHeader}>
            <CardTitle>API Keys</CardTitle>
            <Button onClick={() => setNewKeyDialog(true)}>Nueva API Key</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Cargando...</div>
          ) : keys.length === 0 ? (
            <p className={styles.empty}>
              No hay API keys. Crea una para conectar tus sistemas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className={styles.nameCell}>{k.name}</TableCell>
                    <TableCell>
                      <code className={styles.keyCode}>{k.key}</code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={k.active ? "default" : "secondary"}
                      >
                        {k.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {k.lastUsedAt
                        ? new Date(k.lastUsedAt).toLocaleString()
                        : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <div className={styles.keyActions}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleKey(k.id, !k.active)
                          }
                        >
                          {k.active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteKey(k.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createdKey ? "API Key creada" : "Nueva API Key"}
            </DialogTitle>
          </DialogHeader>

          {createdKey ? (
            <div className={styles.createdKey}>
              <p className={styles.createdKeyWarning}>
                Copia esta key ahora. No podrás verla completa de nuevo.
              </p>
              <code className={styles.fullKey}>{createdKey}</code>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(createdKey);
                  toast.success("Copiada al portapapeles");
                }}
              >
                Copiar
              </Button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Label htmlFor="key-name">
                  Nombre (ej: Sistema de Pagos)
                </Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Mi sistema"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setNewKeyDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateKey}>Crear</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
