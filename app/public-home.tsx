"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { PublicActivity } from "../lib/activity-types";
import PublicView from "./public-view";

type PublicHomeProps = {
  initialActivities: PublicActivity[];
};

type SubmitState = "idle" | "sending" | "success" | "error";

function normaliseActivities(value: unknown): PublicActivity[] | null {
  if (!value || typeof value !== "object") return null;
  const activities = (value as { activities?: unknown }).activities;
  return Array.isArray(activities) ? (activities as PublicActivity[]) : null;
}

function activityTimestamp(activity: PublicActivity) {
  return typeof activity.startAt === "number" ? activity.startAt : null;
}

function isCompleted(activity: PublicActivity) {
  return activity.eventStatus.toLowerCase().includes("complet");
}

// Réplica en el cliente de la visibilidad que aplica el servidor
// (`listPublicActivities`): publicada, o programada cuya fecha ya llegó, y
// siempre dentro de su ventana publishAt/unpublishAt. Mientras `now` es 0
// (antes de hidratar) se confía en el filtrado que ya hizo el servidor.
function isPubliclyVisible(activity: PublicActivity, now: number) {
  const publishAt = typeof activity.publishAt === "number" ? activity.publishAt : null;
  const unpublishAt = typeof activity.unpublishAt === "number" ? activity.unpublishAt : null;
  const reached = now === 0 || publishAt === null || publishAt <= now;
  const notExpired = now === 0 || unpublishAt === null || unpublishAt > now;
  const editoriallyLive =
    activity.editorialStatus === "published" ||
    (activity.editorialStatus === "scheduled" && publishAt !== null);
  return editoriallyLive && reached && notExpired;
}

