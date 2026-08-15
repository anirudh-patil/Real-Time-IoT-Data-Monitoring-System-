export type Role = "admin" | "engineer" | "viewer";

export interface User {
  userId: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  profileImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface Device {
  deviceId: string;
  name: string;
  ownerId: string;
  firmwareVersion: string;
  lastSeenAt: string | null;
  online: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reading {
  deviceId: string;
  timestamp: string;
  voltage: number;
  current: number;
  temperature: number;
  power: number;
}

export type AlertType =
  | "HIGH_VOLTAGE"
  | "LOW_VOLTAGE"
  | "HIGH_CURRENT"
  | "HIGH_TEMPERATURE"
  | "DEVICE_OFFLINE"
  | "COMMUNICATION_TIMEOUT";
export type AlertSeverity = "warning" | "critical";
export type AlertStatus = "active" | "resolved";

export interface Alert {
  alertId: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface Envelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
  timestamp: string;
  requestId: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}