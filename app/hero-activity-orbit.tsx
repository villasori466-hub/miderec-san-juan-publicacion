"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import type { PublicActivity } from "../lib/activity-types";
import type { BasketballRotation } from "./basketball-scene";

const LazyBasketballScene = dynamic(() => import("./basketball-scene"), {
  ssr: false,
});
const TIME_ZONE = "America/Santo_Domingo";

type HeroActivityOrbitProps = {
  activities: PublicActivity[];
  onOpenActivity(activity: PublicActivity): void;
};

type ModelErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type ModelErrorBoundaryState = {
  failed: boolean;
};

class ModelErrorBoundary extends Component<
  ModelErrorBoundaryProps,
  ModelErrorBoundaryState
> {
  state: ModelErrorBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // The accessible fallback below keeps the hero usable if WebGL or the GLB fails.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function formatOrbitDate(activity: PublicActivity) {
  if (activity.dateStatus === "tbd" || typeof activity.startAt !== "number") {
    return "Fecha por confirmar";
  }
  return new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(activity.startAt * 1000));
}

function formatOrbitTime(activity: PublicActivity) {
  if (activity.dateStatus === "tbd" || typeof activity.startAt !== "number") {
    return "Hora por confirmar";
  }
  return new Intl.DateTimeFormat("es-DO", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(activity.startAt * 1000));
}

function WebGLFallback({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <div className="basketball-fallback" role="status">
      <img src="/gallery-basketball.jpg" alt="" />
      <span>
        <strong>{unavailable ? "Vista 3D no disponible" : "Preparando esfera 3D"}</strong>
        <small>Las actividades siguen disponibles alrededor de la experiencia.</small>
      </span>
    </div>
  );
}

