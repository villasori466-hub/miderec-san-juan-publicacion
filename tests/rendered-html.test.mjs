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
  const [adminPage, adminAuth, activitiesApi, mediaApi] = await Promise.all([
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/activities/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(adminPage, /requireAdminPage/);
  assert.match(adminAuth, /ADMIN_EMAILS/);
  assert.match(adminAuth, /requireChatGPTUser/);
  assert.match(adminAuth, /status: 401/);
  assert.match(adminAuth, /status: 403/);
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
    access(new URL("../app/api/admin/media/route.ts", import.meta.url)),
    access(new URL("../app/media/[...key]/route.ts", import.meta.url)),
  ]);
});

test("ships the remastered discovery, saved agenda, calendar, and accessible proposal flow", async () => {
  const [publicView, publicHome, styles, adminDashboard, adminStyles, login] = await Promise.all([
    readFile(new URL("../app/public-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/public-home.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
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
  assert.match(publicView, /ActivitySphere/);
  assert.match(publicView, /sphere-latest/);
  assert.match(publicView, /scrollToIndex/);
  assert.match(publicView, /scrollAnimationRef/);
  assert.match(publicView, /requestAnimationFrame/);
  assert.match(publicView, /image-preview/);
  assert.doesNotMatch(publicView, /section-index|SportOrbit|hero-summary/);
  assert.match(styles, /\.agenda-controls/);
  assert.match(styles, /\.locality-section/);
  assert.match(styles, /\.activity-sphere/);
  assert.match(styles, /\.sphere-photo-face/);
  assert.match(styles, /@keyframes sphere-float/);
  assert.match(styles, /@keyframes sphere-auto-turn/);
  assert.match(styles, /@keyframes index-arrival/);
  assert.match(publicHome, /latestActivities/);
  assert.match(publicHome, /\.slice\(0, 3\)/);
  assert.doesNotMatch(styles, /\.section-index|\.sport-orbit|\.hero-summary/);
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
});
