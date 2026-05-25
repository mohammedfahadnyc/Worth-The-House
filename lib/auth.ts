export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) return "Username is required.";
  if (/\s/.test(normalized)) return "Username cannot contain spaces.";
  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    return "Use lowercase letters, numbers, dots, dashes, or underscores.";
  }
  return null;
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@propertyscout.local`;
}
