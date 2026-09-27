import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useTasks } from "../hooks/useTasks";
import { fetchFocusSessions } from "../api/focusApi";
import { computeStreak } from "../utils/streak";
import { localDateKey } from "../utils/dateKey";
import "./ProgressPage.css";

const COLORS = ["#caff4d", "#f59e0b", "#ef4444"];

/* ─── LeetCode-style Heatmap ───────────────────────────────── */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const getHeatColor = (count) => {
  if (count === 0) return "lc-0";
  if (count === 1) return "lc-1";
  if (count <= 3)  return "lc-2";
  if (count <= 6)  return "lc-3";
  return "lc-4";
};

const YearHeatmap = ({ completionMap, currentStreak, longestStreak }) => {
  const [tooltip, setTooltip] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - today.getDay() - 52 * 7);

  const weeks = [];
  const monthLabels = [];
  let currentMonth = -1;
  let lastLabelCol = -6;

  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + w * 7 + d);
      const key = localDateKey(date);
      const count = completionMap[key] || 0;
      const isFuture = date > today;

      if (d === 0 && date.getMonth() !== currentMonth) {
        currentMonth = date.getMonth();
        if (w - lastLabelCol >= 4) {
          monthLabels.push({ col: w, label: MONTHS[currentMonth] });
          lastLabelCol = w;
        }
      }

      week.push({ date, key, count, isFuture });
    }
    weeks.push(week);
  }

  const totalCompleted = Object.values(completionMap).reduce((a, b) => a + b, 0);

  return (
    <div className="lc-heatmap-wrap">
      <div className="lc-stats-row">
        <div className="lc-stat-box">
          <span className="lc-stat-num">{totalCompleted}</span>
          <span className="lc-stat-label">Tasks completed</span>
        </div>
        <div className="lc-stat-divider" />
        <div className="lc-stat-box">
          <span className="lc-stat-num">{Object.values(completionMap).filter(v => v > 0).length}</span>
          <span className="lc-stat-label">Active days</span>
        </div>
        <div className="lc-stat-divider" />
        <div className="lc-stat-box">
          <span className="lc-stat-num lc-streak">{currentStreak} 🔥</span>
          <span className="lc-stat-label">Current streak</span>
        </div>
        <div className="lc-stat-divider" />
        <div className="lc-stat-box">
          <span className="lc-stat-num">{longestStreak}</span>
          <span className="lc-stat-label">Longest streak</span>
        </div>
      </div>

      <div className="lc-heatmap-scroll">
        <div className="lc-grid-wrap">
          <div className="lc-month-row">
            <div className="lc-day-col-spacer" />
            <div className="lc-month-labels">
              {monthLabels.map((m, i) => (
                <span key={i} className="lc-month-label" style={{ left: `${m.col * 18}px` }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="lc-body">
            <div className="lc-day-col">
              {DAYS.map((d, i) => (
                <span key={d} className="lc-day-label">{i % 2 === 1 ? d : ""}</span>
              ))}
            </div>
            <div className="lc-cells">
              {weeks.map((week, wi) => (
                <div key={wi} className="lc-week">
                  {week.map((cell) => (
                    <div
                      key={cell.key}
                      className={`lc-cell ${cell.isFuture ? "lc-future" : getHeatColor(cell.count)}`}
                      onMouseEnter={(e) =>
                        setTooltip({ x: e.clientX, y: e.clientY, count: cell.count, date: cell.key, isFuture: cell.isFuture })
                      }
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="lc-legend-row">
            <span className="lc-legend-label">Less</span>
            {["lc-0","lc-1","lc-2","lc-3","lc-4"].map((c) => (
              <span key={c} className={`lc-cell ${c}`} />
            ))}
            <span className="lc-legend-label">More</span>
          </div>
        </div>
      </div>

      {tooltip && (
        <div className="lc-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 44 }}>
          {tooltip.isFuture ? (
            <span>{tooltip.date}</span>
          ) : (
            <><strong>{tooltip.count} task{tooltip.count !== 1 ? "s" : ""}</strong><span> on {tooltip.date}</span></>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Weekly Focus Chart ───────────────────────────────────── */
const WeeklyFocusChart = ({ focusSessions }) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Build last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const key = localDateKey(d);
    return {
      key,
      label: DAY_SHORT[d.getDay()],
      minutes: 0,
    };
  });

  // Sum focus minutes per day
  focusSessions.forEach((session) => {
    const key = localDateKey(new Date(session.completedAt));
    const day = days.find((d) => d.key === key);
    if (day) day.minutes += session.durationMinutes || 0;
  });

  const totalMins = days.reduce((sum, d) => sum + d.minutes, 0);
  const totalHours = (totalMins / 60).toFixed(1);
  const bestDay = days.reduce((best, d) => (d.minutes > best.minutes ? d : best), days[0]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const mins = payload[0].value;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return (
      <div className="weekly-tooltip">
        <div className="weekly-tooltip-day">{label}</div>
        <div className="weekly-tooltip-time">
          {hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`}
        </div>
      </div>
    );
  };

  return (
    <div className="weekly-focus-wrap">
      {/* Mini stats */}
      <div className="weekly-stats-row">
        <div className="weekly-stat">
          <span className="weekly-stat-num">{totalHours}h</span>
          <span className="weekly-stat-label">This week</span>
        </div>
        <div className="weekly-stat-divider" />
        <div className="weekly-stat">
          <span className="weekly-stat-num">{Math.round(totalMins / 7)}m</span>
          <span className="weekly-stat-label">Daily avg</span>
        </div>
        <div className="weekly-stat-divider" />
        <div className="weekly-stat">
          <span className="weekly-stat-num">{bestDay.minutes}m</span>
          <span className="weekly-stat-label">Best day ({bestDay.label})</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="weekly-chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} barSize={32} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" stroke="#6c6f67" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#6c6f67" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(202,255,77,0.04)" }} />
            <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
              {days.map((d, i) => {
                const isToday = d.key === localDateKey(new Date());
                return (
                  <Cell
                    key={i}
                    fill={isToday ? "#caff4d" : d.minutes > 0 ? "#4a8a2a" : "#1e211b"}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
/* ─────────────────────────────────────────────────────────── */

const ProgressPage = () => {
  const navigate = useNavigate();
  const { tasks, loading } = useTasks();
  const [progressData, setProgressData] = useState([]);
  const [history, setHistory] = useState([]);
  const [dailyCompletion, setDailyCompletion] = useState([]);
  const [studyTimeData, setStudyTimeData] = useState([]);
  const [studyByTag, setStudyByTag] = useState([]);
  const [recurringHeatmaps, setRecurringHeatmaps] = useState([]);
  const [badges, setBadges] = useState([]);
  const [recurringHabits, setRecurringHabits] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [yearCompletionMap, setYearCompletionMap] = useState({});
  const [focusSessions, setFocusSessions] = useState([]);

  useEffect(() => {
    if (loading) return;

    const run = async () => {
      const storedTasks = tasks;
      const completedHistory = JSON.parse(localStorage.getItem("history")) || [];
      let sessions = [];
      try {
        sessions = await fetchFocusSessions();
        setFocusSessions(sessions);
      } catch {
        // not fatal
      }

      setHistory(completedHistory);

      // Year heatmap
      const yearMap = {};
      storedTasks
        .filter((t) => t.completed && t.completedAt)
        .forEach((t) => {
          const key = localDateKey(new Date(t.completedAt));
          yearMap[key] = (yearMap[key] || 0) + 1;
        });

      const seenForYear = new Set();
      completedHistory.forEach((entry) => {
        const iso = entry.completedAtISO || entry.completedAtFormatted;
        if (!iso) return;
        const key = localDateKey(new Date(iso));
        const dedup = `${entry.id}-${key}`;
        if (!seenForYear.has(dedup)) {
          seenForYear.add(dedup);
          if (!storedTasks.find((t) => t.id === entry.id && t.completed && t.completedAt)) {
            yearMap[key] = (yearMap[key] || 0) + 1;
          }
        }
      });
      setYearCompletionMap(yearMap);

      // Recurring habits
      const habitMap = {};
      completedHistory.forEach((entry) => {
        if (!entry.recurrence || entry.recurrence === "None") return;
        const iso = entry.completedAtISO;
        if (!iso) return;
        const date = localDateKey(new Date(iso));
        if (!habitMap[entry.id]) {
          habitMap[entry.id] = { title: entry.title || "Untitled task", dates: new Set() };
        }
        habitMap[entry.id].dates.add(date);
      });
      setRecurringHabits(
        Object.entries(habitMap).map(([id, v]) => ({ id, title: v.title, dates: v.dates }))
      );

      const recurringTasks = storedTasks.filter((t) => t.recurrence && t.recurrence !== "None");
      const heatmaps = recurringTasks.map((t) => {
        const completedDates = new Set(
          completedHistory
            .filter((h) => h.id === t.id)
            .map((h) => localDateKey(new Date(h.completedAtISO || h.completedAtFormatted)))
        );
        const days = [];
        const today = new Date();
        for (let i = 83; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = localDateKey(d);
          days.push({ date: key, done: completedDates.has(key) });
        }
        return { id: t.id, title: t.title, recurrence: t.recurrence, days, count: completedDates.size };
      });
      setRecurringHeatmaps(heatmaps);

      const completed = storedTasks.filter((task) => task.completed).length;
      const inProgress = storedTasks.filter(
        (task) => !task.completed && new Date(task.dueDate) >= new Date()
      ).length;
      const overdue = storedTasks.filter(
        (task) => !task.completed && new Date(task.dueDate) < new Date()
      ).length;

      setProgressData([
        { name: "Completed", value: completed },
        { name: "In Progress", value: inProgress },
        { name: "Overdue", value: overdue },
      ]);

      const dateMap = {};
      const seen = new Set();
      completedHistory.forEach((task) => {
        const iso = task.completedAtISO || task.completedAtFormatted;
        if (!iso) return;
        const date = localDateKey(new Date(iso));
        const key = `${task.id}-${date}`;
        if (!seen.has(key)) {
          seen.add(key);
          dateMap[date] = (dateMap[date] || 0) + 1;
        }
      });
      const dateArray = Object.keys(dateMap)
        .map((date) => ({ date, completed: dateMap[date] }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setDailyCompletion(dateArray);

      const studyMap = {};
      const tagMinutesMap = {};
      sessions.forEach((session) => {
        const date = localDateKey(new Date(session.completedAt));
        studyMap[date] = (studyMap[date] || 0) + (session.durationMinutes || 0);
        (session.tags || []).forEach((tag) => {
          tagMinutesMap[tag] = (tagMinutesMap[tag] || 0) + (session.durationMinutes || 0);
        });
      });
      const studyArray = Object.keys(studyMap)
        .map((date) => ({ date, minutes: studyMap[date] }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setStudyTimeData(studyArray);
      setStudyByTag(
        Object.keys(tagMinutesMap)
          .map((tag) => ({ tag, minutes: tagMinutesMap[tag] }))
          .sort((a, b) => b.minutes - a.minutes)
      );

      const { current: streakNow, longest: maxStreak } = computeStreak(Object.keys(dateMap));
      setCurrentStreak(streakNow);
      setLongestStreak(maxStreak);

      const unlocked = [];
      if (completed >= 1) unlocked.push("🐣 First Task");
      if (completed >= 5) unlocked.push("🚀 Overachiever");
      if (streakNow >= 3) unlocked.push("🔥 3-Day Streak");
      if (streakNow >= 7) unlocked.push("🗓️ 7-Day Warrior");
      if (Object.values(studyMap).some((min) => min >= 60)) unlocked.push("👶 Focus Rookie");
      const allTags = new Set();
      storedTasks.forEach((task) => task.tags?.forEach((t) => allTags.add(t)));
      if (["Work", "Personal", "Urgent", "Low Priority", "Learning"].every((tag) => allTags.has(tag))) {
        unlocked.push("🗂️ Planner Pro");
      }

      const storedUnlocked = JSON.parse(localStorage.getItem("unlockedBadges")) || [];
      const newBadges = unlocked.filter((b) => !storedUnlocked.includes(b));
      if (newBadges.length > 0) newBadges.forEach((badge) => showBadgePopup(badge));
      localStorage.setItem("unlockedBadges", JSON.stringify(unlocked));
      setBadges(unlocked);
    };

    run();
  }, [tasks, loading]);

  const showBadgePopup = (badge) => {
    const popup = document.createElement("div");
    popup.className = "badge-popup";
    popup.innerText = `🏅 Badge Unlocked: ${badge}`;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add("show"), 100);
    setTimeout(() => {
      popup.classList.remove("show");
      setTimeout(() => document.body.removeChild(popup), 300);
    }, 3000);
  };

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="progress-page">
      <div className="progress-head">
        <h1>Progress</h1>
        <p className="progress-sub">A look at how your work is actually going.</p>
      </div>

      {/* Progress bar */}
      <div className="progress-card progress-summary">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="progress-summary-row">
          <span>{progressPercent.toFixed(1)}% tasks completed</span>
        </div>
      </div>

      {/* LeetCode heatmap */}
      <div className="progress-card">
        <h2>📅 Activity over the last year</h2>
        <YearHeatmap
          completionMap={yearCompletionMap}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
        />
      </div>

      {/* Weekly focus chart */}
      <div className="progress-card">
        <h2>⏱️ Weekly focus time</h2>
        <WeeklyFocusChart focusSessions={focusSessions} />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="progress-card badges-card">
          <h2>🏆 Your unlocked badges</h2>
          <div className="badges-list">
            {badges.map((badge, idx) => (
              <span key={idx} className="badge-pill">{badge}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recurring task streaks */}
      {recurringHeatmaps.length > 0 && (
        <div className="progress-card">
          <h2>Recurring task streaks</h2>
          <div className="habit-heatmap-list">
            {recurringHeatmaps.map((h) => (
              <div key={h.id} className="habit-heatmap-row">
                <div className="habit-heatmap-head">
                  <span className="habit-heatmap-title">{h.title}</span>
                  <span className="habit-heatmap-meta">{h.recurrence} · {h.count} completions</span>
                </div>
                <div className="habit-heatmap-grid">
                  {h.days.map((d) => (
                    <span key={d.date} className={`habit-cell ${d.done ? "done" : ""}`} title={d.date} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="progress-grid">
        <div className="progress-card chart-card">
          <h2>Task breakdown</h2>
          <div className="chart-frame">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={progressData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="progress-card chart-card">
          <h2>📊 Tasks completed per day</h2>
          <div className="chart-frame">
            <ResponsiveContainer>
              <BarChart data={dailyCompletion}>
                <XAxis dataKey="date" stroke="#6c6f67" fontSize={10} />
                <YAxis stroke="#6c6f67" allowDecimals={false} fontSize={10} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="completed" fill="#caff4d" barSize={18} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="progress-card chart-card chart-card-wide">
          <h2>🕓 Study time per day</h2>
          <div className="chart-frame">
            <ResponsiveContainer>
              <LineChart data={studyTimeData}>
                <XAxis dataKey="date" stroke="#6c6f67" fontSize={10} />
                <YAxis stroke="#6c6f67" fontSize={10} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e211b" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#9a9d96" }} />
                <Line type="monotone" dataKey="minutes" stroke="#caff4d" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {studyByTag.length > 0 && (
          <div className="progress-card chart-card chart-card-wide">
            <h2>Focus time by tag</h2>
            <div className="chart-frame">
              <ResponsiveContainer>
                <BarChart data={studyByTag} layout="vertical">
                  <XAxis type="number" stroke="#6c6f67" fontSize={10} />
                  <YAxis type="category" dataKey="tag" stroke="#6c6f67" fontSize={11} width={90} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} min`, "Focus time"]} />
                  <Bar dataKey="minutes" fill="#caff4d" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recurring habits */}
      {recurringHabits.length > 0 && (
        <div className="progress-card habits-card">
          <h2>Recurring task habits</h2>
          {recurringHabits.map((habit) => (
            <div key={habit.id} className="habit-row">
              <div className="habit-title">{habit.title}</div>
              <div className="habit-grid">
                {Array.from({ length: 84 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (83 - i));
                  const key = localDateKey(d);
                  const done = habit.dates.has(key);
                  return (
                    <span key={key} className={`habit-cell ${done ? "done" : ""}`} title={`${key}${done ? " — done" : ""}`} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div className="progress-card history-card">
        <h2>🗃️ Completed task history</h2>
        {history.length === 0 ? (
          <p className="history-empty">No task history yet.</p>
        ) : (
          <ul className="history-list">
            {Array.from(
              new Map(
                history.map((task) => [
                  `${task.id}-${new Date(task.completedAtISO || task.completedAtFormatted).toDateString()}`,
                  task,
                ])
              ).values()
            )
              .reverse()
              .map((task, index) => (
                <li key={index} className="history-row">
                  <span>{task.title}</span>
                  <span className="history-date">{task.completedAtFormatted}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="progress-back">
        <button onClick={() => navigate("/dashboard")}>← Back to Dashboard</button>
      </div>
    </div>
  );
};

const tooltipStyle = {
  background: "#161911",
  border: "0.5px solid #2e3329",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#f4f5f3",
};

export default ProgressPage;