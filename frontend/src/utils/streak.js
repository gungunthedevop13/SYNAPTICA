// Computes current + longest streaks from an array of "YYYY-MM-DD" completion
// date strings (duplicates allowed). "Current" only counts if the most recent
// completion was today or yesterday — otherwise a stale run from days ago
// would incorrectly still show as an active streak.
export const computeStreak = (dateStrings) => {
  const uniqueSorted = [...new Set(dateStrings)].sort();
  if (uniqueSorted.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 0;
  let prev = null;

  uniqueSorted.forEach((dateStr) => {
    const date = new Date(dateStr);
    if (prev) {
      const diffDays = Math.round((date - prev) / (1000 * 60 * 60 * 24));
      run = diffDays === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = date;
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const lastDate = uniqueSorted[uniqueSorted.length - 1];
  const current = lastDate === todayStr || lastDate === yesterdayStr ? run : 0;

  return { current, longest };
};