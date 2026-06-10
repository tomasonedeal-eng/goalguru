export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through — randomUUID throws outside secure contexts (e.g. http://192.168.x.x)
    }
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
