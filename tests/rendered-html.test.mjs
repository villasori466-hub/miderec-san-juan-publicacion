import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("the public site is data-driven and contains no demo events", async () => {
  const [page, publicHome, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/public-home.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /listPublicActivities/);
  assert.match(page, /listHeroActivities/);
  assert.match(page, /force-dynamic/);
  assert.match(publicHome, /San Juan/);
  assert.match(publicHome, /se mueve/);
  assert.match(publicHome, /Proponer (una )?actividad/);
  assert.match(publicHome, /Las pr.ximas actividades aparecer.n aqu./i);
  assert.match(layout, /og-v4\.jpg/);
  assert.doesNotMatch(
    `${page}\n${publicHome}`,
    /Contenido de muestra|Festival deportivo provincial/i,
  );
});

test("admin routes enforce server authorization before data access", async () => {
  const [
    adminPage,
    manualLogin,
    adminAuth,
    manualAuth,
    sessionApi,
    rateLimit,
    worker,
    activitiesApi,
    mediaApi,
  ] = await Promise.all([
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/manual-admin-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/session/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-login-rate-limit.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/activities/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(adminPage, /requireAdminPage/);
  assert.match(manualLogin, /\/api\/admin\/session/);
  assert.match(manualLogin, /Continuar con ChatGPT/);
  assert.match(adminAuth, /ADMIN_EMAILS/);
  assert.match(adminAuth, /getManualAdminUser/);
  assert.match(adminAuth, /getChatGPTUser/);
  assert.match(adminAuth, /status: 401/);
  assert.match(adminAuth, /status: 403/);
  assert.match(manualAuth, /PBKDF2/);
  assert.match(manualAuth, /HMAC/);
  assert.match(manualAuth, /MANUAL_SESSION_MAX_AGE = 60 \* 60 \* 8/);
  assert.match(manualAuth, /httpOnly|MANUAL_ADMIN_COOKIE/);
  assert.match(sessionApi, /sameOriginError/);
  assert.match(sessionApi, /sameSite: "strict"/);
  assert.match(sessionApi, /secure:/);
  assert.match(sessionApi, /priority: "high"/);
  assert.match(rateLimit, /maximumFailures: 5/);
  assert.match(rateLimit, /admin_login_attempts/);
  assert.match(worker, /X-Frame-Options/);
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /Cache-Control/);
  assert.match(
    activitiesApi,
    /export async function GET[\s\S]*?await requireAdminApi\(\)[\s\S]*?listAdminActivities\(\)/,
  );
  assert.match(
    mediaApi,
    /export async function POST[\s\S]*?await requireAdminApi\(\)[\s\S]*?request\.formData\(\)/,
  );
});

test("wires persistence, automation, submissions, media, and metadata", async () => {
  const [
    publicHome,
    schema,
    hosting,
    layout,
    packageJson,
  ] = await Promise.all([
    readFile(new URL("../app/public-home.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(publicHome, /setInterval/);
  assert.match(publicHome, /60_000/);
  assert.match(publicHome, /\/api\/submissions/);
  assert.match(publicHome, /MIDERECSanJuan/);
  assert.match(schema, /activity_submissions/);
  assert.match(schema, /editorial_status/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "MEDIA"/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /x-forwarded-host/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await Promise.all([
    access(new URL("../public/miderec-logo.svg", import.meta.url)),
    access(new URL("../public/og-v4.jpg", import.meta.url)),
    access(new URL("../drizzle/0000_slow_imperial_guard.sql", import.meta.url)),
    access(new URL("../drizzle/0001_parched_alice.sql", import.meta.url)),
    access(new URL("../app/api/admin/media/route.ts", import.meta.url)),
    access(new URL("../app/media/[...key]/route.ts", import.meta.url)),
  ]);
});

test("ships the remastered discovery, saved agenda, 3D hero, and accessible proposal flow", async () => {
  const [
    publicView,
    publicHome,
    heroOrbit,
    basketballScene,
    styles,
    packageJson,
    adminDashboard,
    adminStyles,
    login,
  ] = await Promise.all([
    readFile(new URL("../app/public-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/public-home.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/hero-activity-orbit.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/basketball-scene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/AdminDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/local-login/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(publicView, /SAVED_KEY/);
  assert.match(publicView, /downloadCalendar/);
  assert.match(publicView, /localityCounts/);
  assert.match(publicView, /activity-dialog/);
  assert.match(publicView, /IntersectionObserver/);
  assert.match(publicView, /aria-pressed=/);
  assert.match(publicView, /HeroActivityOrbit/);
  assert.match(publicView, /hero-radar/);
  assert.match(publicView, /Radar provincial/);
  assert.match(publicView, /scrollToIndex/);
  assert.match(publicView, /scrollAnimationRef/);
  assert.match(publicView, /requestAnimationFrame/);
  assert.doesNotMatch(publicView, /section-index|SportOrbit|hero-summary/);
  assert.match(styles, /\.agenda-controls/);
  assert.match(styles, /\.locality-section/);
  assert.match(styles, /\.hero-orbit/);
  assert.match(styles, /\.basketball-canvas-frame/);
  assert.match(styles, /\.orbit-activity/);
  assert.match(styles, /\.orbit-detail/);
  assert.match(styles, /\.hero-radar/);
  assert.match(styles, /@keyframes radar-scan/);
  assert.match(styles, /@keyframes index-arrival/);
  assert.match(publicHome, /latestActivities/);
  assert.match(publicHome, /initialHeroActivities/);
  assert.match(publicHome, /\.slice\(0, 3\)/);
  assert.match(heroOrbit, /activities\.slice\(0, 3\)/);
  assert.match(heroOrbit, /const depth = Math\.cos\(phase\)/);
  assert.match(heroOrbit, /dynamic\(\(\) => import\("\.\/basketball-scene"\)/);
  assert.match(heroOrbit, /ssr: false/);
  assert.match(heroOrbit, /requestIdleCallback/);
  assert.match(heroOrbit, /visibilitychange/);
  assert.match(heroOrbit, /prefers-reduced-motion/);
  assert.match(heroOrbit, /aria-modal="true"/);
  assert.match(heroOrbit, /TOCA UNA ACTIVIDAD PARA EXPANDIR/i);
  assert.match(basketballScene, /useGLTF\("\/models\/balon-san-juan\.glb"/);
  assert.match(basketballScene, /useFrame/);
  assert.match(basketballScene, /dpr=\{\[1, 1\.5\]\}/);
  assert.match(packageJson, /@react-three\/fiber/);
  assert.match(packageJson, /@react-three\/drei/);
  assert.match(packageJson, /"three"/);
  assert.doesNotMatch(styles, /\.section-index|\.sport-orbit|\.hero-summary/);
  assert.doesNotMatch(styles, /\.sphere-shell|\.sphere-photo-face/);
  assert.match(publicHome, /aria-busy=/);
  assert.match(publicHome, /Proceso de publicación/);
  assert.match(publicHome, /maxLength=\{3000\}/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(adminDashboard, /municipalityFilter/);
  assert.match(adminDashboard, /submissionFilter/);
  assert.match(adminDashboard, /Exportar CSV/);
  assert.match(adminStyles, /\.submissionFilters/);
  assert.match(adminStyles, /Remaster editorial 2026/);
  assert.match(login, /styles\.loginForm/);
  assert.doesNotMatch(login, /style=\{\{/);

  await access(new URL("../public/models/balon-san-juan.glb", import.meta.url));
});
