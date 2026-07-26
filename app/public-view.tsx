"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
} from "react";
import type { PublicActivity } from "../lib/activity-types";
import HeroActivityOrbit from "./hero-activity-orbit";

const TIME_ZONE = "America/Santo_Domingo";
const SAVED_KEY = "miderec-san-juan-saved-activities";

const dateFormatter = new Intl.DateTimeFormat("es-DO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat("es-DO", {
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("es-DO", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

type PublicViewProps = {
  heroActivity: PublicActivity | null;
  latestActivities: PublicActivity[];
  agendaActivities: PublicActivity[];
  recentActivities: PublicActivity[];
  disciplines: string[];
  publishedCount: number;
  refreshNotice: string;
  emptyMessage: string;
  identityLine: string;
  suggestedHandle: string;
  onOpenProposal: () => void;
};

type AgendaMode = "all" | "saved";
type AgendaLayout = "grid" | "list";

function unixDate(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanSpaces(value: string) {
  return value.replace(/\p{Zs}/gu, " ");
}

function formatActivityDate(activity: PublicActivity) {
  const date = unixDate(activity.startAt);
  if (activity.dateStatus === "tbd" || !date) return "Fecha por confirmar";
  return cleanSpaces(dateFormatter.format(date));
}

function formatShortDate(activity: PublicActivity) {
  const date = unixDate(activity.startAt);
  if (activity.dateStatus === "tbd" || !date) return { day: "—", month: "Próx." };
  const parts = shortDateFormatter.formatToParts(date);
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "—",
    month: (parts.find((part) => part.type === "month")?.value ?? "").replace(".", ""),
  };
}

function formatActivityTime(activity: PublicActivity) {
  const start = unixDate(activity.startAt);
  const end = unixDate(activity.endAt);
  if (!start || activity.dateStatus === "tbd") return "Horario por confirmar";
  const startLabel = cleanSpaces(timeFormatter.format(start));
  return end
    ? `${startLabel} — ${cleanSpaces(timeFormatter.format(end))}`
    : startLabel;
}

function formatStatus(activity: PublicActivity) {
  if (activity.eventStatus === "cancelled") return "Cancelada";
  if (activity.eventStatus === "postponed") return "Pospuesta";
  return activity.dateStatus === "tbd" ? "Fecha pendiente" : "Confirmada";
}

function showImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = "/hero-deporte.webp";
}

function escapeCalendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function calendarStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function downloadCalendar(activity: PublicActivity) {
  const start = unixDate(activity.startAt);
  if (!start) return;
  const end = unixDate(activity.endAt) ?? new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const contents = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MIDEREC San Juan//Agenda Provincial//ES",
    "BEGIN:VEVENT",
    `UID:${activity.id}@miderec-san-juan`,
    `DTSTAMP:${calendarStamp(new Date())}`,
    `DTSTART:${calendarStamp(start)}`,
    `DTEND:${calendarStamp(end)}`,
    `SUMMARY:${escapeCalendarText(activity.title)}`,
    `DESCRIPTION:${escapeCalendarText(activity.summary)}`,
    `LOCATION:${escapeCalendarText(`${activity.venue}, ${activity.municipality}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${activity.slug || "actividad"}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function shareActivity(activity: PublicActivity) {
  const shareData = {
    title: activity.title,
    text: `${formatActivityDate(activity)} · ${activity.venue}, ${activity.municipality}`,
    url: `${window.location.origin}${window.location.pathname}#agenda`,
  };
  if (navigator.share) {
    await navigator.share(shareData);
    return "Compartido";
  }
  await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
  return "Enlace copiado";
}

function ActivityCard({
  activity,
  saved,
  layout,
  onOpen,
  onToggleSaved,
}: {
  activity: PublicActivity;
  saved: boolean;
  layout: AgendaLayout;
  onOpen(activity: PublicActivity): void;
  onToggleSaved(activity: PublicActivity): void;
}) {
  const date = formatShortDate(activity);

  return (
    <article className={`activity-card activity-card-${layout}`} data-reveal>
      <button
        className="activity-cover"
        type="button"
        onClick={() => onOpen(activity)}
        aria-label={`Ver detalles de ${activity.title}`}
      >
        {activity.imageUrl ? (
          <img
            src={activity.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={showImageFallback}
          />
        ) : (
          <span className="activity-cover-fallback" aria-hidden="true">
            {activity.sport.slice(0, 2).toLocaleUpperCase("es")}
          </span>
        )}
        <span className="activity-date">
          <strong>{date.day}</strong>
          <small>{date.month}</small>
        </span>
      </button>

      <div className="activity-card-body">
        <div className="activity-card-topline">
          <span>{activity.sport}</span>
          <span data-status={activity.eventStatus}>{formatStatus(activity)}</span>
        </div>
        <h3>
          <button type="button" onClick={() => onOpen(activity)}>{activity.title}</button>
        </h3>
        <p>{activity.summary}</p>
        <dl>
          <div><dt>Municipio</dt><dd>{activity.municipality}</dd></div>
          <div><dt>Sede</dt><dd>{activity.venue}</dd></div>
          <div><dt>Hora</dt><dd>{formatActivityTime(activity)}</dd></div>
        </dl>
        <div className="activity-card-actions">
          <button type="button" onClick={() => onOpen(activity)}>Ver detalles</button>
          <button
            type="button"
            className={saved ? "is-saved" : ""}
            aria-pressed={saved}
            onClick={() => onToggleSaved(activity)}
          >
            <span aria-hidden="true">{saved ? "★" : "☆"}</span>
            {saved ? "Guardada" : "Guardar"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function PublicView({
  heroActivity,
  latestActivities,
  agendaActivities,
  recentActivities,
  disciplines,
  publishedCount,
  refreshNotice,
  emptyMessage,
  identityLine,
  suggestedHandle,
  onOpenProposal,
}: PublicViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [municipality, setMunicipality] = useState("all");
  const [sport, setSport] = useState("all");
  const [mode, setMode] = useState<AgendaMode>("all");
  const [layout, setLayout] = useState<AgendaLayout>("grid");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<PublicActivity | null>(null);
  const [shareNotice, setShareNotice] = useState("");
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const scrollAnimationRef = useRef(0);

  const municipalities = useMemo(
    () =>
      Array.from(new Set(agendaActivities.map((activity) => activity.municipality.trim())))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "es")),
    [agendaActivities],
  );

  const localityCounts = useMemo(
    () =>
      municipalities
        .map((name) => ({
          name,
          count: agendaActivities.filter((activity) => activity.municipality === name).length,
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es")),
    [agendaActivities, municipalities],
  );

  const filteredActivities = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return agendaActivities.filter((activity) => {
      const matchesQuery =
        !needle ||
        [activity.title, activity.summary, activity.sport, activity.municipality, activity.venue]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(needle);
      const matchesMunicipality = municipality === "all" || activity.municipality === municipality;
      const matchesSport = sport === "all" || activity.sport === sport;
      const matchesMode = mode === "all" || savedIds.includes(activity.id);
      return matchesQuery && matchesMunicipality && matchesSport && matchesMode;
    });
  }, [agendaActivities, mode, municipality, query, savedIds, sport]);

  const featured = heroActivity ?? agendaActivities[0] ?? null;
  const orbitActivities = latestActivities.length
    ? latestActivities
    : featured
      ? [featured]
      : [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(SAVED_KEY) || "[]");
        if (Array.isArray(stored)) {
          setSavedIds(stored.filter((value): value is string => typeof value === "string"));
        }
      } catch {
        // El estado vacío es el fallback seguro si la preferencia local está dañada.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [filteredActivities.length, selectedActivity]);

  useEffect(() => {
    if (!selectedActivity) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => detailCloseRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedActivity(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedActivity]);

  useEffect(
    () => () => window.cancelAnimationFrame(scrollAnimationRef.current),
    [],
  );

  function toggleSaved(activity: PublicActivity) {
    setSavedIds((current) => {
      const next = current.includes(activity.id)
        ? current.filter((id) => id !== activity.id)
        : [...current, activity.id];
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setMunicipality("all");
    setSport("all");
    setMode("all");
  }

  function scrollToIndex(
    event: ReactMouseEvent<HTMLElement> | null,
    sectionId: string,
  ) {
    event?.preventDefault();
    setMenuOpen(false);
    const target = document.getElementById(sectionId);
    if (!target) return;
    window.cancelAnimationFrame(scrollAnimationRef.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const headerHeight = document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
    const startY = window.scrollY;
    const targetY = Math.max(0, startY + target.getBoundingClientRect().top - headerHeight);
    const distance = targetY - startY;

    const markArrival = () => {
      target.classList.add("is-section-target");
      window.setTimeout(() => target.classList.remove("is-section-target"), 1050);
    };

    target.classList.remove("is-section-target");
    if (Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      markArrival();
      return;
    }

    const duration = reduced
      ? 360
      : Math.min(1250, Math.max(760, Math.abs(distance) * 0.44));
    let startedAt: number | null = null;
    const ease = (progress: number) =>
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    const step = (now: number) => {
      if (startedAt === null) startedAt = now;
      const progress = Math.min((now - startedAt) / duration, 1);
      window.scrollTo(0, startY + distance * ease(progress));
      if (progress < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame(step);
      } else {
        markArrival();
      }
    };
    scrollAnimationRef.current = window.requestAnimationFrame(step);
  }

  function chooseLocality(name: string) {
    setMunicipality(name);
    setMode("all");
    scrollToIndex(null, "agenda");
  }

  async function handleShare(activity: PublicActivity) {
    try {
      setShareNotice(await shareActivity(activity));
    } catch {
      setShareNotice("No se pudo compartir");
    }
    window.setTimeout(() => setShareNotice(""), 2200);
  }

  return (
    <div className="public-site">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      <div className="institution-bar">
        <div className="site-shell">
          <span>Gobierno de la República Dominicana</span>
          <span>Dirección Provincial San Juan</span>
        </div>
      </div>

      <header className="site-header">
        <div className="site-shell header-inner">
          <a className="brand" href="#inicio" aria-label="MIDEREC San Juan, inicio">
            <span className="brand-slashes" aria-hidden="true">{"///"}</span>
            <img src="/miderec-logo.svg" alt="MIDEREC" />
            <span><strong>San Juan</strong><small>Agenda deportiva provincial</small></span>
          </a>

          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="public-navigation"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
            <span>{menuOpen ? "Cerrar" : "Menú"}</span>
          </button>

          <nav
            id="public-navigation"
            className={menuOpen ? "is-open" : ""}
            aria-label="Navegación principal"
          >
            <a href="#agenda" onClick={(event) => scrollToIndex(event, "agenda")}>Actividades</a>
            <a href="#localidades" onClick={(event) => scrollToIndex(event, "localidades")}>Localidades</a>
            <a href="#publicar" onClick={(event) => scrollToIndex(event, "publicar")}>Cómo publicar</a>
            <button type="button" onClick={() => { setMenuOpen(false); onOpenProposal(); }}>
              Enviar actividad
            </button>
          </nav>
        </div>
      </header>

      <main id="contenido">
        <section className="hero" id="inicio">
          <div className="hero-rule" aria-hidden="true"><span /></div>
          <div className="site-shell hero-layout">
            <div className="hero-copy" data-reveal>
              <p className="section-kicker"><span>Agenda oficial</span>{identityLine}</p>
              <h1><span>San Juan</span><em>se mueve.</em></h1>
              <p className="hero-statement">Una agenda. Todas las localidades.</p>
              <p className="hero-lead">
                Descubre actividades verificadas, encuentra lo que ocurre cerca de ti
                y suma tu comunidad al movimiento deportivo provincial.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#agenda" onClick={(event) => scrollToIndex(event, "agenda")}>Explorar actividades</a>
                <button className="button button-secondary" type="button" onClick={onOpenProposal}>
                  Proponer una actividad
                </button>
              </div>
              <button
                className="hero-radar"
                type="button"
                onClick={(event) => scrollToIndex(event, "agenda")}
              >
                <span className="radar-pulse" aria-hidden="true"><i /><i /><b /></span>
                <span>
                  <small>Radar provincial</small>
                  <strong>
                    {agendaActivities.length
                      ? `${agendaActivities.length} actividades listas para explorar`
                      : "Agenda abierta a toda la provincia"}
                  </strong>
                </span>
                <b aria-hidden="true">Explorar señal →</b>
              </button>
            </div>

            <div className="hero-visual" data-reveal>
              <HeroActivityOrbit
                activities={orbitActivities}
                onOpenActivity={setSelectedActivity}
              />
            </div>
          </div>
        </section>

        <section className="agenda-section" id="agenda">
          <div className="site-shell">
            <header className="section-heading" data-reveal>
              <div>
                <p className="section-kicker"><span>01</span>Agenda provincial</p>
                <h2>Encuentra tu próxima actividad.</h2>
              </div>
              <p>
                Información revisada por la Dirección Provincial. Busca por nombre,
                disciplina, sede o localidad.
              </p>
            </header>

            <div className="agenda-controls" data-reveal>
              <label className="agenda-search">
                <span>Buscar</span>
                <div>
                  <i aria-hidden="true">⌕</i>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Actividad, sede o disciplina"
                  />
                </div>
              </label>
              <label>
                <span>Localidad</span>
                <select value={municipality} onChange={(event) => setMunicipality(event.target.value)}>
                  <option value="all">Todas las localidades</option>
                  {municipalities.map((name) => <option value={name} key={name}>{name}</option>)}
                </select>
              </label>
              <label>
                <span>Disciplina</span>
                <select value={sport} onChange={(event) => setSport(event.target.value)}>
                  <option value="all">Todas las disciplinas</option>
                  {disciplines.map((name) => <option value={name} key={name}>{name}</option>)}
                </select>
              </label>
              <button
                className={`saved-filter${mode === "saved" ? " is-active" : ""}`}
                type="button"
                aria-pressed={mode === "saved"}
                onClick={() => setMode((current) => current === "saved" ? "all" : "saved")}
              >
                ★ Guardadas <span>{savedIds.length}</span>
              </button>
            </div>

            <div className="agenda-result-bar">
              <p aria-live="polite">
                <strong>{filteredActivities.length}</strong>{" "}
                {filteredActivities.length === 1 ? "actividad encontrada" : "actividades encontradas"}
                <span>{refreshNotice || "Agenda sincronizada"}</span>
              </p>
              <div>
                {(query || municipality !== "all" || sport !== "all" || mode !== "all") && (
                  <button type="button" onClick={clearFilters}>Limpiar filtros</button>
                )}
                <span className="layout-switcher" aria-label="Formato de la agenda">
                  <button
                    type="button"
                    className={layout === "grid" ? "is-active" : ""}
                    aria-pressed={layout === "grid"}
                    onClick={() => setLayout("grid")}
                  >
                    Cuadrícula
                  </button>
                  <button
                    type="button"
                    className={layout === "list" ? "is-active" : ""}
                    aria-pressed={layout === "list"}
                    onClick={() => setLayout("list")}
                  >
                    Lista
                  </button>
                </span>
              </div>
            </div>

            {filteredActivities.length ? (
              <div className={`activity-grid activity-grid-${layout}`}>
                {filteredActivities.map((activity) => (
                  <ActivityCard
                    activity={activity}
                    saved={savedIds.includes(activity.id)}
                    layout={layout}
                    key={activity.id}
                    onOpen={setSelectedActivity}
                    onToggleSaved={toggleSaved}
                  />
                ))}
              </div>
            ) : (
              <div className="agenda-empty" data-reveal>
                <span aria-hidden="true">SJ</span>
                <div>
                  <h3>{agendaActivities.length ? "No encontramos coincidencias." : "La agenda está lista para comenzar."}</h3>
                  <p>{agendaActivities.length ? "Prueba otra localidad, disciplina o término de búsqueda." : emptyMessage}</p>
                </div>
                <button type="button" onClick={agendaActivities.length ? clearFilters : onOpenProposal}>
                  {agendaActivities.length ? "Restablecer búsqueda" : "Enviar primera propuesta"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="locality-section" id="localidades">
          <div className="site-shell locality-layout">
            <header className="section-heading section-heading-light" data-reveal>
              <div>
                <p className="section-kicker"><span>02</span>Territorio deportivo</p>
                <h2>San Juan se mueve por localidades.</h2>
              </div>
              <p>
                Entra directamente a la agenda de tu zona. El directorio crece
                automáticamente con cada actividad publicada.
              </p>
            </header>

            {localityCounts.length ? (
              <div className="locality-list" data-reveal>
                {localityCounts.map((item, index) => (
                  <button type="button" key={item.name} onClick={() => chooseLocality(item.name)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.name}</strong>
                    <small>{item.count} {item.count === 1 ? "actividad" : "actividades"}</small>
                    <i aria-hidden="true">→</i>
                  </button>
                ))}
              </div>
            ) : (
              <div className="locality-empty">
                <strong>Toda la provincia está invitada.</strong>
                <p>Las localidades aparecerán aquí con la primera actividad aprobada.</p>
              </div>
            )}
          </div>
        </section>

        {recentActivities.length > 0 && (
          <section className="memory-section" id="cobertura">
            <div className="site-shell">
              <header className="section-heading" data-reveal>
                <div>
                  <p className="section-kicker"><span>03</span>Archivo reciente</p>
                  <h2>Lo que ya puso a San Juan en movimiento.</h2>
                </div>
                <p>Actividades finalizadas y coberturas recientes de la agenda provincial.</p>
              </header>
              <div className="memory-grid">
                {recentActivities.map((activity) => (
                  <button
                    className="memory-card"
                    type="button"
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    data-reveal
                  >
                    {activity.imageUrl ? (
                      <img src={activity.imageUrl} alt="" loading="lazy" onError={showImageFallback} />
                    ) : (
                      <span className="memory-fallback" aria-hidden="true">{activity.sport.slice(0, 2)}</span>
                    )}
                    <span><small>{activity.sport} · {activity.municipality}</small><strong>{activity.title}</strong></span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="publish-section" id="publicar">
          <div className="site-shell publish-layout">
            <div className="publish-copy" data-reveal>
              <p className="section-kicker"><span>03</span>Participación comunitaria</p>
              <h2>¿Organizas una actividad deportiva?</h2>
              <p>
                Clubes, ligas, escuelas y comunidades pueden solicitar su inclusión.
                Revisamos cada dato antes de mostrarlo en la agenda oficial.
              </p>
              <button className="button button-primary" type="button" onClick={onOpenProposal}>
                Enviar actividad para revisión
              </button>
            </div>
            <ol className="publish-steps" data-reveal>
              <li><span>01</span><div><strong>Envía</strong><p>Completa los datos, sede, fecha y contacto.</p></div></li>
              <li><span>02</span><div><strong>Validamos</strong><p>El equipo provincial revisa la información.</p></div></li>
              <li><span>03</span><div><strong>Publicamos</strong><p>La actividad aparece en la agenda cuando es aprobada.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="contact-section" id="contacto">
          <div className="site-shell contact-layout">
            <div>
              <p className="section-kicker"><span>04</span>Dirección Provincial</p>
              <h2>Un canal directo para el deporte de San Juan.</h2>
            </div>
            <address>
              <span>Director provincial</span>
              <strong>Luis Daniel del Cristo Santiago</strong>
              <a href="tel:+18092847909">809-284-7909</a>
              <a href="mailto:luisdelcristosantiago@gmail.com">luisdelcristosantiago@gmail.com</a>
            </address>
            <div className="contact-actions">
              <a href="https://wa.me/18092847909" target="_blank" rel="noreferrer">Escribir por WhatsApp ↗</a>
              <a href="https://miderec.gob.do/directores-provinciales/" target="_blank" rel="noreferrer">Directorio oficial ↗</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-shell footer-main">
          <div className="footer-brand">
            <img src="/miderec-logo.svg" alt="MIDEREC" loading="lazy" />
            <p>Dirección Provincial San Juan<br />Ministerio de Deportes y Recreación</p>
          </div>
          <nav aria-label="Enlaces del pie">
            <a href="#agenda" onClick={(event) => scrollToIndex(event, "agenda")}>Actividades</a>
            <a href="#localidades" onClick={(event) => scrollToIndex(event, "localidades")}>Localidades</a>
            <button type="button" onClick={onOpenProposal}>Enviar actividad</button>
            <a href="/admin">Panel administrativo</a>
          </nav>
          <div className="footer-social">
            <span>{suggestedHandle}</span>
            <a href="https://www.instagram.com/MiderecRD/" target="_blank" rel="noreferrer">Instagram ↗</a>
            <a href="https://www.facebook.com/MiderecRD" target="_blank" rel="noreferrer">Facebook ↗</a>
          </div>
        </div>
        <div className="site-shell footer-bottom">
          <span>© {new Date().getFullYear()} MIDEREC San Juan</span>
          <span>{publishedCount} publicaciones verificadas</span>
          <a href="#inicio" onClick={(event) => scrollToIndex(event, "inicio")}>Volver arriba ↑</a>
        </div>
      </footer>

      {shareNotice && <div className="public-toast" role="status">{shareNotice}</div>}

      {selectedActivity && (
        <div
          className="activity-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedActivity(null);
          }}
        >
          <section
            className="activity-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-dialog-title"
          >
            <button
              className="activity-dialog-close"
              type="button"
              ref={detailCloseRef}
              aria-label="Cerrar detalles"
              onClick={() => setSelectedActivity(null)}
            >
              ×
            </button>
            <div className="activity-dialog-media">
              <img
                src={selectedActivity.imageUrl || "/hero-deporte.webp"}
                alt=""
                onError={showImageFallback}
              />
              <span>{selectedActivity.sport}</span>
            </div>
            <div className="activity-dialog-body">
              <p className="section-kicker"><span>{formatStatus(selectedActivity)}</span>{selectedActivity.municipality}</p>
              <h2 id="activity-dialog-title">{selectedActivity.title}</h2>
              <p className="activity-dialog-summary">{selectedActivity.summary}</p>
              <dl>
                <div><dt>Fecha</dt><dd>{formatActivityDate(selectedActivity)}</dd></div>
                <div><dt>Horario</dt><dd>{formatActivityTime(selectedActivity)}</dd></div>
                <div><dt>Lugar</dt><dd>{selectedActivity.venue}</dd></div>
                <div><dt>Municipio</dt><dd>{selectedActivity.municipality}</dd></div>
              </dl>
              <div className="activity-dialog-actions">
                {selectedActivity.registrationUrl && (
                  <a href={selectedActivity.registrationUrl} target="_blank" rel="noreferrer">Inscribirme ↗</a>
                )}
                {selectedActivity.startAt && (
                  <button type="button" onClick={() => downloadCalendar(selectedActivity)}>
                    Añadir al calendario
                  </button>
                )}
                <button type="button" onClick={() => void handleShare(selectedActivity)}>Compartir</button>
                <button
                  type="button"
                  className={savedIds.includes(selectedActivity.id) ? "is-saved" : ""}
                  onClick={() => toggleSaved(selectedActivity)}
                >
                  {savedIds.includes(selectedActivity.id) ? "★ Guardada" : "☆ Guardar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
