import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'trips.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeStore(store) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function generateId(existing) {
  let id;
  do {
    id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  } while (existing[id]);
  return id;
}

export async function createTrip(payload) {
  const store = await readStore();
  const id = generateId(store);
  const record = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload,
  };

  store[id] = record;
  await writeStore(store);
  return record;
}

export async function getTrip(id) {
  if (!id) return null;
  const store = await readStore();
  return store[id] ?? null;
}

export async function updateTrip(id, updates) {
  if (!id) throw new Error('Trip ID is required to update.');
  if (typeof updates !== 'object' || updates === null) {
    throw new Error('Updates must be an object.');
  }

  const store = await readStore();
  const existing = store[id];
  if (!existing) {
    return null;
  }

  const record = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  store[id] = record;
  await writeStore(store);
  return record;
}

export async function listTrips() {
  const store = await readStore();
  return Object.values(store).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