export default function PublicHome({ initialActivities }: PublicHomeProps) {
  const [activities, setActivities] = useState(initialActivities);
  const [modalOpen, setModalOpen] = useState(false);
  const [dateStatus, setDateStatus] = useState<"confirmed" | "tbd">("confirmed");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [refreshNotice, setRefreshNotice] = useState("");
  const [now, setNow] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;

    async function refreshActivities() {
      try {
        const response = await fetch("/api/activities", {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) throw new Error("No se pudo actualizar la agenda");
        const next = normaliseActivities(await response.json());
        if (active && next) {
          setActivities(next);
          setRefreshNotice("Agenda actualizada");
        }
      } catch {
        if (active) setRefreshNotice("Mostrando la última agenda disponible");
      }
    }

    const initialClock = window.setTimeout(() => setNow(Math.floor(Date.now() / 1000)), 0);
    // La agenda solo consulta el servidor cuando la pestaña está visible;
    // al volver a la pestaña se refresca de inmediato.
    const interval = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
      if (!document.hidden) void refreshActivities();
    }, 60_000);

    function handleVisibility() {
      if (!document.hidden) {
        setNow(Math.floor(Date.now() / 1000));
        void refreshActivities();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearTimeout(initialClock);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => firstFieldRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, modalOpen]);

  const publishedActivities = useMemo(
    () =>
      activities
        .filter((activity) => isPubliclyVisible(activity, now))
        .sort((a, b) => {
          const aTime = activityTimestamp(a) ?? Number.MAX_SAFE_INTEGER;
          const bTime = activityTimestamp(b) ?? Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        }),
    [activities, now],
  );

  const agendaActivities = useMemo(
    () =>
      publishedActivities.filter((activity) => {
        if (isCompleted(activity)) return false;
        const timestamp = activityTimestamp(activity);
        return activity.dateStatus === "tbd" || timestamp === null || timestamp >= now;
      }),
    [now, publishedActivities],
  );

  const recentActivities = useMemo(
    () =>
      publishedActivities
        .filter((activity) => {
          const timestamp = activityTimestamp(activity);
          return isCompleted(activity) || (timestamp !== null && timestamp < now);
        })
        .sort((a, b) => (activityTimestamp(b) ?? 0) - (activityTimestamp(a) ?? 0))
        .slice(0, 3),
    [now, publishedActivities],
  );

  const heroActivity =
    agendaActivities.find((activity) => activity.featured) ??
    agendaActivities[0] ??
    publishedActivities.find((activity) => activity.featured) ??
    publishedActivities[0] ??
    null;

  const latestActivities = useMemo(
    () =>
      [...publishedActivities].sort(
        (a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0),
      ).slice(0, 3),
    [publishedActivities],
  );

  const disciplines = useMemo(
    () =>
      Array.from(
        new Set(publishedActivities.map((activity) => activity.sport.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [publishedActivities],
  );

  function openModal() {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setSubmitState("idle");
    setSubmitMessage("");
    setModalOpen(true);
  }

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const startValue = String(data.get("startAt") || "");
    const endValue = String(data.get("endAt") || "");
    const startAt = dateStatus === "confirmed" && startValue
      ? Math.floor(new Date(startValue).getTime() / 1000)
      : null;
    const endAt = dateStatus === "confirmed" && endValue
      ? Math.floor(new Date(endValue).getTime() / 1000)
      : null;

    if (dateStatus === "confirmed" && startAt === null) {
      setSubmitState("error");
      setSubmitMessage("Indica la fecha y hora de inicio o selecciona “Fecha por confirmar”.");
      return;
    }
    if (startAt !== null && endAt !== null && endAt < startAt) {
      setSubmitState("error");
      setSubmitMessage("La hora de cierre debe ser posterior a la hora de inicio.");
      return;
    }

    const optional = (name: string) => {
      const value = String(data.get(name) || "").trim();
      return value || undefined;
    };

    const payload = {
      title: String(data.get("title") || "").trim(),
      sport: String(data.get("sport") || "").trim(),
      municipality: String(data.get("municipality") || "").trim(),
      venue: String(data.get("venue") || "").trim(),
      summary: String(data.get("summary") || "").trim(),
      dateStatus,
      startAt,
      endAt,
      imageUrl: optional("imageUrl"),
      videoUrl: optional("videoUrl"),
      registrationUrl: optional("registrationUrl"),
      contactName: String(data.get("contactName") || "").trim(),
      contactEmail: String(data.get("contactEmail") || "").trim(),
      contactPhone: optional("contactPhone"),
      consent: data.get("consent") === "on",
      website: String(data.get("website") || ""),
    };

    setSubmitState("sending");
    setSubmitMessage("");
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || result.message || "No se pudo enviar la propuesta.");
      form.reset();
      setDateStatus("confirmed");
      setSubmitState("success");
      setSubmitMessage("Recibimos la propuesta. El equipo provincial la revisará antes de publicarla.");
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "No se pudo enviar la propuesta.");
    }
  }

  return (
    <>
      <PublicView
        heroActivity={heroActivity}
        latestActivities={latestActivities}
        agendaActivities={agendaActivities}
        recentActivities={recentActivities}
        disciplines={disciplines}
        publishedCount={publishedActivities.length}
        refreshNotice={refreshNotice}
        emptyMessage="Las próximas actividades aparecerán aquí cuando sean aprobadas."
        identityLine="San Juan se mueve"
        suggestedHandle="@MIDERECSanJuan"
        onOpenProposal={openModal}
      />

      {modalOpen && (
        <div className="proposal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <div
            className="proposal-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="proposal-title"
          >
            <button className="modal-close" type="button" aria-label="Cerrar formulario" onClick={closeModal}>×</button>

            {submitState === "success" ? (
              <div className="proposal-success" role="status">
                <span aria-hidden="true">✓</span>
                <p className="signal-label">Propuesta recibida</p>
                <h2 id="proposal-title">Gracias por sumar movimiento.</h2>
                <p>{submitMessage}</p>
                <button type="button" onClick={closeModal}>Cerrar</button>
              </div>
            ) : (
              <>
                <div className="dialog-heading">
                  <p className="signal-label">Comparte el movimiento</p>
                  <h2 id="proposal-title">Proponer una actividad</h2>
                  <p>La propuesta será revisada antes de aparecer en la agenda pública.</p>
                </div>

                <ol className="proposal-steps" aria-label="Proceso de publicación">
                  <li><span>01</span><strong>Completa</strong><small>2–3 minutos</small></li>
                  <li><span>02</span><strong>Revisamos</strong><small>Datos y enlaces</small></li>
                  <li><span>03</span><strong>Publicamos</strong><small>Tras aprobación</small></li>
                </ol>

                <form onSubmit={submitProposal} aria-busy={submitState === "sending"}>
                  <div className="form-grid">
                    <label className="form-span-2">Nombre de la actividad
                      <input ref={firstFieldRef} name="title" required minLength={3} maxLength={160} autoComplete="off" />
                    </label>
                    <label>Disciplina
                      <input name="sport" required minLength={2} maxLength={80} autoComplete="off" />
                    </label>
                    <label>Municipio
                      <input name="municipality" required minLength={2} maxLength={100} autoComplete="address-level2" />
                    </label>
                    <label className="form-span-2">Lugar o instalación
                      <input name="venue" required minLength={2} maxLength={180} autoComplete="off" />
                    </label>
                    <label className="form-span-2">Descripción
                      <textarea name="summary" rows={4} required minLength={10} maxLength={3000} />
                    </label>
                    <label className="form-span-2">Estado de la fecha
                      <select value={dateStatus} onChange={(event) => setDateStatus(event.target.value as "confirmed" | "tbd")}>
                        <option value="confirmed">Fecha confirmada</option>
                        <option value="tbd">Fecha por confirmar</option>
                      </select>
                    </label>
                    {dateStatus === "confirmed" && (
                      <>
                        <label>Inicio
                          <input name="startAt" type="datetime-local" required />
                        </label>
                        <label>Final opcional
                          <input name="endAt" type="datetime-local" />
                        </label>
                      </>
                    )}
                    <label className="form-span-2">Enlace de imagen opcional
                      <input name="imageUrl" type="url" inputMode="url" placeholder="https://" />
                    </label>
                    <label>Enlace de video opcional
                      <input name="videoUrl" type="url" inputMode="url" placeholder="https://" />
                    </label>
                    <label>Enlace de inscripción opcional
                      <input name="registrationUrl" type="url" inputMode="url" placeholder="https://" />
                    </label>
                    <label>Nombre de contacto
                      <input name="contactName" required minLength={2} maxLength={120} autoComplete="name" />
                    </label>
                    <label>Correo de contacto
                      <input name="contactEmail" type="email" required maxLength={254} autoComplete="email" />
                    </label>
                    <label className="form-span-2">Teléfono opcional
                      <input name="contactPhone" type="tel" maxLength={40} autoComplete="tel" />
                    </label>
                    <label className="honeypot" aria-hidden="true">Sitio web
                      <input name="website" tabIndex={-1} autoComplete="off" />
                    </label>
                    <label className="consent-row form-span-2">
                      <input name="consent" type="checkbox" required />
                      <span>Autorizo a la Dirección Provincial a revisar estos datos y contactarme sobre su publicación.</span>
                    </label>
                  </div>

                  {submitMessage && submitState === "error" && <p className="form-alert" role="alert">{submitMessage}</p>}
                  <button
                    className={`form-submit${submitState === "sending" ? " is-sending" : ""}`}
                    type="submit"
                    disabled={submitState === "sending"}
                    aria-busy={submitState === "sending"}
                  >
                    {submitState === "sending" ? "Enviando…" : "Enviar para revisión"} <span aria-hidden="true">→</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