function OrbitActivityImage({
  activity,
  detailed = false,
}: {
  activity: PublicActivity;
  detailed?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (activity.imageUrl && !failed) {
    return (
      <img
        src={activity.imageUrl}
        alt={detailed ? `Imagen de ${activity.title}` : ""}
        loading={detailed ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={detailed ? "orbit-detail-image-fallback" : "orbit-image-fallback"}
      aria-hidden="true"
    >
      {activity.sport.slice(0, 2).toLocaleUpperCase("es")}
    </span>
  );
}

export default function HeroActivityOrbit({
  activities,
  onOpenActivity,
}: HeroActivityOrbitProps) {
  const orbitActivities = useMemo(() => activities.slice(0, 5), [activities]);
  const rootRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const rotationRef = useRef<BasketballRotation>({ x: -0.12, y: -0.28 });
  const interactingRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    horizontal: boolean;
  } | null>(null);
  const orbitRef = useRef({ angle: 1.18, lastTime: 0 });
  const orbitPausedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<PublicActivity | null>(null);
  const [webglState, setWebglState] = useState<"checking" | "ready" | "unavailable">(
    "checking",
  );
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    motion.addEventListener("change", updateMotion);

    let idleId = 0;
    let timeoutId = 0;
    try {
      const testCanvas = document.createElement("canvas");
      const supported = Boolean(
        testCanvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
          testCanvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }),
      );
      if (!supported) {
        timeoutId = window.setTimeout(() => setWebglState("unavailable"), 0);
      } else if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => setWebglState("ready"), {
          timeout: 900,
        });
      } else {
        timeoutId = window.setTimeout(() => setWebglState("ready"), 180);
      }
    } catch {
      timeoutId = window.setTimeout(() => setWebglState("unavailable"), 0);
    }

    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (idleId && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    const renderOrbit = (time: number) => {
      const root = rootRef.current;
      const count = orbitActivities.length;
      if (!root || !count) {
        frame = window.requestAnimationFrame(renderOrbit);
        return;
      }

      const elapsed = orbitRef.current.lastTime
        ? Math.min(time - orbitRef.current.lastTime, 64)
        : 0;
      orbitRef.current.lastTime = time;
      if (!selected && !orbitPausedRef.current && pageVisible && !reducedMotion) {
        orbitRef.current.angle += elapsed * 0.000045;
      }

      const mobile = root.clientWidth < 560;
      const visibleCount = mobile ? Math.min(3, count) : count;
      const radiusX = Math.min(root.clientWidth * (mobile ? 0.34 : 0.42), 260);
      const radiusY = mobile ? 126 : 168;

      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        if (index >= visibleCount) {
          card.style.display = "none";
          return;
        }
        card.style.display = "";
        const phase = orbitRef.current.angle + (Math.PI * 2 * index) / visibleCount;
        const depth = Math.sin(phase);
        const x = Math.cos(phase) * radiusX;
        const y = Math.sin(phase) * radiusY;
        const scale = 0.82 + ((depth + 1) / 2) * 0.24;
        const opacity = 0.48 + ((depth + 1) / 2) * 0.52;
        card.style.setProperty("--orbit-x", `${x.toFixed(2)}px`);
        card.style.setProperty("--orbit-y", `${y.toFixed(2)}px`);
        card.style.setProperty("--orbit-scale", scale.toFixed(3));
        card.style.setProperty("--orbit-opacity", opacity.toFixed(3));
        card.style.setProperty("--orbit-blur", depth < -0.35 ? "0.55px" : "0px");
        card.style.zIndex = selected?.id === orbitActivities[index]?.id
          ? "14"
          : depth > 0
            ? "10"
            : "3";
      });

      frame = window.requestAnimationFrame(renderOrbit);
    };

    frame = window.requestAnimationFrame(renderOrbit);
    return () => window.cancelAnimationFrame(frame);
  }, [orbitActivities, pageVisible, reducedMotion, selected]);

  const closeDetail = useCallback((restoreFocus = true) => {
    setSelected(null);
    if (restoreFocus) {
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    window.setTimeout(() => closeRef.current?.focus(), 0);

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDetail();
        return;
      }
      if (event.key !== "Tab" || !detailRef.current) return;
      const focusable = Array.from(
        detailRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
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
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDetail, selected]);

  function selectActivity(
    activity: PublicActivity,
    trigger: HTMLButtonElement,
  ) {
    triggerRef.current = trigger;
    setSelected(activity);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      baseX: rotationRef.current.x,
      baseY: rotationRef.current.y,
      horizontal: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (!drag.horizontal && Math.abs(deltaX) > 7 && Math.abs(deltaX) > Math.abs(deltaY)) {
      drag.horizontal = true;
      interactingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!drag.horizontal) return;
    if (event.cancelable) event.preventDefault();
    rotationRef.current.y = drag.baseY + deltaX * 0.012;
    rotationRef.current.x = Math.max(
      -0.38,
      Math.min(0.28, drag.baseX - deltaY * 0.004),
    );
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    window.setTimeout(() => {
      interactingRef.current = false;
    }, 650);
  }

  function handleSphereKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const horizontal = event.shiftKey ? 0.3 : 0.14;
    const vertical = event.shiftKey ? 0.12 : 0.07;
    if (event.key === "ArrowLeft") rotationRef.current.y -= horizontal;
    if (event.key === "ArrowRight") rotationRef.current.y += horizontal;
    if (event.key === "ArrowUp") {
      rotationRef.current.x = Math.max(-0.38, rotationRef.current.x - vertical);
    }
    if (event.key === "ArrowDown") {
      rotationRef.current.x = Math.min(0.28, rotationRef.current.x + vertical);
    }
  }

  const modelFallback = <WebGLFallback unavailable={webglState === "unavailable"} />;

  return (
    <section
      className={`hero-orbit${selected ? " has-selection" : ""}`}
      ref={rootRef}
      aria-label="Pelota 3D y actividades deportivas recientes"
    >
      <div className="orbit-stage">
        <span className="orbit-title" aria-hidden="true">Actividad en movimiento</span>
        <span className="orbit-line orbit-line-a" aria-hidden="true" />
        <span className="orbit-line orbit-line-b" aria-hidden="true" />
        <span className="orbit-dot orbit-dot-a" aria-hidden="true" />
        <span className="orbit-dot orbit-dot-b" aria-hidden="true" />

        <div className="basketball-canvas-frame">
          {webglState === "ready" ? (
            <ModelErrorBoundary fallback={modelFallback}>
              <LazyBasketballScene
                interacting={interactingRef}
                reducedMotion={reducedMotion}
                rotation={rotationRef}
                visible={pageVisible}
              />
            </ModelErrorBoundary>
          ) : modelFallback}
        </div>

        <div
          className="basketball-interaction"
          tabIndex={0}
          aria-label="Pelota de baloncesto 3D. Arrastra horizontalmente o usa las flechas para girarla."
          onKeyDown={handleSphereKeyDown}
          onPointerCancel={finishPointer}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
        />

        {orbitActivities.length ? (
          <ol className="orbit-activities" aria-label="Actividades recientes en órbita">
            {orbitActivities.map((activity, index) => (
              <li
                className={`orbit-activity${index === 0 ? " is-primary" : ""}${
                  selected?.id === activity.id ? " is-selected" : ""
                }`}
                key={activity.id}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
              >
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`Expandir actividad ${index + 1}: ${activity.title}`}
                  onBlur={() => {
                    orbitPausedRef.current = false;
                  }}
                  onClick={(event) => selectActivity(activity, event.currentTarget)}
                  onFocus={() => {
                    orbitPausedRef.current = true;
                  }}
                  onPointerEnter={() => {
                    orbitPausedRef.current = true;
                  }}
                  onPointerLeave={() => {
                    orbitPausedRef.current = false;
                  }}
                >
                  <span className="orbit-number">{String(index + 1).padStart(2, "0")}</span>
                  <OrbitActivityImage activity={activity} />
                  <span className="orbit-card-copy">
                    <strong>{activity.title}</strong>
                    <small>{activity.municipality || activity.sport}</small>
                  </span>
                  <span className="orbit-open" aria-hidden="true">↗</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="orbit-empty" role="status">
            Las próximas publicaciones aparecerán alrededor de la esfera.
          </p>
        )}

        {selected && (
          <div
            className="orbit-detail-backdrop"
            role="presentation"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) closeDetail();
            }}
          >
            <div
              className="orbit-detail"
              ref={detailRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="orbit-detail-title"
            >
              <button
                className="orbit-detail-close"
                ref={closeRef}
                type="button"
                aria-label="Cerrar actividad ampliada"
                onClick={() => closeDetail()}
              >
                ×
              </button>
              <div className="orbit-detail-media">
                <OrbitActivityImage activity={selected} detailed />
                <span className="orbit-detail-index">
                  {String(orbitActivities.findIndex((item) => item.id === selected.id) + 1).padStart(
                    2,
                    "0",
                  )}
                </span>
              </div>
              <div className="orbit-detail-copy">
                <p>{selected.sport}</p>
                <h2 id="orbit-detail-title">{selected.title}</h2>
                <dl>
                  <div><dt>Localidad</dt><dd>{selected.municipality}</dd></div>
                  <div><dt>Fecha</dt><dd>{formatOrbitDate(selected)}</dd></div>
                  <div><dt>Hora</dt><dd>{formatOrbitTime(selected)}</dd></div>
                </dl>
                <p className="orbit-detail-summary">{selected.summary}</p>
                <button
                  className="orbit-detail-action"
                  type="button"
                  onClick={() => {
                    closeDetail(false);
                    onOpenActivity(selected);
                  }}
                >
                  Ver actividad completa <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="orbit-instructions">
        <span><i aria-hidden="true" />Gira la esfera</span>
        <span><i aria-hidden="true" />Toca una actividad para expandir</span>
      </div>
    </section>
  );
}
