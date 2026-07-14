export type SessionExpiredHandler = (message: string) => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler;
}

export function notifySessionExpired(message: string) {
  sessionExpiredHandler?.(message);
}
