import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const sourceBackend = path.resolve(repoRoot, "backend");
const bundledBackend = path.resolve(frontendRoot, "src-tauri", "resources", "php-server");

const SOURCE_PATHS = [
  "app",
  "bootstrap",
  "config",
  "database",
  "public",
  "resources",
  "routes",
  "artisan",
  "composer.json",
  "composer.lock",
];

const REMOVE_IF_EXISTS = [
  "app",
  "bootstrap",
  "config",
  "database",
  "public",
  "resources",
  "routes",
  "artisan",
  "composer.json",
  "composer.lock",
];

const filterCopy = (src) => {
  const normalized = src.replace(/\\/g, "/");

  if (normalized.includes("/storage/logs")) return false;
  if (normalized.includes("/storage/framework/cache")) return false;
  if (normalized.includes("/storage/framework/sessions")) return false;
  if (normalized.includes("/storage/framework/views")) return false;
  if (normalized.includes("/storage/tmp")) return false;
  if (normalized.endsWith("/database/database.sqlite")) return false;
  if (normalized.endsWith("/public/storage")) return false;

  return true;
};

const ensurePathExists = (targetPath, name) => {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${name} not found: ${targetPath}`);
  }
};

const copyEntry = (entry) => {
  const source = path.resolve(sourceBackend, entry);
  const destination = path.resolve(bundledBackend, entry);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing backend entry: ${entry}`);
  }

  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    filter: filterCopy,
  });
};

const cleanBundledEntries = () => {
  for (const entry of REMOVE_IF_EXISTS) {
    const target = path.resolve(bundledBackend, entry);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
};

const run = () => {
  ensurePathExists(sourceBackend, "Backend directory");
  ensurePathExists(bundledBackend, "Bundled backend directory");

  cleanBundledEntries();
  SOURCE_PATHS.forEach(copyEntry);

  // Tauri build checks this path; keep it present in bundled backend.
  fs.mkdirSync(path.resolve(bundledBackend, "public"), { recursive: true });
  const publicStoragePath = path.resolve(bundledBackend, "public", "storage");
  if (fs.existsSync(publicStoragePath)) {
    const stats = fs.lstatSync(publicStoragePath);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(publicStoragePath);
    } else {
      fs.rmSync(publicStoragePath, { recursive: true, force: true });
    }
  }
  fs.mkdirSync(publicStoragePath, { recursive: true });

  const bundledEnv = path.resolve(bundledBackend, ".env");
  if (!fs.existsSync(bundledEnv)) {
    throw new Error("Bundled .env missing. Keep frontend/src-tauri/resources/php-server/.env in repository.");
  }

  console.log("Bundled backend synced successfully.");
};

run();
