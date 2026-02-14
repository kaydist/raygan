import { STORAGE_KEYS } from "../constants";

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

export function setCookie(
  name: string,
  value: string,
  options?: {
    expiresInSeconds?: number;
    path?: string;
    sameSite?: "Strict" | "Lax" | "None";
    secure?: boolean;
  }
): void {
  if (typeof document === "undefined") return;

  const {
    expiresInSeconds,
    path = "/",
    sameSite = "Strict",
    secure = true,
  } = options || {};

  let cookie = `${name}=${value}; path=${path}; SameSite=${sameSite}`;

  if (secure) {
    cookie += "; Secure";
  }

  if (expiresInSeconds) {
    const expires = new Date(Date.now() + expiresInSeconds * 1000);
    cookie += `; expires=${expires.toUTCString()}`;
  }

  document.cookie = cookie;
}

export function deleteCookie(name: string, path: string = "/"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function setAuthToken(token: string, expiresInSeconds?: number): void {
  setCookie(STORAGE_KEYS.ACCESS_TOKEN, token, { expiresInSeconds });
}

export function getAuthToken(): string | null {
  return getCookie(STORAGE_KEYS.ACCESS_TOKEN);
}

export function clearAuthToken(): void {
  deleteCookie(STORAGE_KEYS.ACCESS_TOKEN);
}
