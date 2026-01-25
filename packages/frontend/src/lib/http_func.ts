export type ApiEnvelope<T> = { code: number; msg?: string; data?: T } & Record<string, any>

export function unwrap<T>(resp: ApiEnvelope<T>): T {
  return resp as T;
}