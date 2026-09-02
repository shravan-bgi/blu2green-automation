import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/** This function returns the repository root by walking up to the nearest package.json. */
// Anchored rather than a literal `../.env`, which breaks silently if this file
// changes depth. Bounded by package.json so the walk cannot leave the repo.
function repositoryRoot(from: string): string {
  let directory = from;

  for (;;) {
    if (fs.existsSync(path.join(directory, 'package.json'))) return directory;

    const parent = path.dirname(directory);
    if (parent === directory) return from;

    directory = parent;
  }
}

// Playwright loads .env only after evaluating the config, and the config imports
// this module — so dotenv has to run here.
dotenv.config({ path: path.join(repositoryRoot(__dirname), '.env') });

/** This function reads a required environment variable and throws when it is missing. */
function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }

  return value;
}

/** This function reads an optional environment variable, falling back to a default. */
function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

/**
 * The single source of configuration. Read settings from here, never from
 * `process.env` in a spec or page object.
 */
export const environment = {
  baseURL: required('DEMO_BASE_URL'),

  // No accounts here — fixture-account values are test data and live in
  // data/auth.json. Only per-environment settings belong in this file.

  /** Where the one signed-in session per run is saved for every project to reuse. */
  // Gitignored — the file holds a live session. Relative to the repository root,
  // because playwright.config.ts resolves it from there.
  storageState: '.auth/user.json',

  /** The registration schema name, for reporting. Empty when unconfigured. */
  databaseSchema: optional('DEMO_DB_NAME', ''),
} as const;

/** This function returns the parallel slot the current worker process occupies. */
// Playwright sets TEST_PARALLEL_INDEX per worker. Factories need it: each worker
// is its own process with its own module state, so a run stamp and an in-process
// counter are unique within one worker but not across four.
export function workerSlot(): string {
  return optional('TEST_PARALLEL_INDEX', '0');
}

/**
 * This function returns the database connection settings, and throws if any is
 * missing.
 */
// Resolved when called, not at module load. Most tests never open a pool, and
// requiring credentials up front stops the whole suite — including the specs
// that touch no database — before Playwright can even read its config.
export function databaseConfig() {
  return {
    host: required('DEMO_DB_HOST'),
    port: Number(optional('DEMO_DB_PORT', '3306')),
    user: required('DEMO_DB_USER'),
    password: required('DEMO_DB_PASSWORD'),
    /** Registration schema — companies, accounts, verification records. */
    schema: required('DEMO_DB_NAME'),
    /** Reference-data schema, needed to resolve classification names. */
    masterSchema: optional('DEMO_DB_MASTER_NAME', 'bgi_b2g_master_dev'),
  };
}
