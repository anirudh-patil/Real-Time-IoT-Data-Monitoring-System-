import { apiClient } from "./client";
import type { LoginResponse, User } from "./types";

export const authApi = {
  login: (body: { email: string; password: string }) =>
    apiClient.post<LoginResponse>("/auth/login", body, { skipAuth: true }),
  register: (body: { name: string; email: string; password: string }) =>
    apiClient.post<{ user: User }>("/auth/register", body, { skipAuth: true }),
  refresh: (body: { refreshToken: string }) =>
    apiClient.post<LoginResponse>("/auth/refresh-token", body, { skipAuth: true }),
  logout: (body: { refreshToken: string }) =>
    apiClient.post<void>("/auth/logout", body, { skipAuth: true }),
  forgotPassword: (body: { email: string }) =>
    apiClient.post<void>("/auth/forgot-password", body, { skipAuth: true }),
  resetPassword: (body: { token: string; newPassword: string }) =>
    apiClient.post<void>("/auth/reset-password", body, { skipAuth: true }),
  me: () => apiClient.get<{ user: User }>("/auth/me"),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiClient.post<void>("/auth/change-password", body),
};