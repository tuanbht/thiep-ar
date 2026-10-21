/* Counting what visitors do (POST /api/events), from the browser. Best effort by design: a lost event must never
   get in the way of writing, paying or opening a card, so failures are dropped on purpose. */
import type { EventRequest } from "@/lib/api/dto";

const KEY = "gc_session";

/** One id per browser tab session, so a visit's events can be told apart without knowing who it is. */
export function sessionId(): string {
  try {
    const have = sessionStorage.getItem(KEY);
    if (have) return have;
    const id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    return "no-storage";
  }
}

export function track(event: Omit<EventRequest, "sessionId">): void {
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...event, sessionId: sessionId() }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* no fetch (an old browser): nothing to count with */
  }
}
