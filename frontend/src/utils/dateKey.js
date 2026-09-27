// dateKey.js — a timezone-safe replacement for the
// `date.toISOString().split("T")[0]` pattern used (buggily) across the app.
//
// The problem with toISOString(): it converts to UTC first. For a real Date
// object built from local time (e.g. `new Date()` for "today"), that
// round-trip can push the date backward by a day for any positive UTC
// offset (like IST, UTC+5:30) during the early hours of the day — "today"
// gets reported as "yesterday" until ~5:30am local time.
//
// This function never round-trips through UTC:
// - Given a real Date object, it reads local Y/M/D directly.
// - Given a date-only string ("YYYY-MM-DD", already unambiguous), it's
//   returned as-is with no Date parsing at all.
export const localDateKey = (input) => {
  if (input == null) return null;

  if (typeof input === "string") {
    // Already a date (or datetime) string — just take the date portion.
    // No Date object round-trip needed, so no timezone shift risk.
    return input.slice(0, 10);
  }

  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Convenience: today's date key in local time.
export const todayKey = () => localDateKey(new Date());