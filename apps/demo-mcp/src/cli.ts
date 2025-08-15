#!/usr/bin/env bun
/**
 * Minimal CLI to import a Reddit export ZIP into a local LibSQL database.
 * Commands:
 *   - import [--file <zip>] [--db <dbPath>]
 *   - serve  [--db <dbPath>]   (stub)
 *
 * Defaults:
 *   --file defaults to ./export_rocket_scientist2_20250811.zip (cwd)
 *   --db   defaults to ./.data/reddit.db (cwd)
 *
 * DATABASE_URL (optional):
 *   If set, overrides the db URL entirely (e.g., libsql://..., file:/abs/path.db).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import type { BaseSQLiteDatabase, SQLiteTable } from 'drizzle-orm/sqlite-core';

// -------------------------------------------------------------
// Tiny args parser
// -------------------------------------------------------------
type CLIArgs = {
	_: string[]; // positional
	file?: string;
	db?: string;
	adapter?: string[]; // --adapter can be repeated
	adapters?: string; // --adapters=csv
};

function parseArgs(argv: string[]): CLIArgs {
	const out: CLIArgs = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--file') {
			out.file = argv[++i];
		} else if (a.startsWith('--file=')) {
			out.file = a.slice('--file='.length);
		} else if (a === '--db') {
			out.db = argv[++i];
		} else if (a.startsWith('--db=')) {
			out.db = a.slice('--db='.length);
		} else if (a === '--adapter') {
			if (!out.adapter) out.adapter = [];
			out.adapter.push(argv[++i]);
		} else if (a.startsWith('--adapter=')) {
			if (!out.adapter) out.adapter = [];
			out.adapter.push(a.slice('--adapter='.length));
		} else if (a.startsWith('--adapters=')) {
			out.adapters = a.slice('--adapters='.length);
		} else if (!a.startsWith('-')) {
			out._.push(a);
		}
	}
	return out;
}

// -------------------------------------------------------------
// Paths helpers
// -------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..'); // apps/demo-mcp/src -> repo root

function resolveZipPath(p?: string): string {
	const candidate = p ?? './export_rocket_scientist2_20250811.zip';
	return path.resolve(process.cwd(), candidate);
}

function resolveDbFile(p?: string): string {
	const candidate = p ?? './.data/reddit.db';
	return path.resolve(process.cwd(), candidate);
}

// Note: migrations folder is resolved per-adapter below

// -------------------------------------------------------------
// DB helpers
// -------------------------------------------------------------
async function ensureDirExists(filePath: string) {
	const dir = path.dirname(filePath);
	await fs.mkdir(dir, { recursive: true });
}

function toDbUrl(dbFileAbs: string): string {
	// If DATABASE_URL is set, just use it.
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	// Otherwise, use a libsql file URL
	// libsql supports file: scheme for local files
	return `file:${dbFileAbs}`;
}

async function pathExists(p: string) {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

type MinimalAdapter = {
	parse: (b: Blob) => Promise<unknown>;
	upsert: (
		db: BaseSQLiteDatabase<'sync' | 'async', Record<string, SQLiteTable>>,
		data: Record<string, unknown[]>,
	) => Promise<void>;
};

function isMinimalAdapter(v: unknown): v is MinimalAdapter {
	return (
		typeof v === 'object' &&
		v !== null &&
		'parse' in v &&
		typeof (v as { parse?: unknown }).parse === 'function' &&
		'upsert' in v &&
		typeof (v as { upsert?: unknown }).upsert === 'function'
	);
}

// -------------------------------------------------------------
// Import command
// -------------------------------------------------------------
async function cmdImport(args: CLIArgs) {
	const zipPath = resolveZipPath(args.file);
	const dbFile = resolveDbFile(args.db);
	const dbUrl = toDbUrl(dbFile);

	// Prepare DB and run migrations
	await ensureDirExists(dbFile);
	const client = createClient({ url: dbUrl });
	const db = drizzle(client);

	// Determine which adapters to run
	const positional = args._.slice(1); // after command
	const flagAdapters = args.adapter ?? [];
	const csvAdapters = (args.adapters ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const adapters = [...flagAdapters, ...csvAdapters, ...positional].filter(
		Boolean,
	);
	if (adapters.length === 0) adapters.push('reddit'); // default

	// Read input once (adapters may ignore if not applicable)
	const data = await fs.readFile(zipPath);
	const blob = new Blob([new Uint8Array(data)], { type: 'application/zip' });

	// Shared drizzle DB type for upsert calls
	const drizzleDb = db as unknown as BaseSQLiteDatabase<
		'sync' | 'async',
		Record<string, SQLiteTable>
	>;

	for (const key of adapters) {
		const migrationsDir = path.resolve(
			repoRoot,
			`packages/mcp-adapters/${key}/migrations`,
		);
		console.log(`\n=== Adapter: ${key} ===`);
		if (await pathExists(migrationsDir)) {
			console.log(`Running migrations from: ${migrationsDir}`);
			await migrate(db, { migrationsFolder: migrationsDir });
		} else {
			console.warn(`No migrations folder found at ${migrationsDir}; skipping.`);
		}

		console.log(`Parsing (${key}) from: ${zipPath}`);
		// Dynamically import adapter module and detect adapter export
		const modulePath =
			`../../../packages/mcp-adapters/${key}/src` as unknown as string;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const mod = (await import(modulePath)) as unknown as Record<
			string,
			unknown
		>;
		const adapter =
			mod.adapter ??
			mod[`${key}Adapter`] ??
			Object.values(mod).find(
				(v) => v && typeof v === 'object' && 'parse' in v && 'upsert' in v,
			);
		if (!adapter || !isMinimalAdapter(adapter)) {
			throw new Error(
				`Could not find adapter export in module ${modulePath}. Expected 'adapter' or '${key}Adapter'.`,
			);
		}

		// In the future, our adapter framework will perform ArkType validation here
		const parsed = (await adapter.parse(blob)) as unknown as Record<
			string,
			unknown[]
		>;

		console.log(`Upserting (${key}) into DB: ${dbUrl}`);
		await adapter.upsert(drizzleDb, parsed);

		console.log(`Import complete for '${key}':`);
		printCounts(parsed);
	}

	console.log(`\nAll adapters complete. DB path: ${dbFile}`);
}

function printCounts(parsed: Record<string, unknown[]>) {
	const entries: [string, number][] = Object.entries(parsed).map(([k, v]) => [
		k,
		Array.isArray(v) ? v.length : 0,
	]);
	const maxKey = Math.max(...entries.map(([k]) => k.length), 10);
	for (const [k, n] of entries.sort((a, b) => a[0].localeCompare(b[0]))) {
		console.log(`${k.padEnd(maxKey, ' ')} : ${n}`);
	}
}

// -------------------------------------------------------------
// Serve command (stub)
// -------------------------------------------------------------
async function cmdServe(args: CLIArgs) {
	const dbFile = resolveDbFile(args.db);
	const dbUrl = toDbUrl(dbFile);

	console.log('Serve is not implemented in this minimal demo.');
	console.log(
		'Intended behavior: start an MCP server sourced by the adapter and DB.',
	);
	console.log(`DB path: ${dbFile}`);
	console.log(`DB URL:  ${dbUrl}`);
	console.log('Exiting.');
}

// -------------------------------------------------------------
// Entrypoint
// -------------------------------------------------------------
async function main() {
	const argv = process.argv.slice(2);
	const args = parseArgs(argv);

	const command = args._[0] ?? 'import';
	switch (command) {
		case 'import':
			await cmdImport(args);
			break;
		case 'serve':
			await cmdServe(args);
			break;
		default:
			console.error(`Unknown command: ${command}`);
			console.error('Usage:');
			console.error(
				'  bun run src/cli.ts import [adapter ...] [--adapter <name>] [--adapters a,b] [--file <zip>] [--db <dbPath>]',
			);
			console.error('  bun run src/cli.ts serve  [--db <dbPath>]');
			process.exit(1);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
