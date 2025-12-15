export type verifyMethod = "APIKEY" | "ONLY_VERIFY" | "PASSWORD" | "TOKEN" | "PUBLIC";

export interface VerifiedContext {
    method: verifyMethod;
}