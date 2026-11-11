export function cn(...classes: (string | undefined | null | false | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

// Player birth date helpers (DB column is `date_of_birth`; the UI edits only the year)
export function getBirthYear(player: { date_of_birth?: string | null } | null | undefined): number | null {
  const dob = player?.date_of_birth;
  if (!dob) return null;
  const y = parseInt(String(dob).slice(0, 4), 10);
  return Number.isFinite(y) && y > 1900 ? y : null;
}

export function getPlayerAge(player: { date_of_birth?: string | null } | null | undefined, fallback = 20): number {
  const dob = player?.date_of_birth;
  if (!dob) return fallback;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return fallback;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return Math.max(1, age);
}

// Keep the full stored date when the year was not changed; otherwise store Jan 1st of the new year
export function birthYearToDob(year: string | number | null | undefined, existingDob?: string | null): string | null {
  const y = parseInt(String(year ?? ''), 10);
  if (!Number.isFinite(y) || y < 1900) return existingDob ?? null;
  if (existingDob && String(existingDob).slice(0, 4) === String(y)) return existingDob;
  return `${y}-01-01`;
}
