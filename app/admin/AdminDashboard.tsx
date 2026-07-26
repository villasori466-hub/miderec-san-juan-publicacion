"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import styles from "./admin.module.css";

type IconName =
  | "calendar"
  | "inbox"
  | "search"
  | "plus"
  | "megaphone"
  | "clock"
  | "pencil";

const ICON_PATHS: Record<IconName, ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9.5h18" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 13h-5l-2 3h-6l-2-3H2" />
      <path d="M5.5 5.4 2 13v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5l-3.5-7.6A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.4Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  megaphone: (
    <>
      <path d="m3 11 18-6v14L3 13v-2Z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

type EditorialStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "archived";

type EventStatus = "scheduled" | "postponed" | "cancelled";
type DateStatus = "confirmed" | "tbd";
type DateValue = string | number | null | undefined;

type Activity = {
  id: string;
  slug?: string;
  title: string;
  sport: string;
  municipality: string;
  venue: string;
  summary: string;
  dateStatus: DateStatus;
  startAt?: DateValue;
  endAt?: DateValue;
  registrationUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  featured?: boolean | number;
  eventStatus: EventStatus;
  editorialStatus: EditorialStatus;
  publishAt?: DateValue;
  unpublishAt?: DateValue;
  createdAt?: DateValue;
  updatedAt?: DateValue;
  version: number;
};

type Submission = {
  id: string;
  title: string;
  sport: string;
  municipality: string;
  venue: string;
  summary: string;
  dateStatus: DateStatus;
  startAt?: DateValue;
  endAt?: DateValue;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  consent: boolean | number;
  status: "pending" | "accepted" | "rejected";
  adminNote?: string | null;
  createdAt?: DateValue;
};

type ActivityDraft = {
  title: string;
  summary: string;
  sport: string;
  dateStatus: DateStatus;
  startAt: string;
  endAt: string;
  municipality: string;
  venue: string;
  registrationUrl: string;
  imageUrl: string;
  videoUrl: string;
  featured: boolean;
  eventStatus: EventStatus;
  publishAt: string;
};

type Toast = { tone: "success" | "error"; message: string } | null;
type UploadState =
  | { status: "idle"; progress: 0; message: "" }
  | { status: "uploading"; progress: number; message: string }
  | { status: "success"; progress: 100; message: string }
  | { status: "error"; progress: 0; message: string };

const SPORTS = [
  "Atletismo",
  "Baloncesto",
  "Béisbol",
  "Voleibol",
  "Fútbol",
  "Boxeo",
  "Judo",
  "Ajedrez",
  "Ciclismo",
  "Deporte adaptado",
  "Multideporte",
] as const;

const STATUS_LABELS: Record<EditorialStatus, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  published: "Publicada",
  archived: "Archivada",
};

const EVENT_LABELS: Record<EventStatus, string> = {
  scheduled: "Activa",
  postponed: "Pospuesta",
  cancelled: "Cancelada",
};

const EMPTY_DRAFT: ActivityDraft = {
  title: "",
  summary: "",
  sport: "",
  dateStatus: "confirmed",
  startAt: "",
  endAt: "",
  municipality: "San Juan",
  venue: "",
  registrationUrl: "",
  imageUrl: "",
  videoUrl: "",
  featured: false,
  eventStatus: "scheduled",
  publishAt: "",
};

function asDate(value: DateValue): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized =
    typeof value === "number" && value < 10_000_000_000 ? value * 1000 : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateTimeInput(value: DateValue): string {
  const date = asDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00-04:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toUnix(value: string): number | null {
  const iso = toIso(value);
  return iso ? Math.floor(new Date(iso).getTime() / 1000) : null;
}

function formatDate(value: DateValue, includeTime = true): string {
  const date = asDate(value);
  if (!date) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function getSportName(activity: Activity): string {
  return activity.sport || "Multideporte";
}

function readApiMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as {
    error?: string | { message?: string };
    message?: string;
    details?: string[];
  };
  if (typeof value.error === "string") {
    return value.details?.length
      ? `${value.error}: ${value.details.join(" · ")}`
      : value.error;
  }
  if (value.error?.message) return value.error.message;
  return value.message ?? fallback;
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    throw new Error(readApiMessage(payload, `La solicitud falló (${response.status}).`));
  }
  return (payload ?? ({} as T)) as T;
}

function activityToDraft(activity: Activity): ActivityDraft {
  return {
    title: activity.title ?? "",
    summary: activity.summary ?? "",
    sport: activity.sport ?? "",
    dateStatus: activity.dateStatus ?? "confirmed",
    startAt: toDateTimeInput(activity.startAt),
    endAt: toDateTimeInput(activity.endAt),
    municipality: activity.municipality ?? "San Juan",
    venue: activity.venue ?? "",
    registrationUrl: activity.registrationUrl ?? "",
    imageUrl: activity.imageUrl ?? "",
    videoUrl: activity.videoUrl ?? "",
    featured: Boolean(activity.featured),
    eventStatus: activity.eventStatus ?? "scheduled",
    publishAt: toDateTimeInput(activity.publishAt),
  };
}

function statusPhase(activity: Activity): "future" | "current" | "past" | "tbd" {
  if (activity.dateStatus === "tbd" || !asDate(activity.startAt)) return "tbd";
  const now = Date.now();
  const start = asDate(activity.startAt)?.getTime() ?? now;
  const end = asDate(activity.endAt)?.getTime() ?? start;
  if (start > now) return "future";
  if (end >= now) return "current";
  return "past";
}

