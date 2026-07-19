"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
import type { PublicActivity } from "../lib/activity-types";

const TIME_ZONE = "America/Santo_Domingo";

const dateFormatter = new Intl.DateTimeFormat("es-DO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const monthFormatter = new Intl.DateTimeFormat("es-DO", {
  month: "short",
  timeZone: TIME_ZONE,
});

const dayFormatter = new Intl.DateTimeFormat("es-DO", {
  day: "2-digit",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("es-DO", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const signalWords = [
  "Agenda",
  "Resultados",
  "Fotografía",
  "Video",
  "Convocatorias",
  "Talento",
  "Comunidad",
];

const editorialFlow = [
  { number: "01", title: "Propuesta", text: "La comunidad envía la información." },
  { number: "02", title: "Revisión", text: "El equipo provincial valida los datos." },
  { number: "03", title: "Publicación", text: "La agenda pública se actualiza." },
];

type PublicViewProps = {
  heroActivity: PublicActivity | null;
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

function unixDate(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function showImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = "/hero-deporte.webp";
}

// El runtime del servidor y el del navegador pueden formatear la misma fecha
// con espacios especiales distintos (p. ej. el "narrow no-break space" U+202F
// antes de "p. m."). Aunque se ven iguales, esos caracteres invisibles hacen
// que React reporte un desajuste de hidratación. Normalizarlos a un espacio
// normal deja el texto idéntico en ambos lados sin cambiar lo que se ve.
function cleanSpaces(value: string): string {
  return value.replace(/\p{Zs}/gu, " ");
}

function formatActivityDate(activity: PublicActivity) {
  const date = unixDate(activity.startAt);
  if (activity.dateStatus === "tbd" || !date) return "Fecha por confirmar";
  return cleanSpaces(dateFormatter.format(date));
}

function formatActivityTime(activity: PublicActivity) {
  const start = unixDate(activity.startAt);
  const end = unixDate(activity.endAt);
  if (!start || activity.dateStatus === "tbd") return null;
  return end
    ? `${cleanSpaces(timeFormatter.format(start))}–${cleanSpaces(timeFormatter.format(end))}`
    : cleanSpaces(timeFormatter.format(start));
}

function formatStatus(activity: PublicActivity) {
  const value = activity.eventStatus.toLowerCase();
  if (value.includes("cancel")) return "Cancelada";
  if (value.includes("complet")) return "Finalizada";
  if (value.includes("postpon")) return "Pospuesta";
  if (value.includes("live") || value.includes("ongoing")) return "En curso";
  return activity.dateStatus === "tbd" ? "Fecha por confirmar" : "Programada";
}

function dateParts(activity: PublicActivity) {
  const date = unixDate(activity.startAt);
  if (!date || activity.dateStatus === "tbd") return { day: "—", month: "Próx." };
  return {
    day: dayFormatter.format(date),
    month: monthFormatter.format(date).replace(".", ""),
  };
}

function SectionTitle({
  index,
  label,
  title,
  summary,
  inverse = false,
}: {
  index: string;
  label: string;
  title: string;
  summary: string;
  inverse?: boolean;
}) {
  return (
    <header className={`signal-heading${inverse ? " signal-heading-inverse" : ""}`} data-reveal="up">
      <div>
        <p className="signal-label"><span className="label-index">{index}</span>{label}</p>
        <h2 data-reveal="clip">{title}</h2>
      </div>
      <p>{summary}</p>
      <span className="heading-stroke" aria-hidden="true" />
    </header>
  );
}

function formatCountdown(diffMs: number) {
  if (diffMs <= 0) return "En curso";
  const minutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, "0")}m`;
  return `${mins} min`;
}

function HeroSpotlight({ activity }: { activity: PublicActivity | null }) {
  const [nowMs, setNowMs] = useState(0);
  const startAt =
    activity && activity.dateStatus !== "tbd" && typeof activity.startAt === "number"
      ? activity.startAt
      : null;
  const endAt = activity && typeof activity.endAt === "number" ? activity.endAt : null;

  useEffect(() => {
    if (startAt === null) return;
    const initial = window.setTimeout(() => setNowMs(Date.now()), 0);
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [startAt]);

  const startMs = startAt !== null ? startAt * 1000 : null;
  const endMs = endAt !== null ? endAt * 1000 : null;
  const live =
    nowMs > 0 &&
    startMs !== null &&
    nowMs >= startMs &&
    nowMs <= (endMs ?? startMs + 6 * 3_600_000);
  const remaining =
    !live && nowMs > 0 && startMs !== null && startMs > nowMs
      ? formatCountdown(startMs - nowMs)
      : null;

  return (
    <figure className={`hero-spot${live ? " is-live" : ""}`}>
      <div className="hero-spot-media">
        <img
          src={activity?.imageUrl || "/hero-deporte.webp"}
          alt={
            activity?.imageUrl
              ? `Actividad deportiva: ${activity.title}`
              : "Atleta sanjuanero corriendo en una pista al atardecer"
          }
          fetchPriority="high"
          decoding="async"
          onError={showImageFallback}
        />
      </div>
      <span className="hero-spot-shade" aria-hidden="true" />
      <div className="hero-spot-coords" aria-hidden="true">
        <span>Provincia San Juan</span>
        <span>Rep. Dominicana</span>
      </div>
      <figcaption className="hero-spot-caption">
        {activity ? (
          <>
            <p className="hero-spot-tag">
              <i aria-hidden="true" />
              {live ? "Ocurriendo ahora" : "Próxima actividad"} · {activity.sport}
            </p>
            <strong>{activity.title}</strong>
            <span>{formatActivityDate(activity)} · {activity.venue}</span>
            {(live || remaining) && (
              <em className="hero-spot-clock">{live ? "En curso" : `Faltan ${remaining}`}</em>
            )}
          </>
        ) : (
          <>
            <p className="hero-spot-tag">
              <i aria-hidden="true" />
              Deporte sanjuanero
            </p>
            <strong>El deporte de San Juan corre aquí.</strong>
            <span>La próxima actividad aprobada se estrena en este espacio.</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

function RunnerFigure() {
  return (
    <div className="runner-figure">
      <div className="r-arm r-arm-back"><span className="r-forearm" /></div>
      <div className="r-leg r-leg-back"><span className="r-shin" /></div>
      <span className="r-torso" />
      <span className="r-head" />
      <div className="r-leg r-leg-front"><span className="r-shin" /></div>
      <div className="r-arm r-arm-front"><span className="r-forearm" /></div>
    </div>
  );
}

function TrackRunner() {
  return (
    <div className="contact-track" aria-hidden="true">
      <div className="runner">
        <span className="runner-shadow" />
        <i className="runner-trail" />
        <RunnerFigure />
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("es-DO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TIME_ZONE,
    });
    const update = () => setTime(formatter.format(new Date()));
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <span className="live-clock">
      <i aria-hidden="true" />
      En vivo · {time ?? "--:--"}
    </span>
  );
}

function StatTile({
  value,
  label,
  hint,
  accent,
  glyph,
  index,
}: {
  value: number;
  label: string;
  hint: string;
  accent: "sky" | "red" | "blue";
  glyph: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(value);

  // Cuenta ascendente cuando la ficha entra en pantalla (respeta reduce-motion).
  useEffect(() => {
    const node = ref.current;
    if (!node || value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const startedAt = performance.now();
        const step = (timestamp: number) => {
          const progress = Math.min((timestamp - startedAt) / 1000, 1);
          setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  // La ficha se inclina y proyecta un foco que sigue al cursor (solo puntero fino).
  function handleMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const el = event.currentTarget;
    const bounds = el.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty("--tx", `${((0.5 - y) * 8).toFixed(2)}deg`);
    el.style.setProperty("--ty", `${((x - 0.5) * 9).toFixed(2)}deg`);
  }

  function resetTilt(event: ReactPointerEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    el.style.setProperty("--tx", "0deg");
    el.style.setProperty("--ty", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "0%");
  }

  return (
    <div
      ref={ref}
      className="pulse-tile"
      data-accent={accent}
      style={{ "--pulse-index": index } as CSSProperties}
      onPointerMove={handleMove}
      onPointerLeave={resetTilt}
    >
      <span className="pulse-glyph" aria-hidden="true">{glyph}</span>
      <strong className="pulse-num">{String(shown).padStart(2, "0")}</strong>
      <span className="pulse-label">{label}</span>
      <span className="pulse-hint">{hint}</span>
      <span className="pulse-scan" aria-hidden="true" />
    </div>
  );
}

function LivePulseTile() {
  // Empieza en null para que el HTML del servidor y el primer render del
  // cliente coincidan; la cuenta regresiva arranca solo tras montar.
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    setSecs(60);
    const timer = window.setInterval(() => {
      setSecs((current) => (current && current > 1 ? current - 1 : 60));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="pulse-tile pulse-live" style={{ "--pulse-index": 3 } as CSSProperties}>
      <span className="pulse-live-top">
        <i className="pulse-dot" aria-hidden="true" />En vivo
      </span>
      <span className="pulse-live-count">
        {secs === null ? (
          "Datos automáticos"
        ) : (
          <>
            Actualiza en <b>{secs}s</b>
          </>
        )}
      </span>
      <span className="pulse-bar" aria-hidden="true">
        <i />
      </span>
    </div>
  );
}

function MottoMarquee() {
  return (
    <div className="motto-marquee" aria-hidden="true">
      <div className="motto-track">
        {[0, 1].map((copy) => (
          <div className="motto-group" key={copy}>
            <span>San Juan se mueve</span><i>{"//"}</i>
            <span className="motto-outline">El deporte nos une</span><i>{"//"}</i>
            <span>#SanJuanSeMueve</span><i>{"//"}</i>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicView({
  heroActivity,
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
  const [shareLabel, setShareLabel] = useState("Compartir");
  const [motionReady, setMotionReady] = useState(false);
  const siteRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const revealedElementsRef = useRef<Set<HTMLElement>>(new Set());

  const primaryAgenda = agendaActivities[0] ?? null;
  const secondaryAgenda = agendaActivities.slice(1);

  useEffect(() => {
    console.info(
      "%c#SanJuanSeMueve %c— El deporte nos une. Plataforma deportiva de la provincia San Juan.",
      "background:#ec2530;color:#fff;font-weight:900;padding:4px 10px;",
      "color:#7ad7ff;font-weight:700;padding:4px 6px;",
    );
    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => document.removeEventListener("keydown", closeMenuOnEscape);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setMotionReady(true), 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealedElementsRef.current.add(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6%" },
    );
    observerRef.current = observer;

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const observer = observerRef.current;
    const root = siteRef.current;
    if (!observer || !root) return;

    // Restore is-visible to already revealed elements, clean up detached ones
    revealedElementsRef.current.forEach((el) => {
      if (document.body.contains(el)) {
        el.classList.add("is-visible");
      } else {
        revealedElementsRef.current.delete(el);
      }
    });

    // Observe elements that have [data-reveal] but are not yet revealed
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
      if (!revealedElementsRef.current.has(element)) {
        observer.observe(element);
      }
    });
  });

  useEffect(() => {
    const root = siteRef.current;
    if (!root) return;
    let frame = 0;

    function updateProgress() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      root?.style.setProperty("--scroll-progress", String(progress));
      frame = 0;
    }

    function requestProgress() {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    }

    updateProgress();
    window.addEventListener("scroll", requestProgress, { passive: true });
    window.addEventListener("resize", requestProgress);
    return () => {
      window.removeEventListener("scroll", requestProgress);
      window.removeEventListener("resize", requestProgress);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  function moveHeroPointer(event: ReactPointerEvent<HTMLElement>) {
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--pointer-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--pointer-y", `${y * 100}%`);
    event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${(x - 0.5) * 6}deg`);
  }

  function resetHeroPointer(event: ReactPointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--pointer-x", "70%");
    event.currentTarget.style.setProperty("--pointer-y", "35%");
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  }

  async function shareSite() {
    const shareData = {
      title: "MIDEREC — Dirección Provincial San Juan",
      text: "San Juan se mueve.",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareLabel("Compartido");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareLabel("Enlace copiado");
      }
    } catch {
      setShareLabel("Compartir");
    }
    window.setTimeout(() => setShareLabel("Compartir"), 2400);
  }

  return (
    <div className={`public-site${motionReady ? " motion-ready" : ""}`} ref={siteRef}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="reading-progress" aria-hidden="true"><span /></div>

      <div className="government-bar">
        <span>Gobierno de la República Dominicana</span>
        <span className="government-separator" aria-hidden="true" />
        <span>Ministerio de Deportes y Recreación</span>
        <strong>San Juan</strong>
      </div>

      <header className="site-header">
        <div className="site-shell header-inner">
          <a className="brand" href="#inicio" onClick={() => setMenuOpen(false)}>
            <img src="/miderec-logo.svg" alt="Ministerio de Deportes y Recreación" />
            <span className="brand-rule" aria-hidden="true" />
            <span className="brand-office">
              <span>Dirección Provincial</span>
              <strong>San Juan</strong>
            </span>
          </a>

          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>

          <nav
            className={`primary-nav${menuOpen ? " is-open" : ""}`}
            id="primary-navigation"
            aria-label="Navegación principal"
          >
            <a href="#agenda" onClick={() => setMenuOpen(false)}>Agenda</a>
            <a href="#cobertura" onClick={() => setMenuOpen(false)}>Cobertura</a>
            <a href="#disciplinas" onClick={() => setMenuOpen(false)}>Disciplinas</a>
            <a href="#redes" onClick={() => setMenuOpen(false)}>Redes</a>
            <a href="#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
            <button className="share-button" type="button" onClick={shareSite}>
              {shareLabel} <span aria-hidden="true">↗</span>
            </button>
          </nav>
        </div>
      </header>

      <div className="signal-ticker" role="region" aria-label="Temas de la plataforma deportiva">
        <div className="ticker-viewport">
          <div className="ticker-track">
            {[0, 1].map((copy) => (
              <div className="ticker-group" key={copy} aria-hidden={copy === 1}>
                {signalWords.map((word) => (
                  <span key={`${copy}-${word}`}>{word}<i aria-hidden="true">{"//"}</i></span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main id="contenido">
        <section
          className="signal-hero"
          id="inicio"
          onPointerMove={moveHeroPointer}
          onPointerLeave={resetHeroPointer}
        >
          <div className="hero-spotlight" aria-hidden="true" />
          <div className="hero-speed-lines" aria-hidden="true"><i /><i /><i /><i /></div>

          <div className="site-shell hero-grid">
            <div className="hero-copy">
              <div className="hero-kicker" data-reveal="up">
                <span>Plataforma deportiva provisional</span>
                <strong>San Juan · RD</strong>
                <LiveClock />
              </div>
              <h1 aria-label={identityLine} data-reveal="clip">
                <span className="hero-outline">San Juan</span>
                <span>se mueve</span>
              </h1>
              <p className="hero-lead" data-reveal="up">
                La agenda, las oportunidades y las historias del deporte sanjuanero en una plataforma pública que se actualiza con cada actividad aprobada.
              </p>
              <div className="hero-actions" data-reveal="up">
                <a className="signal-button signal-button-red" href="#agenda">
                  Explorar agenda <span aria-hidden="true">↓</span>
                </a>
                <button className="signal-button signal-button-ghost" type="button" onClick={onOpenProposal}>
                  Proponer actividad <span aria-hidden="true">↗</span>
                </button>
              </div>
              <div className="hero-pulse" data-reveal="up">
                <StatTile value={publishedCount} label="Publicadas" hint="visibles en la web" accent="sky" glyph="◉" index={0} />
                <StatTile value={agendaActivities.length} label="En agenda" hint="lo que viene" accent="red" glyph="▲" index={1} />
                <StatTile value={disciplines.length} label="Disciplinas" hint="en movimiento" accent="blue" glyph="◆" index={2} />
                <LivePulseTile />
              </div>
            </div>

            <div className="hero-arena" data-reveal="scale">
              <HeroSpotlight activity={heroActivity} />
            </div>
          </div>

          <div className="site-shell hero-event-rail" data-reveal="up">
            {heroActivity ? (
              <article>
                <div className="event-rail-date">
                  <span>{dateParts(heroActivity).month}</span>
                  <strong>{dateParts(heroActivity).day}</strong>
                </div>
                <div className="event-rail-title">
                  <span>{agendaActivities.includes(heroActivity) ? "Próxima actividad publicada" : "Actividad publicada"}</span>
                  <h2>{heroActivity.title}</h2>
                </div>
                <div className="event-rail-fact"><span>Cuándo</span><strong>{formatActivityDate(heroActivity)}</strong></div>
                <div className="event-rail-fact"><span>Dónde</span><strong>{heroActivity.venue} · {heroActivity.municipality}</strong></div>
                {heroActivity.registrationUrl && (
                  <a href={heroActivity.registrationUrl} target="_blank" rel="noreferrer">Inscripción ↗</a>
                )}
              </article>
            ) : (
              <div className="hero-event-empty">
                <span className="empty-pulse" aria-hidden="true" />
                <div>
                  <p>Agenda provincial</p>
                  <h2>{emptyMessage}</h2>
                </div>
                <button type="button" onClick={onOpenProposal}>Proponer una actividad <span aria-hidden="true">→</span></button>
              </div>
            )}
          </div>
        </section>

        <section className="agenda-section signal-section" id="agenda">
          <div className="site-shell">
            <SectionTitle
              index="01"
              label="Agenda provincial"
              title="Lo próximo sucede aquí."
              summary="La información publicada procede de actividades aprobadas por la Dirección Provincial."
            />
            <div className="agenda-toolbar">
              <p className="refresh-notice" aria-live="polite">{refreshNotice || "Actualización automática activa"}</p>
              <button type="button" onClick={onOpenProposal}>+ Enviar actividad</button>
            </div>

            {primaryAgenda ? (
              <div className="agenda-board" data-reveal="up">
                <article className={`agenda-feature${primaryAgenda.imageUrl ? " has-photo" : ""}`}>
                  <div className="agenda-feature-media">
                    {primaryAgenda.imageUrl ? (
                      <img src={primaryAgenda.imageUrl} alt={`Cobertura de ${primaryAgenda.title}`} loading="lazy" decoding="async" onError={showImageFallback} />
                    ) : (
                      <span aria-hidden="true">{dateParts(primaryAgenda).day}</span>
                    )}
                    <div className="agenda-feature-date">
                      <span>{dateParts(primaryAgenda).month}</span>
                      <strong>{dateParts(primaryAgenda).day}</strong>
                    </div>
                  </div>
                  <div className="agenda-feature-copy">
                    <div className="activity-meta">
                      <span>{primaryAgenda.sport}</span><span>{formatStatus(primaryAgenda)}</span>
                    </div>
                    <h3>{primaryAgenda.title}</h3>
                    <p>{primaryAgenda.summary}</p>
                    <div className="agenda-feature-facts">
                      <div><span>Fecha</span><strong>{formatActivityDate(primaryAgenda)}</strong></div>
                      {formatActivityTime(primaryAgenda) && <div><span>Horario</span><strong>{formatActivityTime(primaryAgenda)}</strong></div>}
                      <div><span>Lugar</span><strong>{primaryAgenda.venue}, {primaryAgenda.municipality}</strong></div>
                    </div>
                    {primaryAgenda.registrationUrl && (
                      <a href={primaryAgenda.registrationUrl} target="_blank" rel="noreferrer">Abrir inscripción <span aria-hidden="true">↗</span></a>
                    )}
                  </div>
                </article>

                {secondaryAgenda.length > 0 && (
                  <div className="agenda-queue">
                    {secondaryAgenda.map((activity, index) => (
                      <article
                        key={activity.id}
                        data-reveal="row"
                        style={{ "--reveal-index": index } as CSSProperties}
                      >
                        <span className="agenda-index">{String(index + 2).padStart(2, "0")}</span>
                        <time dateTime={unixDate(activity.startAt)?.toISOString()}>{formatActivityDate(activity)}</time>
                        <div
                          style={activity.imageUrl
                            ? {
                                "--agenda-image": `url(${JSON.stringify(activity.imageUrl)})`,
                                "--agenda-thumbnail-display": "block",
                                "--agenda-thumbnail-offset": "96px",
                              } as CSSProperties
                            : undefined}
                        >
                          <span>{activity.sport} · {activity.municipality}</span>
                          <h3>{activity.title}</h3>
                        </div>
                        <strong>{activity.venue}</strong><i aria-hidden="true">↗</i>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="agenda-empty-panel" data-reveal="up">
                <div className="agenda-zero"><span>AGENDA</span><strong>00</strong></div>
                <div className="agenda-empty-copy">
                  <p className="signal-label">Agenda abierta a la comunidad</p>
                  <h3>No hay próximas actividades publicadas.</h3>
                  <p>{emptyMessage} Aquí solo se publican eventos verificados por la Dirección Provincial.</p>
                  <button type="button" onClick={onOpenProposal}>Enviar una propuesta <span aria-hidden="true">→</span></button>
                </div>
                <ol className="editorial-flow">
                  {editorialFlow.map((step, index) => (
                    <li key={step.number} style={{ "--reveal-index": index } as CSSProperties}>
                      <span>{step.number}</span><div><strong>{step.title}</strong><p>{step.text}</p></div><i aria-hidden="true">→</i>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>

        <section className="coverage-section signal-section" id="cobertura">
          <div className="site-shell">
            <SectionTitle
              index="02"
              inverse
              label="Centro de cobertura"
              title="Más que un calendario."
              summary="Un espacio público para documentar y amplificar lo que el deporte mueve en San Juan."
            />

            {recentActivities.length > 0 ? (
              <div className="coverage-editorial" data-reveal="up">
                <article className="coverage-lead">
                  {recentActivities[0].imageUrl ? (
                    <img src={recentActivities[0].imageUrl} alt={`Cobertura de ${recentActivities[0].title}`} loading="lazy" decoding="async" onError={showImageFallback} />
                  ) : (
                    <div className="coverage-lead-field" aria-hidden="true"><span>SJ</span></div>
                  )}
                  <div className="coverage-lead-shade" />
                  <div className="coverage-lead-copy">
                    <p>{recentActivities[0].sport} · {recentActivities[0].municipality}</p>
                    <h3>{recentActivities[0].title}</h3>
                    <span>{formatActivityDate(recentActivities[0])}</span>
                  </div>
                </article>
                <div className="coverage-rail">
                  {recentActivities.slice(1).map((activity, index) => (
                    <article key={activity.id}>
                      <span>0{index + 2}</span>
                      <p>{activity.sport} · {formatActivityDate(activity)}</p>
                      <h3>{activity.title}</h3>
                      <div>
                        {activity.videoUrl && <a href={activity.videoUrl} target="_blank" rel="noreferrer">Video ↗</a>}
                        {activity.imageUrl && <a href={activity.imageUrl} target="_blank" rel="noreferrer">Imagen ↗</a>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="coverage-empty" data-reveal="up">
                <div className="coverage-empty-word" aria-hidden="true">SEÑAL</div>
                <div>
                  <p className="signal-label">Primera cobertura pendiente</p>
                  <h3>El espacio está listo para la primera historia deportiva aprobada.</h3>
                  <p>Las actividades finalizadas aparecerán aquí con sus imágenes, videos y enlaces disponibles.</p>
                </div>
              </div>
            )}

          </div>
        </section>

        <section className="discipline-section signal-section" id="disciplinas">
          <div className="site-shell">
            <SectionTitle
              index="03"
              inverse
              label="Índice en movimiento"
              title="Cada disciplina tiene su lugar."
              summary="El índice se construye únicamente con los deportes presentes en actividades publicadas."
            />

            {disciplines.length > 0 ? (
              <ol className="discipline-index" data-reveal="up">
                {disciplines.map((discipline, index) => (
                  <li key={discipline} style={{ "--reveal-index": index } as CSSProperties}>
                    <span>{String(index + 1).padStart(2, "0")}</span><strong>{discipline}</strong><i aria-hidden="true">↗</i>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="discipline-open" data-reveal="up">
                <span className="discipline-word" aria-hidden="true">TODAS</span>
                <div><p className="signal-label">Cobertura abierta</p><h3>Todas las disciplinas pueden entrar en la pista.</h3><p>El índice se activará con la primera actividad deportiva aprobada.</p></div>
                <button type="button" onClick={onOpenProposal}>Proponer actividad <span aria-hidden="true">↗</span></button>
              </div>
            )}
          </div>
        </section>

        <section className="social-section signal-section" id="redes">
          <div className="site-shell social-layout">
            <div className="social-intro" data-reveal="up">
              <p className="signal-label"><span className="label-index">04</span>La conversación continúa</p>
              <h2 data-reveal="clip">Una identidad. Toda la provincia.</h2>
              <p>Convocatorias, resultados, fotos y videos del deporte sanjuanero bajo un mismo nombre en todas las redes.</p>
            </div>

            <div className="social-signal" data-reveal="up">
              <article className="social-channel social-facebook">
                <span className="social-code" aria-hidden="true">FB</span>
                <div><p>Facebook</p><h3>MIDEREC San Juan</h3><strong>{suggestedHandle}</strong></div>
                <i aria-hidden="true">01</i>
              </article>
              <article className="social-channel social-instagram">
                <span className="social-code" aria-hidden="true">IG</span>
                <div><p>Instagram</p><h3>{suggestedHandle}</h3><strong>Fotos · Historias · Reels</strong></div>
                <i aria-hidden="true">02</i>
              </article>
              <div className="national-socials">
                <span>Cuentas nacionales oficiales MIDEREC</span>
                <a href="https://www.facebook.com/MiderecRD" target="_blank" rel="noreferrer">Facebook @MiderecRD ↗</a>
                <a href="https://www.instagram.com/MiderecRD/" target="_blank" rel="noreferrer">Instagram @MiderecRD ↗</a>
              </div>
            </div>
          </div>
        </section>

        <MottoMarquee />

        <section className="contact-section" id="contacto">
          <TrackRunner />
          <div className="site-shell contact-layout" data-reveal="up">
            <div className="contact-callout">
              <p className="signal-label"><span className="label-index">05</span>La pista está abierta</p>
              <h2>Tu club. Tu atleta. Tu comunidad.</h2>
              <p>Comparte una actividad para revisión y publicación por la Dirección Provincial.</p>
              <button type="button" onClick={onOpenProposal}>Proponer actividad <span aria-hidden="true">↗</span></button>
            </div>
            <address className="verified-contact">
              <p>Datos del directorio oficial de MIDEREC</p>
              <div><span>Dirección Provincial</span><strong>Luis Daniel del Cristo Santiago</strong></div>
              <a href="tel:+18092847909"><span>Teléfono</span><strong>809-284-7909</strong></a>
              <a href="https://wa.me/18092847909" target="_blank" rel="noreferrer"><span>WhatsApp</span><strong>Escribir al despacho ↗</strong></a>
              <a href="mailto:luisdelcristosantiago@gmail.com"><span>Correo</span><strong>luisdelcristosantiago@gmail.com</strong></a>
              <a href="https://miderec.gob.do/directores-provinciales/" target="_blank" rel="noreferrer"><span>Fuente oficial</span><strong>Directorio MIDEREC ↗</strong></a>
            </address>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-shell footer-main">
          <div className="footer-brand">
            <img src="/miderec-logo.svg" alt="MIDEREC" loading="lazy" decoding="async" />
            <p>
              Dirección Provincial San Juan<br />Ministerio de Deportes y Recreación
              <em>El Granero del Sur también juega.</em>
            </p>
          </div>
          <nav aria-label="Navegación del pie"><a href="#agenda">Agenda</a><a href="#cobertura">Cobertura</a><a href="#redes">Redes</a><a href="#contacto">Contacto</a></nav>
          <div className="footer-motto">
            <span className="footer-runner" aria-hidden="true">
              <span className="footer-runner-scale"><RunnerFigure /></span>
            </span>
            <strong><small>Lema editorial</small>#SanJuanSeMueve</strong>
          </div>
        </div>
        <div className="site-shell footer-bottom">
          <span>© {new Date().getFullYear()} Dirección Provincial San Juan MIDEREC</span>
          <span>República Dominicana</span>
          <a className="to-top" href="#inicio">Volver arriba <span aria-hidden="true">↑</span></a>
        </div>
      </footer>
    </div>
  );
}
