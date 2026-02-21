import type { IUserDoc } from '../models/User.js';

export function toUserResponse(user: IUserDoc): Record<string, unknown> {
  const raw = user as unknown as Record<string, unknown>;
  const obj =
    typeof raw.toObject === 'function'
      ? (raw.toObject as () => Record<string, unknown>)()
      : { ...raw };
  const { password, __v, ...rest } = obj;
  return rest;
}
