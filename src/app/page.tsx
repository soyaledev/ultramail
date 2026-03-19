"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import styles from "./landing.module.css";

export default function LandingPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!name.trim() || !email.trim()) {
      setError("Nombre y email son requeridos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      let data: { error?: string } = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(
          res.status >= 500
            ? "Error del servidor. Intenta más tarde."
            : "Error de conexión"
        );
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Error al registrar");
        return;
      }
      setSuccess(true);
      setName("");
      setEmail("");
      toast.success("¡Gracias! Te mantendremos informado.");
    } catch {
      setError("Error de conexión. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <div className={styles.hero}>
          <Image
            src="/Ultramail - logo.svg"
            alt="Ultramail"
            width={400}
            height={131}
            className={styles.heroLogo}
            priority
          />
          <h1 className={styles.heroTitle}>Microservicio de envío de emails</h1>
          <p className={styles.heroSubtitle}>
            Sistema privado para gestionar plantillas, enviar correos vía API y
            monitorear métricas. Por ahora no está abierto al público.
          </p>
          <div className={styles.heroCtas}>
            <Button asChild>
              <a
                href="https://github.com/soyaledev/ultramail"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver en GitHub
              </a>
            </Button>
            <Button variant="outline" onClick={scrollToForm}>
              Ser parte del proyecto
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cómo funciona</h2>
        <p className={styles.sectionSubtitle}>
          Crea plantillas HTML con variables, envíalas por API y analiza el
          rendimiento.
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepTitle}>1. Plantillas</div>
            <p className={styles.stepDesc}>
              Diseña plantillas con variables dinámicas. Editor HTML integrado.
            </p>
            <Image
              src="/Screenshot 2026-03-18 220636.png"
              alt="Editor de plantillas HTML con vista previa"
              width={600}
              height={400}
              className={styles.stepImage}
            />
          </div>
          <div className={styles.step}>
            <div className={styles.stepTitle}>2. API y envíos</div>
            <p className={styles.stepDesc}>
              Envía correos vía REST con API Keys. Integración con tus sistemas.
            </p>
            <div className={styles.stepPlaceholder}>
              API
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepTitle}>3. Métricas</div>
            <p className={styles.stepDesc}>
              Gráficos de envíos, tasa de éxito y alertas de remitentes.
            </p>
            <Image
              src="/Screenshot 2026-03-18 220804.png"
              alt="Panel de métricas y envíos por día"
              width={600}
              height={400}
              className={styles.stepImage}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Qué incluye</h2>
        <div className={styles.features}>
          <div className={styles.featureItem}>
            Plantillas HTML con variables {"{{variable}}"}
          </div>
          <div className={styles.featureItem}>
            API REST con autenticación por API Key
          </div>
          <div className={styles.featureItem}>
            Múltiples remitentes SMTP (Gmail, etc.)
          </div>
          <div className={styles.featureItem}>
            Historial de envíos y auditoría de actividad
          </div>
          <div className={styles.featureItem}>
            Métricas, gráficos y alertas de conexión
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>AIA — Herramienta innovadora</h2>
        <p className={`${styles.sectionSubtitle} ${styles.sectionSubtitleWhite}`}>
          La AIA (Asistente de Información para Agentes) es una interfaz pública
          que documenta todo el sistema Ultramail para que agentes de IA puedan
          leer la arquitectura, los modelos de datos y la API. Pensada para
          integración con MCP (Model Context Protocol), permite que asistentes
          como Cursor o Claude lean la documentación y configuren el sistema sin
          intervención manual. Creada por{" "}
          <a
            href="https://alekey.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.inlineLink}
          >
            Ale Trece
          </a>
          .
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contacto</h2>
        <p className={styles.sectionSubtitle}>
          Creado por Ale Trece. Seguime en redes o escribime a{" "}
          <span className={styles.emailText}>esequielalebar@gmail.com</span>
        </p>
        <div className={styles.contactLinks}>
          <a
            href="https://alekey.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contactBtn}
          >
            alekey.com.ar
          </a>
          <a
            href="https://github.com/soyaledev"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contactBtn}
          >
            GitHub
          </a>
          <a
            href="https://www.instagram.com/aletrece___/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contactBtn}
          >
            Instagram
          </a>
          <a
            href="https://www.tiktok.com/@treceale"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contactBtn}
          >
            TikTok
          </a>
        </div>
      </section>

      <section className={`${styles.section} ${styles.formSection}`} ref={formRef}>
        <h2 className={styles.sectionTitle}>Ser parte del proyecto</h2>
        <p className={styles.sectionSubtitle}>
          Dejá tu email para recibir actualizaciones y novedades del sistema.
        </p>
        <div className={styles.ctaForm}>
          <form onSubmit={handleNewsletterSubmit}>
            <div className={styles.formFields}>
              <div>
                <Label htmlFor="newsletter-name">Nombre</Label>
                <Input
                  id="newsletter-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="newsletter-email">Email</Label>
                <Input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  disabled={loading}
                />
              </div>
            </div>
            {error && <p className={styles.formError}>{error}</p>}
            {success && <p className={styles.formSuccess}>¡Registrado correctamente!</p>}
            <Button type="submit" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Enviando..." : "Registrarme"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
