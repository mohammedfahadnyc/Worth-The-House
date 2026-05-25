export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return "Enter a valid email address.";
  return null;
}

export function makeProfileHandle(email: string, userId: string) {
  const localPart = normalizeEmail(email).split("@")[0] || "scout";
  const safeLocalPart = localPart.replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-");
  return `${safeLocalPart}-${userId.slice(0, 8)}`;
}
