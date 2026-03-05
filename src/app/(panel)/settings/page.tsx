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

interface SenderEntry {
  id: string;
  name: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  isDefault: boolean;
}

interface SenderStatus {
  id: string;
  name: string;
  fromEmail: string;
  isDefault: boolean;
  connected: boolean;
  error?: string;
}

interface SenderFormData {
  name: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  isDefault: boolean;
}

const EMPTY_SENDER_FORM: SenderFormData = {
  name: "",
  fromEmail: "",
  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  smtpUser: "",
  smtpPassword: "",
  isDefault: false,
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const [senders, setSenders] = useState<SenderEntry[]>([]);
  const [senderStatuses, setSenderStatuses] = useState<SenderStatus[]>([]);
  const [sendersLoading, setSendersLoading] = useState(true);
  const [senderDialogOpen, setSenderDialogOpen] = useState(false);
  const [senderDialogMode, setSenderDialogMode] = useState<"create" | "edit">("create");
  const [senderForm, setSenderForm] = useState<SenderFormData>(EMPTY_SENDER_FORM);
  const [editingSenderId, setEditingSenderId] = useState<string | null>(null);
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchKeys();
    fetchSenders();
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

  async function fetchSenders() {
    setSendersLoading(true);
    try {
      const [sendersRes, statusRes] = await Promise.all([
        fetch("/api/senders"),
        fetch("/api/senders/status"),
      ]);
      const sendersData = await sendersRes.json();
      const statusData = await statusRes.json();
      setSenders(sendersData);
      setSenderStatuses(statusData);
    } catch {
      toast.error("Error al cargar remitentes");
    } finally {
      setSendersLoading(false);
    }
  }

  async function verifySender(id: string) {
    setVerifyingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/senders/${id}/verify`);
      const data = await res.json();
      setSenderStatuses((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, connected: data.connected, error: data.error } : s
        )
      );
      if (data.connected) toast.success("Conexión verificada");
      else toast.error(data.error ?? "Error de verificación");
    } catch {
      toast.error("Error al verificar");
    } finally {
      setVerifyingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function openCreateSender() {
    setSenderDialogMode("create");
    setSenderForm(EMPTY_SENDER_FORM);
    setEditingSenderId(null);
    setSenderDialogOpen(true);
  }

  function openEditSender(s: SenderEntry) {
    setSenderDialogMode("edit");
    setSenderForm({
      name: s.name,
      fromEmail: s.fromEmail,
      smtpHost: s.smtpHost,
      smtpPort: String(s.smtpPort),
      smtpUser: s.smtpUser,
      smtpPassword: "",
      isDefault: s.isDefault,
    });
    setEditingSenderId(s.id);
    setSenderDialogOpen(true);
  }

  async function handleSaveSender() {
    const { name, fromEmail, smtpHost, smtpPort, smtpUser, smtpPassword, isDefault } =
      senderForm;
    if (!name.trim() || !fromEmail.trim() || !smtpUser.trim()) {
      toast.error("Nombre, email y usuario SMTP son requeridos");
      return;
    }
    if (senderDialogMode === "create" && !smtpPassword) {
      toast.error("La contraseña es requerida al crear");
      return;
    }
    const portNum = parseInt(smtpPort, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      toast.error("Puerto inválido");
      return;
    }

    try {
      if (senderDialogMode === "create") {
        const res = await fetch("/api/senders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            fromEmail: fromEmail.trim(),
            smtpHost: smtpHost.trim() || "smtp.gmail.com",
            smtpPort: portNum,
            smtpUser: smtpUser.trim(),
            smtpPassword,
            isDefault,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Error al crear remitente");
          return;
        }
        toast.success("Remitente creado");
      } else if (editingSenderId) {
        const body: Record<string, unknown> = {
          name: name.trim(),
          fromEmail: fromEmail.trim(),
          smtpHost: smtpHost.trim() || "smtp.gmail.com",
          smtpPort: portNum,
          smtpUser: smtpUser.trim(),
          isDefault,
        };
        if (smtpPassword) body.smtpPassword = smtpPassword;
        const res = await fetch(`/api/senders/${editingSenderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Error al actualizar remitente");
          return;
        }
        toast.success("Remitente actualizado");
      }
      setSenderDialogOpen(false);
      fetchSenders();
    } catch {
      toast.error("Error de conexión");
    }
  }

  async function handleSetDefaultSender(id: string) {
    try {
      await fetch(`/api/senders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      toast.success("Remitente predeterminado actualizado");
      fetchSenders();
    } catch {
      toast.error("Error al actualizar");
    }
  }

  async function handleDeleteSender(id: string) {
    if (!confirm("¿Eliminar este remitente?")) return;
    try {
      const res = await fetch(`/api/senders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al eliminar");
        return;
      }
      toast.success("Remitente eliminado");
      fetchSenders();
    } catch {
      toast.error("Error al eliminar");
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
          <div className={styles.keysHeader}>
            <CardTitle>Remitentes</CardTitle>
            <Button onClick={openCreateSender}>Nuevo remitente</Button>
          </div>
        </CardHeader>
        <CardContent>
          {sendersLoading ? (
            <div>Cargando...</div>
          ) : senders.length === 0 ? (
            <p className={styles.empty}>
              No hay remitentes. Crea uno para enviar correos (ej. con Gmail SMTP).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Predeterminado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {senders.map((s) => {
                  const status = senderStatuses.find((st) => st.id === s.id);
                  const isVerifying = verifyingIds.has(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className={styles.nameCell}>{s.name}</TableCell>
                      <TableCell>{s.fromEmail}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            status?.connected
                              ? "default"
                              : isVerifying
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {isVerifying
                            ? "Verificando..."
                            : status?.connected
                            ? "Verificado"
                            : status?.error ?? "Error"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.isDefault ? (
                          <Badge variant="secondary">Sí</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultSender(s.id)}
                          >
                            Marcar predeterminado
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={styles.keyActions}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verifySender(s.id)}
                            disabled={isVerifying}
                          >
                            Verificar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSender(s)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSender(s.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={senderDialogOpen} onOpenChange={setSenderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {senderDialogMode === "create" ? "Nuevo remitente" : "Editar remitente"}
            </DialogTitle>
          </DialogHeader>
          <p className={styles.gmailHint}>
            Para Gmail, usa una Contraseña de aplicación (Google Account → Seguridad
            → Contraseñas de aplicaciones).
          </p>
          <div className={styles.senderForm}>
            <div>
              <Label htmlFor="sender-name">Nombre</Label>
              <Input
                id="sender-name"
                value={senderForm.name}
                onChange={(e) =>
                  setSenderForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Mi correo personal"
              />
            </div>
            <div>
              <Label htmlFor="sender-email">Email (From)</Label>
              <Input
                id="sender-email"
                type="email"
                value={senderForm.fromEmail}
                onChange={(e) =>
                  setSenderForm((f) => ({ ...f, fromEmail: e.target.value }))
                }
                placeholder="ejemplo@gmail.com"
              />
            </div>
            <div>
              <Label htmlFor="sender-host">Host SMTP</Label>
              <Input
                id="sender-host"
                value={senderForm.smtpHost}
                onChange={(e) =>
                  setSenderForm((f) => ({ ...f, smtpHost: e.target.value }))
                }
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <Label htmlFor="sender-port">Puerto</Label>
              <Input
                id="sender-port"
                type="number"
                value={senderForm.smtpPort}
                onChange={(e) =>
                  setSenderForm((f) => ({ ...f, smtpPort: e.target.value }))
                }
                placeholder="587"
              />
            </div>
            <div>
              <Label htmlFor="sender-user">Usuario SMTP</Label>
              <Input
                id="sender-user"
                value={senderForm.smtpUser}
                onChange={(e) =>
                  setSenderForm((f) => ({ ...f, smtpUser: e.target.value }))
                }
                placeholder="ejemplo@gmail.com"
              />
            </div>
            <div>
              <Label htmlFor="sender-password">
                Contraseña{senderDialogMode === "edit" && " (dejar en blanco para no cambiar)"}
              </Label>
              <Input
                id="sender-password"
                type="password"
                value={senderForm.smtpPassword}
                onChange={(e) =>
                  setSenderForm((f) => ({ ...f, smtpPassword: e.target.value }))
                }
                placeholder={
                  senderDialogMode === "create" ? "Contraseña de aplicación" : ""
                }
              />
            </div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={senderForm.isDefault}
                onChange={(e) =>
                  setSenderForm((f) => ({ ...f, isDefault: e.target.checked }))
                }
              />
              Usar como predeterminado
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSenderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSender}>
              {senderDialogMode === "create" ? "Crear" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
