import "server-only";

import { MongoClient, type Db } from "mongodb";
import mongoose, { type Connection } from "mongoose";

/**
 * Single source of truth for the MongoDB connection.
 *
 * Two handles are exposed over the *same* URI:
 *  - `connectMongoose()` powers every Mongoose model (all NIKKAHFY domain data).
 *  - `rawDb` / `connectRawClient()` powers Better Auth, whose MongoDB adapter is
 *    built on the raw driver and requires a `Db` handle at configuration time
 *    (a `Db` can be obtained without a live connection, so this stays sync).
 *
 * Next.js dev reloads modules constantly, so both connections are cached on
 * `globalThis` to avoid exhausting MongoDB's connection limit.
 */

const POOL_SIZE = 10;

type MongooseCache = {
  connection: Connection | null;
  promise: Promise<Connection> | null;
};

type RawClientCache = {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  __nikkahfyMongoose?: MongooseCache;
  __nikkahfyRawClient?: RawClientCache;
};

const mongooseCache: MongooseCache = (globalForMongoose.__nikkahfyMongoose ??= {
  connection: null,
  promise: null,
});

const rawClientCache: RawClientCache = (globalForMongoose.__nikkahfyRawClient ??= {
  client: null,
  promise: null,
});

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and fill in your MongoDB connection string.",
    );
  }

  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error(
      "MONGODB_URI is malformed — it must start with mongodb:// or mongodb+srv://.",
    );
  }

  return uri;
}

function getDatabaseName(uri: string): string | undefined {
  const withoutQuery = uri.split("?")[0];
  const afterScheme = withoutQuery.replace(/^mongodb(\+srv)?:\/\//, "");
  const segments = afterScheme.split("/");

  // mongodb://host:port/<database> — a leading "/" only (empty db) is absent.
  return segments.length > 1 && segments[1] ? decodeURIComponent(segments[1]) : undefined;
}

/**
 * Lazily connects Mongoose and resolves the live connection.
 * Safe to call on every request — the underlying promise is reused.
 */
export async function connectMongoose(): Promise<Connection> {
  if (mongooseCache.connection) {
    return mongooseCache.connection;
  }

  mongooseCache.promise ??= mongoose
    .connect(getMongoUri(), {
      bufferCommands: false,
      maxPoolSize: POOL_SIZE,
      serverSelectionTimeoutMS: 10_000,
    })
    .then((m) => m.connection)
    .catch((error) => {
      // Allow a later retry to start from scratch instead of reusing a rejection.
      mongooseCache.promise = null;
      throw error;
    });

  mongooseCache.connection = await mongooseCache.promise;

  return mongooseCache.connection;
}

/**
 * Resolves with Mongoose, connecting first if needed.
 * Use this before touching any Mongoose model.
 */
export async function getMongoose(): Promise<typeof mongoose> {
  await connectMongoose();
  return mongoose;
}

export async function disconnectMongoose(): Promise<void> {
  mongooseCache.promise = null;

  if (mongooseCache.connection) {
    await mongooseCache.connection.close();
    mongooseCache.connection = null;
  }
}

let rawDb: Db | null = null;

/**
 * The raw driver `Db` handle for Better Auth.
 *
 * `MongoClient#db()` performs no I/O, so this is safe to call at module scope.
 * Commands issued through it buffer until `connectRawClient()` has connected.
 */
export function getRawDb(): Db {
  rawDb ??= new MongoClient(getMongoUri(), { maxPoolSize: POOL_SIZE }).db(
    getDatabaseName(getMongoUri()),
  );

  return rawDb;
}

export async function connectRawClient(): Promise<Db> {
  const db = getRawDb();

  if (rawClientCache.client) {
    return db;
  }

  rawClientCache.promise ??= (db.client as MongoClient)
    .connect()
    .then((client) => client)
    .catch((error) => {
      rawClientCache.promise = null;
      throw error;
    });

  rawClientCache.client = await rawClientCache.promise;

  return db;
}

export async function disconnectRawClient(): Promise<void> {
  rawClientCache.promise = null;

  if (rawClientCache.client) {
    await rawClientCache.client.close();
    rawClientCache.client = null;
  }

  rawDb = null;
}
