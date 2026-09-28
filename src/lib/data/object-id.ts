import "server-only";

import { Types } from "mongoose";

/**
 * The session exposes ids as strings while MongoDB stores them as ObjectIds.
 * Every lookup that mixes the two must go through here.
 *
 * A strict 24-hex check rather than `Types.ObjectId.isValid`, which accepts any
 * 12-character string (it will happily reinterpret arbitrary input as raw
 * bytes) and would turn a junk URL param into a query against a random id.
 */
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export function toObjectId(value: string | null | undefined): Types.ObjectId | null {
  if (!value) return null;
  return OBJECT_ID.test(value) ? new Types.ObjectId(value) : null;
}
