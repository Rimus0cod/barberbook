import axios, { AxiosHeaders } from "axios";
import { demoAdapter } from "./demo-api";

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export const apiClient = axios.create({
  baseURL: isDemoMode ? undefined : import.meta.env.VITE_API_URL ?? "/api/v1",
  withCredentials: !isDemoMode,
  adapter: isDemoMode ? demoAdapter : undefined,
});

export async function prepareAdminCsrfToken() {
  await apiClient.get("/auth/csrf");
}

export async function prepareClientCsrfToken() {
  await apiClient.get("/client-auth/csrf");
}

apiClient.interceptors.request.use((config) => {
  if (!config.method || !UNSAFE_METHODS.has(config.method.toLowerCase())) {
    return config;
  }

  const token = readCookie(CSRF_COOKIE_NAME);
  if (!token) {
    return config;
  }

  const headers = AxiosHeaders.from(config.headers ?? {});
  headers.set(CSRF_HEADER_NAME, token);
  config.headers = headers;

  return config;
});

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}
