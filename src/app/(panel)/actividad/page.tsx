"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import styles from "./actividad.module.css";

interface AuditEntry {
  id: string;
  path: string;
  method: string;
  statusCode: number;
  errorMessage: string | null;
  apiKeyName: string | null;
  templateId: string | null;
  to: string | null;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

function statusVariant(code: number) {
  if (code >= 200 && code < 300) return "default";
  if (code >= 400 && code < 500) return "secondary";
  return "destructive";
}

function statusLabel(code: number) {
  switch (code) {
    case 200:
      return "OK";
    case 400:
      return "Bad request";
    case 401:
      return "No autorizado";
    case 500:
      return "Error servidor";
    default:
      return `HTTP ${code}`;
  }
}

export default function ActividadPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (statusFilter !== "all") params.set("statusCode", statusFilter);

      const res = await fetch(`/api/audit?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Error al cargar actividad");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Actividad API</h1>
        <p className={styles.subtitle}>
          Todas las llamadas a la API desde sistemas externos (éxitos y fallos)
        </p>
        <div className={styles.filters}>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className={styles.filterSelect}>
              <SelectValue placeholder="Estado HTTP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="200">200 OK</SelectItem>
              <SelectItem value="400">400 Bad request</SelectItem>
              <SelectItem value="401">401 No autorizado</SelectItem>
              <SelectItem value="500">500 Error servidor</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchLogs}>
            Actualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Cargando...</div>
      ) : !data || data.logs.length === 0 ? (
        <div className={styles.empty}>
          No hay registros de actividad API aún.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Plantilla</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className={styles.mono}>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className={styles.mono}>{log.path}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(log.statusCode)}>
                      {statusLabel(log.statusCode)}
                    </Badge>
                  </TableCell>
                  <TableCell className={styles.mono}>
                    {log.apiKeyName ?? "—"}
                  </TableCell>
                  <TableCell className={styles.mono}>{log.to ?? "—"}</TableCell>
                  <TableCell className={styles.mono}>
                    {log.templateId ? log.templateId.slice(0, 12) + "…" : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className={styles.pagination}>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className={styles.pageInfo}>
              Página {data.page} de {data.totalPages} ({data.total} registros)
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de la solicitud</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className={styles.detail}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha</span>
                <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Ruta</span>
                <span className={styles.mono}>{selectedLog.path}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Método</span>
                <span className={styles.mono}>{selectedLog.method}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Estado HTTP</span>
                <Badge variant={statusVariant(selectedLog.statusCode)}>
                  {selectedLog.statusCode} {statusLabel(selectedLog.statusCode)}
                </Badge>
              </div>
              {selectedLog.apiKeyName && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>API Key</span>
                  <span>{selectedLog.apiKeyName}</span>
                </div>
              )}
              {selectedLog.templateId && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Plantilla ID</span>
                  <code className={styles.mono}>{selectedLog.templateId}</code>
                </div>
              )}
              {selectedLog.to && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Destinatario</span>
                  <span>{selectedLog.to}</span>
                </div>
              )}
              {selectedLog.errorMessage && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Error</span>
                  <span className={styles.errorText}>
                    {selectedLog.errorMessage}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
