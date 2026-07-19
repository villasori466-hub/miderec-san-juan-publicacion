/**
 * Aplica las migraciones SQL de `drizzle/` a la base de datos D1 local
 * que usa `npm run dev` (simulada por miniflare en `.wrangler/state`).
 *
 * Uso:  npm run db:migrate:local
 * (Ejecutar con el servidor de desarrollo detenido.)
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";

if (!existsSync(D1_DIR)) {
  console.log("✔ Creando directorio de base de datos local en " + D1_DIR);
  mkdirSync(D1_DIR, { recursive: true });
}

let sqliteFiles = readdirSync(D1_DIR).filter(
  (file) => file.endsWith(".sqlite") && file !== "metadata.sqlite",
);

if (sqliteFiles.length === 0) {
  const defaultDbFile = "00000000-0000-4000-8000-000000000000.sqlite";
  console.log("✔ Inicializando base de datos D1 local por defecto: " + defaultDbFile);
  sqliteFiles.push(defaultDbFile);
}

const migrations = readdirSync("drizzle")
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const sqliteFile of sqliteFiles) {
  const db = new DatabaseSync(join(D1_DIR, sqliteFile));
  const existing = new Set(
    db
      .prepare("select name from sqlite_master where type='table'")
      .all()
      .map((row) => row.name),
  );

  for (const migration of migrations) {
    const sql = readFileSync(join("drizzle", migration), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (error) {
        // Las tablas ya creadas en ejecuciones anteriores no son un error.
        if (!String(error).includes("already exists")) throw error;
      }
    }
    console.log(`✔ ${migration} aplicada en ${sqliteFile}`);
  }

  const tables = db
    .prepare("select name from sqlite_master where type='table'")
    .all()
    .map((row) => row.name);
  console.log("Tablas disponibles:", tables.join(", ") || "(ninguna)");
  db.close();
  void existing;
}
