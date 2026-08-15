const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ??
  "https://api.voltra.example.com/api/v1";
const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined)?.replace(/\/$/, "") ??
  "https://api.voltra.example.com";

export const env = {
  API_BASE_URL,
  SOCKET_URL,
};