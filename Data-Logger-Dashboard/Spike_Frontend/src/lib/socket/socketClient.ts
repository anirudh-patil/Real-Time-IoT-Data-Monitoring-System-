// Stage 1 placeholder. The real socket.io wiring — subscribe/unsubscribe,
// telemetry:update and alert:new handlers, reconnect w/ token refresh —
// lands in Stage 4. Exposed as a singleton so status can be observed in
// the topbar today.

import { useEffect, useState } from "react";

export type SocketStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

let status: SocketStatus = "idle";
const listeners = new Set<(s: SocketStatus) => void>();

export const socketClient = {
  getStatus: () => status,
  _setStatus(next: SocketStatus) {
    status = next;
    listeners.forEach((l) => l(next));
  },
  subscribe(l: (s: SocketStatus) => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useSocketStatus(): SocketStatus {
  const [s, setS] = useState<SocketStatus>(socketClient.getStatus());
  useEffect(() => socketClient.subscribe(setS), []);
  return s;
}