export default function AdminDashboard({
  user,
}: {
  user: { displayName: string; email: string };
}) {
  const [view, setView] = useState<"activities" | "submissions">("activities");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EditorialStatus>("all");
  const [municipalityFilter, setMunicipalityFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState<"all" | "future" | "current" | "past" | "tbd">("all");
  const [sortMode, setSortMode] = useState<"updated" | "date" | "title">("updated");
  const [submissionFilter, setSubmissionFilter] = useState<"all" | Submission["status"]>("pending");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [draft, setDraft] = useState<ActivityDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [submissionNotes, setSubmissionNotes] = useState<Record<string, string>>({});
  const [submissionBusy, setSubmissionBusy] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [localCoverPreview, setLocalCoverPreview] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const loadActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const payload = await apiRequest<{ activities?: Activity[] } | Activity[]>(
        "/api/admin/activities",
      );
      setActivities(Array.isArray(payload) ? payload : payload.activities ?? []);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar la agenda.");
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const payload = await apiRequest<{ submissions?: Submission[] } | Submission[]>(
        "/api/admin/submissions",
      );
      setSubmissions(Array.isArray(payload) ? payload : payload.submissions ?? []);
      setLoadError("");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "No se pudieron cargar las propuestas.",
      );
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void Promise.all([loadActivities(), loadSubmissions()]);
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadActivities, loadSubmissions]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!editorOpen) return;
    const timer = window.setTimeout(() => titleInputRef.current?.focus(), 40);
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !saving && uploadState.status !== "uploading") {
        setEditorOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [editorOpen, saving, uploadState.status]);

  useEffect(() => {
    if (!editorOpen && lastTriggerRef.current) {
      lastTriggerRef.current.focus();
      lastTriggerRef.current = null;
    }
  }, [editorOpen]);

  useEffect(() => {
    return () => {
      if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    };
  }, [localCoverPreview]);

  const municipalities = useMemo(
    () =>
      Array.from(new Set(activities.map((activity) => activity.municipality.trim())))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "es")),
    [activities],
  );

  const filteredActivities = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return activities
      .filter((activity) => {
        const statusMatches =
          statusFilter === "all" || activity.editorialStatus === statusFilter;
        const municipalityMatches =
          municipalityFilter === "all" || activity.municipality === municipalityFilter;
        const phaseMatches = phaseFilter === "all" || statusPhase(activity) === phaseFilter;
        const textMatches =
          !term ||
          [activity.title, activity.summary, activity.municipality, activity.venue, getSportName(activity)]
            .filter(Boolean)
            .some((value) => String(value).toLocaleLowerCase("es").includes(term));
        return statusMatches && municipalityMatches && phaseMatches && textMatches;
      })
      .sort((a, b) => {
        if (sortMode === "title") return a.title.localeCompare(b.title, "es");
        if (sortMode === "date") {
          return (asDate(a.startAt)?.getTime() ?? Number.MAX_SAFE_INTEGER)
            - (asDate(b.startAt)?.getTime() ?? Number.MAX_SAFE_INTEGER);
        }
        return (asDate(b.updatedAt)?.getTime() ?? 0) - (asDate(a.updatedAt)?.getTime() ?? 0);
      });
  }, [activities, municipalityFilter, phaseFilter, search, sortMode, statusFilter]);

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter(
        (submission) => submissionFilter === "all" || submission.status === submissionFilter,
      ),
    [submissionFilter, submissions],
  );

  const metrics = useMemo(
    () => ({
      published: activities.filter((item) => item.editorialStatus === "published").length,
      future: activities.filter(
        (item) => statusPhase(item) === "future" && item.eventStatus === "scheduled",
      ).length,
      drafts: activities.filter((item) => item.editorialStatus === "draft").length,
      proposals: submissions.filter((item) => item.status === "pending").length,
    }),
    [activities, submissions],
  );

  function openCreate(event?: { currentTarget: HTMLElement }) {
    if (event) lastTriggerRef.current = event.currentTarget;
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setUploadState({ status: "idle", progress: 0, message: "" });
    setLocalCoverPreview("");
    setEditorOpen(true);
  }

  function openEdit(activity: Activity, trigger: HTMLElement) {
    lastTriggerRef.current = trigger;
    setEditing(activity);
    setDraft(activityToDraft(activity));
    setUploadState({ status: "idle", progress: 0, message: "" });
    setLocalCoverPreview("");
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving || uploadState.status === "uploading") return;
    setEditorOpen(false);
  }

  function updateDraft<K extends keyof ActivityDraft>(key: K, value: ActivityDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateCoverUrl(value: string) {
    // Al pegar una dirección, la vista previa debe mostrar esa imagen y no
    // conservar temporalmente la miniatura del último archivo seleccionado.
    setLocalCoverPreview("");
    setUploadState({ status: "idle", progress: 0, message: "" });
    updateDraft("imageUrl", value);
  }

  function buildPayload(status: EditorialStatus) {
    return {
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      sport: draft.sport.trim(),
      dateStatus: draft.dateStatus,
      startAt: draft.dateStatus === "tbd" ? null : toUnix(draft.startAt),
      endAt: draft.dateStatus === "tbd" ? null : toUnix(draft.endAt),
      venue: draft.venue.trim(),
      municipality: draft.municipality.trim(),
      registrationUrl: draft.registrationUrl.trim() || null,
      imageUrl: draft.imageUrl.trim(),
      videoUrl: draft.videoUrl.trim(),
      featured: draft.featured,
      eventStatus: draft.eventStatus,
      editorialStatus: status,
      // Publicación inmediata → publishAt null: la actividad aparece en la web
      // al instante, sin depender de que el reloj del navegador y el del
      // servidor coincidan. Solo "Programar" conserva una fecha futura.
      publishAt: status === "scheduled" ? toUnix(draft.publishAt) : null,
      unpublishAt: null,
    };
  }

  function validateDraft(status: EditorialStatus): string | null {
    if (draft.title.trim().length < 3) return "Escribe un título de al menos 3 caracteres.";
    if (draft.summary.trim().length < 10) {
      return "El resumen debe tener al menos 10 caracteres.";
    }
    if (draft.sport.trim().length < 2) return "Indica la disciplina deportiva.";
    if (!draft.municipality.trim()) return "Indica el municipio.";
    if (draft.venue.trim().length < 2) return "Indica la sede o escribe “Por confirmar”.";
    if (draft.dateStatus !== "tbd") {
      const start = toUnix(draft.startAt);
      const end = toUnix(draft.endAt);
      if (!start || !end) return "Indica el inicio y el final de la actividad.";
      if (end < start) return "La fecha final debe ser igual o posterior al inicio.";
    }
    if (status === "scheduled" && !toUnix(draft.publishAt)) {
      return "Selecciona la fecha y hora de publicación.";
    }
    return null;
  }

  async function saveActivity(status: EditorialStatus) {
    const validationError = validateDraft(status);
    if (validationError) {
      setToast({ tone: "error", message: validationError });
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (editing) {
        await apiRequest(`/api/admin/activities/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, version: editing.version }),
        });
      } else {
        await apiRequest("/api/admin/activities", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setEditorOpen(false);
      await loadActivities();
      setToast({
        tone: "success",
        message:
          status === "published"
            ? "Actividad publicada."
            : status === "scheduled"
              ? "Publicación programada."
              : "Borrador guardado.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar la actividad.",
      });
    } finally {
      setSaving(false);
    }
  }

  function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveActivity(editing?.editorialStatus === "published" ? "published" : "draft");
  }

  async function updateEventStatus(activity: Activity, eventStatus: EventStatus) {
    const verb = eventStatus === "cancelled" ? "cancelar" : eventStatus === "postponed" ? "posponer" : "reactivar";
    if (!window.confirm(`¿Confirmas que deseas ${verb} “${activity.title}”?`)) return;

    try {
      await apiRequest(`/api/admin/activities/${encodeURIComponent(activity.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ eventStatus, version: activity.version }),
      });
      await loadActivities();
      setToast({ tone: "success", message: `Actividad actualizada: ${EVENT_LABELS[eventStatus]}.` });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo actualizar la actividad.",
      });
    }
  }

  async function archiveActivity(activity: Activity) {
    const confirmed = window.confirm(
      `¿Archivar “${activity.title}”? Dejará de mostrarse en el sitio público.`,
    );
    if (!confirmed) return;

    try {
      await apiRequest(`/api/admin/activities/${encodeURIComponent(activity.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ editorialStatus: "archived", version: activity.version }),
      });
      await loadActivities();
      setToast({ tone: "success", message: "Actividad archivada." });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo archivar la actividad.",
      });
    }
  }

  async function deleteActivity(activity: Activity) {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente “${activity.title}”? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    try {
      await apiRequest(
        `/api/admin/activities/${encodeURIComponent(activity.id)}?version=${activity.version}`,
        { method: "DELETE" },
      );
      await loadActivities();
      setToast({ tone: "success", message: "Actividad eliminada definitivamente." });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar la actividad.",
      });
    }
  }

  async function togglePublish(activity: Activity) {
    const publishing = activity.editorialStatus !== "published";
    try {
      await apiRequest(`/api/admin/activities/${encodeURIComponent(activity.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          editorialStatus: publishing ? "published" : "draft",
          publishAt: null,
          version: activity.version,
        }),
      });
      await loadActivities();
      setToast({
        tone: "success",
        message: publishing
          ? `“${activity.title}” ya está visible en el sitio público.`
          : `“${activity.title}” pasó a borradores y dejó de mostrarse.`,
      });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cambiar la publicación.",
      });
    }
  }

  async function toggleFeatured(activity: Activity) {
    try {
      await apiRequest(`/api/admin/activities/${encodeURIComponent(activity.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ featured: !activity.featured, version: activity.version }),
      });
      await loadActivities();
      setToast({
        tone: "success",
        message: activity.featured
          ? "La actividad dejó de estar destacada."
          : "Actividad destacada: protagoniza la portada del sitio.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo cambiar el destaque.",
      });
    }
  }

  async function duplicateActivity(activity: Activity) {
    try {
      const title = `${activity.title} (copia)`.slice(0, 160);
      const { activity: copy } = await apiRequest<{ activity: Activity }>(
        "/api/admin/activities",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            slug: `${(activity.slug || activity.title).slice(0, 130)}-copia-${Date.now().toString(36)}`,
            sport: activity.sport,
            municipality: activity.municipality,
            venue: activity.venue,
            summary: activity.summary,
            dateStatus: activity.dateStatus,
            startAt: activity.startAt,
            endAt: activity.endAt,
            eventStatus: "scheduled",
            editorialStatus: "draft",
            publishAt: null,
            unpublishAt: null,
            featured: false,
            imageUrl: activity.imageUrl || "",
            videoUrl: activity.videoUrl || "",
            registrationUrl: activity.registrationUrl || "",
          }),
        },
      );
      await loadActivities();
      setToast({ tone: "success", message: `Copia creada como borrador: “${copy.title}”.` });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo duplicar la actividad.",
      });
    }
  }

  function exportActivitiesCsv() {
    if (!filteredActivities.length) {
      setToast({ tone: "error", message: "No hay actividades que exportar con el filtro actual." });
      return;
    }
    const escapeCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const header = [
      "Título", "Deporte", "Municipio", "Lugar", "Resumen", "Fecha inicio", "Fecha final",
      "Estado editorial", "Estado del evento", "Destacada", "Imagen", "Video", "Inscripción",
    ];
    const rows = filteredActivities.map((activity) => [
      activity.title,
      getSportName(activity),
      activity.municipality,
      activity.venue,
      activity.summary,
      activity.dateStatus === "tbd" ? "Por confirmar" : formatDate(activity.startAt),
      activity.endAt ? formatDate(activity.endAt) : "",
      STATUS_LABELS[activity.editorialStatus],
      EVENT_LABELS[activity.eventStatus],
      activity.featured ? "Sí" : "No",
      activity.imageUrl || "",
      activity.videoUrl || "",
      activity.registrationUrl || "",
    ]);
    // "﻿" (BOM) hace que Excel abra el CSV con acentos correctos.
    const csv = "﻿" + [header, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agenda-miderec-san-juan-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setToast({ tone: "success", message: `Se exportaron ${rows.length} actividades a CSV.` });
  }

  function uploadCover(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadState({ status: "error", progress: 0, message: "Selecciona una imagen válida." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadState({ status: "error", progress: 0, message: "La imagen no puede superar 8 MB." });
      return;
    }

    if (localCoverPreview) URL.revokeObjectURL(localCoverPreview);
    const preview = URL.createObjectURL(file);
    setLocalCoverPreview(preview);
    setUploadState({ status: "uploading", progress: 1, message: "Preparando imagen…" });

    const form = new FormData();
    form.append("file", file);
    form.append("kind", "image");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.responseType = "json";
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.addEventListener("progress", (event) => {
      const progress = event.lengthComputable
        ? Math.max(1, Math.round((event.loaded / event.total) * 100))
        : 50;
      setUploadState({ status: "uploading", progress, message: `Subiendo imagen: ${progress}%` });
    });
    xhr.addEventListener("load", () => {
      const response = xhr.response as
        | { key?: string; url?: string; error?: unknown }
        | null;
      if (xhr.status < 200 || xhr.status >= 300) {
        setUploadState({
          status: "error",
          progress: 0,
          message: readApiMessage(response, "No se pudo subir la imagen."),
        });
        return;
      }
      if (!response?.url) {
        setUploadState({ status: "error", progress: 0, message: "El servidor no devolvió la dirección de la imagen." });
        return;
      }
      setDraft((current) => ({
        ...current,
        imageUrl: response.url ?? current.imageUrl,
      }));
      setUploadState({ status: "success", progress: 100, message: "Imagen lista para guardar." });
    });
    xhr.addEventListener("error", () => {
      setUploadState({ status: "error", progress: 0, message: "Se perdió la conexión durante la subida." });
    });
    xhr.send(form);
  }

  async function resolveSubmission(submission: Submission, action: "accept" | "reject") {
    const note = submissionNotes[submission.id]?.trim() || undefined;
    if (action === "reject" && !window.confirm(`¿Rechazar la propuesta “${submission.title}”?`)) {
      return;
    }
    setSubmissionBusy(submission.id);
    try {
      await apiRequest(`/api/admin/submissions/${encodeURIComponent(submission.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNote: note }),
      });
      await Promise.all([loadSubmissions(), action === "accept" ? loadActivities() : Promise.resolve()]);
      setToast({
        tone: "success",
        message:
          action === "accept"
            ? "Propuesta aceptada y convertida en borrador."
            : "Propuesta rechazada.",
      });
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "No se pudo resolver la propuesta.",
      });
    } finally {
      setSubmissionBusy(null);
    }
  }

  function handleEditorTabKey(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab" || !editorRef.current) return;
    const focusable = Array.from(
      editorRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  const displayName = user.displayName || user.email;
  const userInitials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("es"))
    .join("");

  return (
    <main className={styles.adminShell}>
      <aside className={styles.sidebar} aria-label="Navegación administrativa">
        <a className={styles.adminBrand} href="/admin" aria-label="Inicio del centro de contenidos">
          <span aria-hidden="true">SJ</span>
          <div>
            <strong>MIDEREC</strong>
            <small>Centro de contenidos</small>
          </div>
        </a>

        <nav className={styles.sidebarNav}>
          <button
            type="button"
            className={view === "activities" ? styles.navActive : ""}
            onClick={() => setView("activities")}
            aria-current={view === "activities" ? "page" : undefined}
          >
            <span aria-hidden="true"><Icon name="calendar" /></span>
            Actividades
          </button>
          <button
            type="button"
            className={view === "submissions" ? styles.navActive : ""}
            onClick={() => setView("submissions")}
            aria-current={view === "submissions" ? "page" : undefined}
          >
            <span aria-hidden="true"><Icon name="inbox" /></span>
            Propuestas
            {metrics.proposals > 0 && <b>{metrics.proposals}</b>}
          </button>
        </nav>

        <div className={styles.sidebarFoot}>
          <a href="/" target="_blank" rel="noreferrer">
            Ver sitio público <span aria-hidden="true">↗</span>
          </a>
          <div className={styles.userCard}>
            <span aria-hidden="true">{userInitials || "SJ"}</span>
            <div>
              <strong>{displayName}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <a className={styles.signOut} href="/admin/logout?return_to=%2F">
            Cerrar sesión
          </a>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <a className={styles.mobileBrand} href="/admin">
            <span>SJ</span>
            <strong>Centro de contenidos</strong>
          </a>
          <Link href="/" aria-label="Abrir sitio público">↗</Link>
        </header>

        <div className={styles.workspaceInner}>
          {loadError && (
            <div className={styles.loadError} role="alert">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => void Promise.all([loadActivities(), loadSubmissions()])}
              >
                Reintentar
              </button>
            </div>
          )}

          <nav className={styles.mobileTabs} aria-label="Secciones del panel">
            <button
              type="button"
              className={view === "activities" ? styles.mobileTabActive : ""}
              onClick={() => setView("activities")}
              aria-pressed={view === "activities"}
            >
              Actividades
            </button>
            <button
              type="button"
              className={view === "submissions" ? styles.mobileTabActive : ""}
              onClick={() => setView("submissions")}
              aria-pressed={view === "submissions"}
            >
              Propuestas {metrics.proposals > 0 ? `(${metrics.proposals})` : ""}
            </button>
          </nav>

          <div className={styles.viewPane} key={view}>
          {view === "activities" ? (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <p className={styles.eyebrow}>Agenda provincial</p>
                  <h1>Actividades deportivas</h1>
                  <p>Prepara, programa y publica la agenda oficial de San Juan.</p>
                </div>
                <button className={styles.primaryButton} type="button" onClick={openCreate}>
                  <Icon name="plus" /> Nueva actividad
                </button>
              </div>

              <section className={styles.metrics} aria-label="Resumen editorial">
                <article data-tone="blue" style={{ "--metric-index": 0 } as CSSProperties}>
                  <span className={styles.metricLabel}>Publicadas</span>
                  {loadingActivities ? (
                    <span className={styles.metricGhost} aria-hidden="true" />
                  ) : (
                    <strong>{metrics.published}</strong>
                  )}
                  <i className={styles.metricIcon} aria-hidden="true"><Icon name="megaphone" /></i>
                </article>
                <article data-tone="sky" style={{ "--metric-index": 1 } as CSSProperties}>
                  <span className={styles.metricLabel}>Próximas</span>
                  {loadingActivities ? (
                    <span className={styles.metricGhost} aria-hidden="true" />
                  ) : (
                    <strong>{metrics.future}</strong>
                  )}
                  <i className={styles.metricIcon} aria-hidden="true"><Icon name="clock" /></i>
                </article>
                <article data-tone="amber" style={{ "--metric-index": 2 } as CSSProperties}>
                  <span className={styles.metricLabel}>Borradores</span>
                  {loadingActivities ? (
                    <span className={styles.metricGhost} aria-hidden="true" />
                  ) : (
                    <strong>{metrics.drafts}</strong>
                  )}
                  <i className={styles.metricIcon} aria-hidden="true"><Icon name="pencil" /></i>
                </article>
                <article data-tone="red" style={{ "--metric-index": 3 } as CSSProperties}>
                  <span className={styles.metricLabel}>Propuestas nuevas</span>
                  {loadingSubmissions ? (
                    <span className={styles.metricGhost} aria-hidden="true" />
                  ) : (
                    <strong>{metrics.proposals}</strong>
                  )}
                  <i className={styles.metricIcon} aria-hidden="true"><Icon name="inbox" /></i>
                </article>
              </section>

              <div className={styles.toolbar}>
                <label className={styles.searchField}>
                  <span className={styles.srOnly}>Buscar actividades</span>
                  <i aria-hidden="true"><Icon name="search" /></i>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por título, deporte o municipio"
                  />
                </label>
                <label className={styles.filterField}>
                  <span>Estado</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "all" | EditorialStatus)
                    }
                  >
                    <option value="all">Todos</option>
                    <option value="draft">Borradores</option>
                    <option value="scheduled">Programadas</option>
                    <option value="published">Publicadas</option>
                    <option value="archived">Archivadas</option>
                  </select>
                </label>
                <label className={styles.filterField}>
                  <span>Localidad</span>
                  <select
                    value={municipalityFilter}
                    onChange={(event) => setMunicipalityFilter(event.target.value)}
                  >
                    <option value="all">Todas</option>
                    {municipalities.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.filterField}>
                  <span>Momento</span>
                  <select
                    value={phaseFilter}
                    onChange={(event) =>
                      setPhaseFilter(event.target.value as "all" | "future" | "current" | "past" | "tbd")
                    }
                  >
                    <option value="all">Cualquier fecha</option>
                    <option value="future">Próximas</option>
                    <option value="current">En curso</option>
                    <option value="past">Finalizadas</option>
                    <option value="tbd">Por confirmar</option>
                  </select>
                </label>
                <label className={styles.filterField}>
                  <span>Orden</span>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as "updated" | "date" | "title")}
                  >
                    <option value="updated">Edición reciente</option>
                    <option value="date">Fecha del evento</option>
                    <option value="title">Título A–Z</option>
                  </select>
                </label>
                <button
                  className={styles.refreshButton}
                  type="button"
                  onClick={() => void loadActivities()}
                  disabled={loadingActivities}
                >
                  {loadingActivities ? "Actualizando…" : "Actualizar"}
                </button>
                <button
                  className={styles.refreshButton}
                  type="button"
                  onClick={exportActivitiesCsv}
                  disabled={loadingActivities}
                  title="Descargar la lista filtrada como hoja de cálculo"
                >
                  Exportar CSV
                </button>
              </div>

              <section className={styles.activityPanel} aria-labelledby="activity-list-title">
                <div className={styles.panelTitle}>
                  <div>
                    <h2 id="activity-list-title">Contenido editorial</h2>
                    <span>{filteredActivities.length} actividades</span>
                  </div>
                  <span className={styles.syncLabel}>Datos en vivo</span>
                </div>

                {loadingActivities ? (
                  <LoadingRows label="Cargando actividades" />
                ) : filteredActivities.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span aria-hidden="true">＋</span>
                    <h3>{activities.length ? "No hay coincidencias" : "La agenda está lista para comenzar"}</h3>
                    <p>
                      {activities.length
                        ? "Prueba con otro término o estado editorial."
                        : "Crea la primera actividad oficial; aquí no se añade contenido de muestra."}
                    </p>
                    {!activities.length && (
                      <button type="button" onClick={openCreate}>Crear actividad</button>
                    )}
                  </div>
                ) : (
                  <div className={styles.activityList}>
                    {filteredActivities.map((activity, index) => (
                      <ActivityRow
                        activity={activity}
                        index={index}
                        key={activity.id}
                        onEdit={openEdit}
                        onEventStatus={updateEventStatus}
                        onArchive={archiveActivity}
                        onDelete={deleteActivity}
                        onTogglePublish={togglePublish}
                        onToggleFeatured={toggleFeatured}
                        onDuplicate={duplicateActivity}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <p className={styles.eyebrow}>Participación comunitaria</p>
                  <h1>Propuestas recibidas</h1>
                  <p>Revisa cada solicitud antes de convertirla en contenido oficial.</p>
                </div>
                <button
                  className={styles.refreshButton}
                  type="button"
                  onClick={() => void loadSubmissions()}
                  disabled={loadingSubmissions}
                >
                  {loadingSubmissions ? "Actualizando…" : "Actualizar bandeja"}
                </button>
              </div>

              <div className={styles.proposalNotice} role="note">
                <span aria-hidden="true">i</span>
                <p>
                  <strong>Revisión obligatoria.</strong> Aceptar una propuesta crea un borrador;
                  nunca la publica automáticamente.
                </p>
              </div>

              <div className={styles.submissionFilters} aria-label="Filtrar propuestas">
                {([
                  ["pending", "Pendientes"],
                  ["accepted", "Aceptadas"],
                  ["rejected", "Rechazadas"],
                  ["all", "Todas"],
                ] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={submissionFilter === value ? styles.submissionFilterActive : ""}
                    aria-pressed={submissionFilter === value}
                    onClick={() => setSubmissionFilter(value)}
                  >
                    {label}
                    <span>
                      {value === "all"
                        ? submissions.length
                        : submissions.filter((item) => item.status === value).length}
                    </span>
                  </button>
                ))}
              </div>

              {loadingSubmissions ? (
                <section className={styles.activityPanel}>
                  <LoadingRows label="Cargando propuestas" />
                </section>
              ) : filteredSubmissions.length === 0 ? (
                <section className={`${styles.activityPanel} ${styles.emptyState}`}>
                  <span aria-hidden="true">✓</span>
                  <h2>No hay propuestas en esta vista</h2>
                  <p>Cambia el filtro para consultar el resto de la bandeja.</p>
                </section>
              ) : (
                <section className={styles.proposalGrid} aria-label="Propuestas de actividades">
                  {filteredSubmissions.map((submission, index) => (
                    <SubmissionCard
                      key={submission.id}
                      index={index}
                      submission={submission}
                      note={submissionNotes[submission.id] ?? submission.adminNote ?? ""}
                      busy={submissionBusy === submission.id}
                      onNote={(value) =>
                        setSubmissionNotes((current) => ({ ...current, [submission.id]: value }))
                      }
                      onResolve={resolveSubmission}
                    />
                  ))}
                </section>
              )}
            </>
          )}
          </div>
        </div>
      </section>

      {toast && (
        <div
          key={`${toast.tone}-${toast.message}`}
          className={`${styles.toast} ${toast.tone === "error" ? styles.toastError : ""}`}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          <span aria-hidden="true">{toast.tone === "error" ? "!" : "✓"}</span>
          {toast.message}
        </div>
      )}

      {editorOpen && (
        <div className={styles.editorBackdrop} role="presentation" onMouseDown={closeEditor}>
          <section
            className={styles.editorDrawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
            ref={editorRef}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={handleEditorTabKey}
          >
            <header className={styles.editorHeader}>
              <div>
                <p className={styles.eyebrow}>{editing ? "Edición editorial" : "Nueva actividad"}</p>
                <h2 id="editor-title">{editing ? editing.title : "Crear actividad"}</h2>
              </div>
              <button
                type="button"
                className={styles.editorClose}
                onClick={closeEditor}
                aria-label="Cerrar editor"
                disabled={saving || uploadState.status === "uploading"}
              >
                ×
              </button>
            </header>

            <form className={styles.editorForm} onSubmit={submitEditor}>
              <div className={styles.formBody}>
                <section className={styles.formSection} aria-labelledby="basic-heading">
                  <div className={styles.formSectionTitle}>
                    <span>01</span>
                    <div>
                      <h3 id="basic-heading">Información principal</h3>
                      <p>Lo esencial para identificar y explicar la actividad.</p>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>Título de la actividad *</span>
                    <input
                      ref={titleInputRef}
                      value={draft.title}
                      onChange={(event) => updateDraft("title", event.target.value)}
                      maxLength={140}
                      required
                      placeholder="Ej. Torneo provincial de baloncesto U18"
                    />
                    <small>{draft.title.length}/140</small>
                  </label>

                  <label className={styles.field}>
                    <span>Resumen *</span>
                    <textarea
                      value={draft.summary}
                      onChange={(event) => updateDraft("summary", event.target.value)}
                      rows={3}
                      maxLength={320}
                      required
                      placeholder="Explica en pocas palabras qué ocurrirá y a quién va dirigido."
                    />
                    <small>{draft.summary.length}/320</small>
                  </label>

                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>Disciplina</span>
                      <select
                        value={draft.sport}
                        onChange={(event) => updateDraft("sport", event.target.value)}
                        required
                      >
                        <option value="">Seleccionar</option>
                        {SPORTS.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Estado de la actividad</span>
                      <select
                        value={draft.eventStatus}
                        onChange={(event) =>
                          updateDraft("eventStatus", event.target.value as EventStatus)
                        }
                      >
                        <option value="scheduled">Activa</option>
                        <option value="postponed">Pospuesta</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className={styles.formSection} aria-labelledby="date-heading">
                  <div className={styles.formSectionTitle}>
                    <span>02</span>
                    <div>
                      <h3 id="date-heading">Fecha y lugar</h3>
                      <p>Las horas se registran para Santo Domingo (UTC-4).</p>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>Confirmación de fecha</span>
                    <select
                      value={draft.dateStatus}
                      onChange={(event) =>
                        updateDraft("dateStatus", event.target.value as DateStatus)
                      }
                    >
                      <option value="confirmed">Confirmada</option>
                      <option value="tbd">Por confirmar</option>
                    </select>
                  </label>

                  {draft.dateStatus !== "tbd" && (
                    <div className={styles.formGrid}>
                      <label className={styles.field}>
                        <span>Inicio *</span>
                        <input
                          type="datetime-local"
                          value={draft.startAt}
                          onChange={(event) => updateDraft("startAt", event.target.value)}
                          required
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Final *</span>
                        <input
                          type="datetime-local"
                          value={draft.endAt}
                          onChange={(event) => updateDraft("endAt", event.target.value)}
                          required
                        />
                      </label>
                    </div>
                  )}

                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>Municipio *</span>
                      <input
                        value={draft.municipality}
                        onChange={(event) => updateDraft("municipality", event.target.value)}
                        required
                        placeholder="San Juan de la Maguana"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Instalación o sede *</span>
                      <input
                        value={draft.venue}
                        onChange={(event) => updateDraft("venue", event.target.value)}
                        required
                        placeholder="Nombre de la cancha o complejo"
                      />
                    </label>
                  </div>
                </section>

                <section className={styles.formSection} aria-labelledby="media-heading">
                  <div className={styles.formSectionTitle}>
                    <span>03</span>
                    <div>
                      <h3 id="media-heading">Imagen y promoción</h3>
                      <p>Usa una fotografía horizontal, nítida y con permiso de publicación.</p>
                    </div>
                  </div>

                  <div className={styles.coverUploader}>
                    {(localCoverPreview || draft.imageUrl) ? (
                      <img src={localCoverPreview || draft.imageUrl} alt="Vista previa de la portada" />
                    ) : (
                      <div className={styles.coverPlaceholder} aria-hidden="true">
                        <span>IMG</span>
                      </div>
                    )}
                    <div>
                      <strong>Imagen de portada</strong>
                      <p>JPG, PNG, WebP o GIF. Máximo 8 MB.</p>
                      <label className={styles.uploadButton}>
                        <span>{uploadState.status === "uploading" ? "Subiendo…" : "Elegir imagen"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={uploadState.status === "uploading"}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            const file = event.target.files?.[0];
                            if (file) uploadCover(file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>URL de la imagen</span>
                    <input
                      type="url"
                      inputMode="url"
                      value={draft.imageUrl}
                      onChange={(event) => updateCoverUrl(event.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                    <small>Pega una URL de imagen o elige un archivo desde tu dispositivo.</small>
                  </label>

                  {uploadState.status !== "idle" && (
                    <div
                      className={`${styles.uploadStatus} ${uploadState.status === "error" ? styles.uploadError : ""}`}
                      role={uploadState.status === "error" ? "alert" : "status"}
                    >
                      <div>
                        <span>{uploadState.message}</span>
                        <strong>{uploadState.progress}%</strong>
                      </div>
                      <progress value={uploadState.progress} max="100">
                        {uploadState.progress}%
                      </progress>
                    </div>
                  )}

                  <label className={styles.checkField}>
                    <input
                      type="checkbox"
                      checked={draft.featured}
                      onChange={(event) => updateDraft("featured", event.target.checked)}
                    />
                    <span>
                      <strong>Destacar en portada</strong>
                      <small>Da prioridad a esta actividad en el sitio.</small>
                    </span>
                  </label>
                </section>

                <section className={styles.formSection} aria-labelledby="contact-heading">
                  <div className={styles.formSectionTitle}>
                    <span>04</span>
                    <div>
                      <h3 id="contact-heading">Enlaces complementarios</h3>
                      <p>Añade el registro oficial y un video cuando estén disponibles.</p>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>Enlace de registro</span>
                      <input
                        type="url"
                        value={draft.registrationUrl}
                        onChange={(event) => updateDraft("registrationUrl", event.target.value)}
                        placeholder="https://…"
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Enlace de video</span>
                      <input
                        type="url"
                        value={draft.videoUrl}
                        onChange={(event) => updateDraft("videoUrl", event.target.value)}
                        placeholder="https://youtube.com/…"
                      />
                    </label>
                  </div>
                </section>

                <section className={styles.formSection} aria-labelledby="publication-heading">
                  <div className={styles.formSectionTitle}>
                    <span>05</span>
                    <div>
                      <h3 id="publication-heading">Publicación</h3>
                      <p>Guarda como borrador, programa o publica inmediatamente.</p>
                    </div>
                  </div>
                  <label className={styles.field}>
                    <span>Fecha y hora programada</span>
                    <input
                      type="datetime-local"
                      value={draft.publishAt}
                      onChange={(event) => updateDraft("publishAt", event.target.value)}
                    />
                    <small>Necesaria únicamente para “Programar”.</small>
                  </label>
                </section>
              </div>

              <footer className={styles.editorFooter}>
                <div>
                  {editing && (
                    <span>
                      Estado actual: <strong>{STATUS_LABELS[editing.editorialStatus]}</strong>
                    </span>
                  )}
                </div>
                <div className={styles.editorActions}>
                  <button type="button" className={styles.ghostButton} onClick={closeEditor} disabled={saving}>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.secondaryButton}
                    disabled={saving || uploadState.status === "uploading"}
                  >
                    {saving ? "Guardando…" : editing?.editorialStatus === "published" ? "Guardar cambios" : "Guardar borrador"}
                  </button>
                  <button
                    type="button"
                    className={styles.scheduleButton}
                    onClick={() => void saveActivity("scheduled")}
                    disabled={saving || uploadState.status === "uploading"}
                  >
                    Programar
                  </button>
                  <button
                    type="button"
                    className={styles.publishButton}
                    onClick={() => void saveActivity("published")}
                    disabled={saving || uploadState.status === "uploading"}
                  >
                    Publicar ahora
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div className={styles.loadingRows} role="status" aria-label={label}>
      {[0, 1, 2, 3].map((item) => (
        <div key={item}>
          <span />
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

function ActivityRow({
  activity,
  index,
  onEdit,
  onEventStatus,
  onArchive,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
  onDuplicate,
}: {
  activity: Activity;
  index: number;
  onEdit(activity: Activity, trigger: HTMLElement): void;
  onEventStatus(activity: Activity, status: EventStatus): Promise<void>;
  onArchive(activity: Activity): Promise<void>;
  onDelete(activity: Activity): Promise<void>;
  onTogglePublish(activity: Activity): Promise<void>;
  onToggleFeatured(activity: Activity): Promise<void>;
  onDuplicate(activity: Activity): Promise<void>;
}) {
  const phase = statusPhase(activity);
  const dateLabel =
    phase === "tbd"
      ? "Fecha por confirmar"
      : `${formatDate(activity.startAt)}${activity.endAt ? ` — ${formatDate(activity.endAt)}` : ""}`;
  const coverUrl = activity.imageUrl;

  return (
    <article
      className={styles.activityRow}
      data-status={activity.editorialStatus}
      style={{ "--row-index": Math.min(index, 10) } as CSSProperties}
    >
      <div className={styles.activityThumb}>
        {coverUrl ? (
          <img src={coverUrl} alt="" />
        ) : (
          <span aria-hidden="true">{getSportName(activity).slice(0, 2).toLocaleUpperCase("es")}</span>
        )}
      </div>
      <div className={styles.activityMain}>
        <div className={styles.activityBadges}>
          <span className={`${styles.statusBadge} ${styles[`status_${activity.editorialStatus}`]}`}>
            {STATUS_LABELS[activity.editorialStatus]}
          </span>
          {activity.eventStatus !== "scheduled" && (
            <span className={`${styles.statusBadge} ${styles.eventWarning}`}>
              {EVENT_LABELS[activity.eventStatus]}
            </span>
          )}
          {activity.featured && <span className={styles.featuredBadge}>Destacada</span>}
        </div>
        <h3>{activity.title}</h3>
        <p>{activity.summary}</p>
        <div className={styles.activityMeta}>
          <span>{getSportName(activity)}</span>
          <span>{dateLabel}</span>
          <span>{activity.venue || activity.municipality || "Sede por confirmar"}</span>
        </div>
      </div>
      <div className={styles.rowActions}>
        <button
          className={styles.quickEdit}
          type="button"
          onClick={(event) => onEdit(activity, event.currentTarget)}
        >
          Editar
        </button>
        <details>
          <summary aria-label={`Más acciones para ${activity.title}`}>Más <span aria-hidden="true">•••</span></summary>
          <div>
            {activity.editorialStatus !== "archived" && (
              <button type="button" onClick={() => void onTogglePublish(activity)}>
                {activity.editorialStatus === "published" ? "Ocultar del sitio" : "Publicar ahora"}
              </button>
            )}
            {activity.editorialStatus !== "archived" && (
              <button type="button" onClick={() => void onToggleFeatured(activity)}>
                {activity.featured ? "Quitar destaque" : "Destacar en portada"}
              </button>
            )}
            <button type="button" onClick={() => void onDuplicate(activity)}>
              Duplicar
            </button>
            {activity.eventStatus === "scheduled" ? (
              <>
                <button type="button" onClick={() => void onEventStatus(activity, "postponed")}>Posponer</button>
                <button className={styles.dangerText} type="button" onClick={() => void onEventStatus(activity, "cancelled")}>Cancelar evento</button>
              </>
            ) : (
              <button type="button" onClick={() => void onEventStatus(activity, "scheduled")}>Reactivar</button>
            )}
            {activity.editorialStatus !== "archived" && (
              <button className={styles.dangerText} type="button" onClick={() => void onArchive(activity)}>
                Archivar
              </button>
            )}
            {activity.editorialStatus === "archived" && (
              <button className={styles.dangerText} type="button" onClick={() => void onDelete(activity)}>
                Eliminar definitivamente
              </button>
            )}
          </div>
        </details>
      </div>
    </article>
  );
}

function SubmissionCard({
  submission,
  index,
  note,
  busy,
  onNote,
  onResolve,
}: {
  submission: Submission;
  index: number;
  note: string;
  busy: boolean;
  onNote(value: string): void;
  onResolve(submission: Submission, action: "accept" | "reject"): Promise<void>;
}) {
  const pending = submission.status === "pending";
  return (
    <article
      className={styles.proposalCard}
      style={{ "--card-index": Math.min(index, 8) } as CSSProperties}
    >
      <header>
        <div>
          <span className={`${styles.proposalStatus} ${styles[`proposal_${submission.status}`]}`}>
            {submission.status === "pending"
              ? "Nueva"
              : submission.status === "accepted"
                ? "Aceptada"
                : submission.status === "rejected"
                  ? "Rechazada"
                  : "Revisada"}
          </span>
          <span>{formatDate(submission.createdAt)}</span>
        </div>
        <h2>{submission.title}</h2>
        <p>{submission.summary}</p>
      </header>

      <dl className={styles.proposalFacts}>
        <div><dt>Disciplina</dt><dd>{submission.sport || "No indicada"}</dd></div>
        <div><dt>Fecha</dt><dd>{submission.dateStatus === "tbd" ? "Por confirmar" : formatDate(submission.startAt)}</dd></div>
        <div><dt>Lugar</dt><dd>{[submission.venue, submission.municipality].filter(Boolean).join(", ")}</dd></div>
        <div><dt>Contacto</dt><dd>{submission.contactName}</dd></div>
      </dl>

      <div className={styles.contactLinks}>
        <a href={`mailto:${submission.contactEmail}`}>{submission.contactEmail}</a>
        {submission.contactPhone && <a href={`tel:${submission.contactPhone}`}>{submission.contactPhone}</a>}
      </div>

      <div className={styles.consentLine}>
        <span aria-hidden="true">{submission.consent ? "✓" : "!"}</span>
        {submission.consent ? "Autorizó el contacto para revisar la propuesta." : "No consta consentimiento."}
      </div>

      <label className={styles.field}>
        <span>Nota interna</span>
        <textarea
          rows={2}
          value={note}
          onChange={(event) => onNote(event.target.value)}
          disabled={!pending || busy}
          placeholder="Añade una observación para el equipo (opcional)."
        />
      </label>

      {pending ? (
        <footer>
          <button
            className={styles.rejectButton}
            type="button"
            disabled={busy}
            onClick={() => void onResolve(submission, "reject")}
          >
            Rechazar
          </button>
          <button
            className={styles.acceptButton}
            type="button"
            disabled={busy || !Boolean(submission.consent)}
            onClick={() => void onResolve(submission, "accept")}
          >
            {busy ? "Procesando…" : "Aceptar como borrador"}
          </button>
        </footer>
      ) : (
        <footer className={styles.proposalResolved}>
          Esta propuesta ya fue {submission.status === "accepted" ? "aceptada" : "rechazada"}.
        </footer>
      )}
    </article>
  );
}
