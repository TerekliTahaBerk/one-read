import { NextResponse } from "next/server";

export type MobileErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "SUBSCRIPTION_REQUIRED"
  | "ACCOUNT_INCOMPLETE"
  | "RATE_LIMITED"
  | "TEMPORARILY_UNAVAILABLE";

export function mobileData<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data, meta: { apiVersion: 1 } }, init);
}

export function mobileError(code: MobileErrorCode, status: number, message: string) {
  return NextResponse.json(
    { ok: false, error: { code, message }, meta: { apiVersion: 1 } },
    { status },
  );
}
