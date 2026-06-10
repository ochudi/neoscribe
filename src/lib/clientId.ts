const STORAGE_KEY = "neoscribe-client-id";

/**
 * A stable anonymous id for this browser. It scopes run history and stats on
 * the server without requiring sign-in.
 */
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode etc.) — history just won't persist.
    return "";
  }
}
