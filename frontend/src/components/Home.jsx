import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../hooks/useTasks";
import { createTask, patchTask } from "../api/tasksApi";
import { fetchFocusSessions } from "../api/focusApi";
import { computeStreak } from "../utils/streak";
import { localDateKey, todayKey as todayKeySafe } from "../utils/dateKey";
import { buildToggledTask, logCompletionHistory } from "../utils/completeTask";
import "./Home.css";

const uid = () => Math.random().toString(36).slice(2, 9);

const NAV = [
  { label: "Home", icon: "ti-home", path: "/home" },
];
const NAV_STUDY = [
  { label: "Dashboard", icon: "ti-layout-kanban", path: "/dashboard", badge: true },
  { label: "Notes",     icon: "ti-notes",         path: "/notes" },
  { label: "Calendar",  icon: "ti-calendar",       path: "/calendar" },
  { label: "Timetable", icon: "ti-table",          path: "/timetable" },
];
const NAV_TOOLS = [
  { label: "Pomodoro",  icon: "ti-clock",    path: "/dashboard/focus" },
  { label: "Stopwatch", icon: "ti-stopwatch", path: "/dashboard/stopwatch" },
  { label: "Progress",  icon: "ti-chart-bar", path: "/progress" },
];

// safe localStorage read helper
const readLS = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

// small inline icons (no external font dependency)
const IconRobot = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 8V4" />
    <circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="14" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="14" r="1.3" fill="currentColor" stroke="none" />
    <path d="M9 18h6" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
  </svg>
);

const IconPlus = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconCheck = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function Home() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // tasks (shared source of truth across the app)
  const { tasks, setTasks, loading: tasksLoading } = useTasks();

  // notes (read-only preview on Home) — flattened from the real "notebooks"
  // structure NotesPage actually writes to; the old "notes" key was never
  // written by anything, so this preview always showed empty before.
  const [notes] = useState(() => {
    const notebooks = readLS("notebooks", {});
    const flat = [];
    Object.entries(notebooks).forEach(([notebookName, sections]) => {
      Object.entries(sections || {}).forEach(([sectionName, list]) => {
        (list || []).forEach((note) => {
          flat.push({ ...note, notebook: notebookName, section: sectionName });
        });
      });
    });
    return flat;
  });

  // timetable / calendar events (read-only preview on Home)
  const [events] = useState(() => {
    const raw = readLS("calendarEvents", readLS("events", []));
    return Array.isArray(raw) ? raw : [];
  });

  // focus minutes this week — pulled from real logged Pomodoro sessions
  // instead of a "focusMinutesThisWeek" key that nothing ever wrote to.
  const [focusMinutes, setFocusMinutes] = useState(0);
  const focusGoal = readLS("focusGoalMinutes", 300);
  useEffect(() => {
    fetchFocusSessions()
      .then((sessions) => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const total = sessions
          .filter((s) => new Date(s.completedAt).getTime() >= weekAgo)
          .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        setFocusMinutes(total);
      })
      .catch(() => {});
  }, []);

  // greeting
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting("Good morning");
    else if (hr < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // stats
  const pending   = tasks.filter(t => !t.completed).length;
  const completed = tasks.filter(t =>  t.completed).length;
  const total     = tasks.length;
  const streak = (() => {
    const history = readLS("history", []);
    const dates = history
      .map((h) => h.completedAtISO && localDateKey(new Date(h.completedAtISO)))
      .filter(Boolean);
    return computeStreak(dates).current;
  })();
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  // quick-add task
  const [quickTask, setQuickTask] = useState("");
  const addQuickTask = async () => {
    const title = quickTask.trim();
    if (!title) return;
    setQuickTask("");
    try {
      const created = await createTask({ title, completed: false, dueDate: "" });
      setTasks((p) => [created, ...p]);
    } catch {
      setQuickTask(title);
    }
  };
  const toggleTask = (id) => {
    let toggled = null;
    setTasks((p) =>
      p.map((t) => {
        if (t.id !== id) return t;
        toggled = buildToggledTask(t);
        logCompletionHistory(t, toggled);
        return toggled;
      })
    );
    if (toggled) {
      const { id: _omit, ...updates } = toggled;
      patchTask(id, updates).catch(() => {});
    }
  };
  const topPending = tasks.filter(t => !t.completed).slice(0, 5);

  // "Up next" — a single best-guess suggestion instead of three separate lists.
  // Overdue beats due-today beats everything else; within a tier, High priority
  // and the earliest due date win.
  const priorityWeight = { High: 0, Medium: 1, Low: 2 };
  const upNext = (() => {
    const todayStr = todayKeySafe();
    const pending = tasks.filter(t => !t.completed);
    if (pending.length === 0) return null;

    const scored = pending.map(t => {
      let tier = 2; // no due date
      if (t.dueDate) {
        if (t.dueDate < todayStr) tier = 0; // overdue
        else if (t.dueDate === todayStr) tier = 1; // due today
        else tier = 3; // future
      }
      return { task: t, tier, priorityRank: priorityWeight[t.priority] ?? 1 };
    });

    scored.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
      if (a.task.dueDate && b.task.dueDate) return a.task.dueDate.localeCompare(b.task.dueDate);
      return 0;
    });

    return scored[0];
  })();

  // upcoming deadlines
  const upcoming = tasks
    .filter(t => !t.completed && t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);

  // today's agenda
  const todaysEvents = events
    .filter(e => (e.date || "").slice(0, 10) === todayKeySafe())
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
    .slice(0, 4);

  // recent notes — real notes have no updatedAt timestamp, so we approximate
  // "recent" by reversing insertion order instead of sorting on a field that
  // was never actually set.
  const recentNotes = [...notes].reverse().slice(0, 3);

  // AI panel — shares the same "savedChats" store as the full-screen assistant,
  // so the docked widget and /ai-assistant page continue the same conversation
  // instead of each having their own, disconnected (and previously unsaved) history.
  const loadLatestAiChat = () => {
    try {
      const chats = JSON.parse(localStorage.getItem("savedChats") || "[]");
      const last = chats[chats.length - 1];
      return { id: last?.id || null, messages: last?.messages || [] };
    } catch {
      return { id: null, messages: [] };
    }
  };

  const [aiOpen, setAiOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [activeAiChatId, setActiveAiChatId] = useState(() => loadLatestAiChat().id);
  const [aiMessages, setAiMessages] = useState(() => loadLatestAiChat().messages);
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef(null);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Persist into the same chat the full-screen assistant reads/writes,
  // creating a new saved chat on the first message if none exists yet.
  useEffect(() => {
    if (aiMessages.length === 0) return;
    try {
      const chats = JSON.parse(localStorage.getItem("savedChats") || "[]");
      const idx = chats.findIndex((c) => c.id === activeAiChatId);
      let updated;
      if (idx === -1) {
        const newChat = {
          id: Date.now().toString(),
          title: aiMessages[0]?.content?.slice(0, 30) || "Chat with Synaptica AI",
          tool: "home",
          messages: aiMessages,
        };
        updated = [...chats, newChat];
        setActiveAiChatId(newChat.id);
      } else {
        updated = [...chats];
        updated[idx] = { ...updated[idx], messages: aiMessages };
      }
      localStorage.setItem("savedChats", JSON.stringify(updated));
    } catch {}
  }, [aiMessages]);

  const sendAI = async (text) => {
    const msg = (text || aiInput).trim();
    if (!msg) return;
    setAiInput("");
    setAiMessages(p => [...p, { role: "user", content: msg }]);
    setAiLoading(true);
    try {
      const pendingSummary = tasks
        .filter(t => !t.completed)
        .slice(0, 12)
        .map(t => `- "${t.title}"${t.dueDate ? ` (due ${t.dueDate})` : ""} [${t.priority || "Medium"}]`)
        .join("\n") || "No pending tasks.";

      const notesSummary = notes
        .slice(-8)
        .map(n => `- "${n.title || "Untitled"}"${n.tags?.length ? ` (tags: ${n.tags.join(", ")})` : ""}`)
        .join("\n") || "No notes yet.";

      const systemContext =
        `You are Synaptica AI, a helpful study assistant embedded in a task/notes app. Be concise and helpful.\n\n` +
        `The user's current pending tasks:\n${pendingSummary}\n\n` +
        `The user's recent notes:\n${notesSummary}\n\n` +
        `Use this context when relevant (e.g. "what's due this week", "summarize my notes on X") ` +
        `but don't mention this context block explicitly unless asked what you know about their tasks/notes.`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemContext },
            ...aiMessages,
            { role: "user", content: msg },
          ],
        }),
      });
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";
      setAiMessages(p => [...p, { role: "assistant", content: reply }]);
    } catch {
      setAiMessages(p => [...p, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "GB";

  const firstName = user?.name?.split(" ")[0] || "there";

  const avatarUrl = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem("profileData") || "{}");
    return saved.avatar || null;
  } catch {
    return null;
  }
})();
  const goTo = (path) => {
    setMobileNavOpen(false);
    navigate(path);
  };

  return (
    <div className="home-layout">

      {mobileNavOpen && (
        <div className="home-sidebar-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`home-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="hs-top">
          <div className="hs-brand">Synaptica<span>.</span></div>
          <button className="hs-mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <nav className="hs-nav">
          {NAV.map(n => (
            <button key={n.path} className="hs-item active" onClick={() => goTo(n.path)}>
              <i className={`ti ${n.icon}`} aria-hidden="true" />
              <span>{n.label}</span>
            </button>
          ))}

          <div className="hs-section-label">Study</div>
          {NAV_STUDY.map(n => (
            <button key={n.path} className="hs-item" onClick={() => goTo(n.path)}>
              <i className={`ti ${n.icon}`} aria-hidden="true" />
              <span>{n.label}</span>
              {n.badge && pending > 0 && <span className="hs-badge">{pending}</span>}
            </button>
          ))}

          <div className="hs-section-label">Tools</div>
          {NAV_TOOLS.map(n => (
            <button key={n.path} className="hs-item" onClick={() => goTo(n.path)}>
              <i className={`ti ${n.icon}`} aria-hidden="true" />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="hs-bottom" onClick={() => goTo("/profile")}>
          <div className="hs-avatar">{initials}</div>
          <div className="hs-uname">{user?.name || "User"}</div>
          <button
            className="hs-logout"
            onClick={(e) => { e.stopPropagation(); setMobileNavOpen(false); logout(); navigate("/login"); }}
            title="Log out"
          >
            <i className="ti ti-logout" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="home-main">

        {/* top bar */}
        <div className="home-topbar">
          <div className="htb-left">
            <button className="hs-mobile-toggle" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
              <i className="ti ti-menu-2" aria-hidden="true" />
            </button>
            <span className="htb-page">Home</span>
          </div>
          <div className="htb-right">
  <button
    className="htb-avatar-btn"
    onClick={() => navigate("/profile")}
    title="Profile"
    aria-label="Profile"
  >
    {avatarUrl && !avatarUrl.includes("placeholder") ? (
      <img src={avatarUrl} alt="avatar" className="htb-avatar-img" />
    ) : (
      <span className="htb-avatar-initials">{initials}</span>
    )}
  </button>
</div>

        </div>

        {/* content */}
        <div className="home-content">
          <div className="home-hero">
            <h1>{greeting}, {firstName} 👋</h1>
          </div>

          {upNext && (
            <div className={`home-upnext tier-${upNext.tier}`}>
              <div className="home-upnext-label">
                {upNext.tier === 0 ? "Overdue" : upNext.tier === 1 ? "Due today" : "Up next"}
              </div>
              <div className="home-upnext-body">
                <div className="home-upnext-title">{upNext.task.title}</div>
                <div className="home-upnext-meta">
                  {upNext.task.dueDate && <span>{upNext.task.dueDate}</span>}
                  <span className={`home-upnext-priority ${upNext.task.priority?.toLowerCase()}`}>
                    {upNext.task.priority || "Medium"}
                  </span>
                </div>
              </div>
              <button
                className="home-upnext-start"
                onClick={() => {
                  localStorage.setItem("activeTask", JSON.stringify(upNext.task));
                  navigate("/dashboard/focus");
                }}
              >
                Start focus
              </button>
            </div>
          )}

          {tasksLoading ? (
            <div className="home-loading">Loading your workspace…</div>
          ) : total === 0 ? (
            /* ── EMPTY STATE ── */
            <div className="home-empty">
              <div className="home-empty-text">
                <div className="home-empty-title">You don't have any tasks yet</div>
                <div className="home-empty-sub">Add your first one to start tracking your progress today.</div>
              </div>
              <div className="home-quickadd home-quickadd-empty">
                <IconPlus />
                <input
                  placeholder="e.g. Finish chapter 3 notes"
                  value={quickTask}
                  onChange={e => setQuickTask(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addQuickTask()}
                />
                <button onClick={addQuickTask}>Add</button>
              </div>
            </div>
          ) : (
            <>
              {/* stats + progress ring */}
              <div className="home-stats">
                <div className="hstat">
                  <div className={`hstat-val ${pending > 0 ? "warn" : "success"}`}>{pending}</div>
                  <div className="hstat-label">Pending tasks</div>
                </div>
                <div className="hstat">
                  <div className="hstat-val accent">{streak > 0 ? `${streak} days` : "—"}</div>
                  <div className="hstat-label">Streak</div>
                </div>
                <div className="hstat">
                  <div className="hstat-val">{completed}</div>
                  <div className="hstat-label">Completed</div>
                </div>
                <div className="hstat">
                  <div className="hstat-val">{total}</div>
                  <div className="hstat-label">Total tasks</div>
                </div>
                <div className="hstat hstat-ring">
                  <svg width="46" height="46" viewBox="0 0 46 46">
                    <circle cx="23" cy="23" r="19" fill="none" stroke="#1e211b" strokeWidth="5" />
                    <circle
                      cx="23" cy="23" r="19" fill="none" stroke="#caff4d" strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 19}
                      strokeDashoffset={2 * Math.PI * 19 * (1 - pct / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 23 23)"
                    />
                    <text x="23" y="27" textAnchor="middle" fontSize="11" fill="#f4f5f3" fontFamily="Poppins, sans-serif">{pct}%</text>
                  </svg>
                  <div className="hstat-label">Done this week</div>
                </div>
              </div>

              {/* widgets grid */}
              <div className="home-widgets">

                {/* quick tasks */}
                <div className="hw-card">
                  <div className="hw-card-head">
                    <span>Quick tasks</span>
                    <button className="hw-link" onClick={() => navigate("/dashboard")}>View all</button>
                  </div>
                  <div className="home-quickadd">
                    <IconPlus />
                    <input
                      placeholder="Add a task..."
                      value={quickTask}
                      onChange={e => setQuickTask(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addQuickTask()}
                    />
                    <button onClick={addQuickTask}>Add</button>
                  </div>
                  {topPending.length === 0 ? (
                    <div className="hw-empty">Nothing pending — nice work 🎉</div>
                  ) : (
                    <ul className="hw-tasklist">
                      {topPending.map(t => (
                        <li key={t.id}>
                          <button className="hw-check" onClick={() => toggleTask(t.id)} aria-label="Complete task" />
                          <span>{t.title || t.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* today's agenda */}
                <div className="hw-card">
                  <div className="hw-card-head">
                    <span>Today's agenda</span>
                    <button className="hw-link" onClick={() => navigate("/calendar")}>Calendar</button>
                  </div>
                  {todaysEvents.length === 0 ? (
                    <div className="hw-empty">Nothing scheduled today. <button className="hw-inline-link" onClick={() => navigate("/calendar")}>Add an event</button></div>
                  ) : (
                    <ul className="hw-agenda">
                      {todaysEvents.map((e, i) => (
                        <li key={e.id || i}>
                          <span className="hw-time">{e.time || "—"}</span>
                          <span>{e.title || e.label || "Untitled"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* recent notes */}
                <div className="hw-card">
                  <div className="hw-card-head">
                    <span>Recent notes</span>
                    <button className="hw-link" onClick={() => navigate("/notes")}>All notes</button>
                  </div>
                  {recentNotes.length === 0 ? (
                    <div className="hw-empty">No notes yet. <button className="hw-inline-link" onClick={() => navigate("/notes")}>Write one</button></div>
                  ) : (
                    <ul className="hw-notes">
                      {recentNotes.map((n, i) => {
                        const plainText = (n.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                        return (
                          <li key={n.id || i} onClick={() => navigate("/notes")}>
                            <div className="hw-note-title">{n.title || "Untitled note"}</div>
                            <div className="hw-note-snip">{plainText.slice(0, 70) || "No content yet"}</div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* focus summary */}
                <div className="hw-card">
                  <div className="hw-card-head">
                    <span>Focus this week</span>
                    <button className="hw-link" onClick={() => navigate("/dashboard/focus")}>Pomodoro</button>
                  </div>
                  <div className="hw-focus-val">{focusMinutes}<span> min</span></div>
                  <div className="hw-focus-bar">
                    <div className="hw-focus-fill" style={{ width: `${Math.min(100, (focusMinutes / focusGoal) * 100)}%` }} />
                  </div>
                  <div className="hw-focus-goal">Goal: {focusGoal} min / week</div>
                </div>

                {/* upcoming deadlines */}
                <div className="hw-card hw-card-wide">
                  <div className="hw-card-head">
                    <span>Upcoming deadlines</span>
                  </div>
                  {upcoming.length === 0 ? (
                    <div className="hw-empty">No upcoming deadlines — add a due date on a task to see it here.</div>
                  ) : (
                    <ul className="hw-deadlines">
                      {upcoming.map(t => (
                        <li key={t.id}>
                          <span>{t.title || t.text}</span>
                          <span className="hw-due">{new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      </main>

      {/* ── AI FLOATING BUTTON ── */}
      <button
        className={`home-ai-fab ${aiOpen ? "active" : ""}`}
        onClick={() => setAiOpen(o => !o)}
        title="Ask AI"
        aria-label="Ask AI"
      >
        <IconRobot />
      </button>

      {/* ── AI PANEL ── */}
      {aiOpen && (
        <div className="home-ai-panel">
          <div className="ai-panel-top">
            <div className="ai-panel-title">
              <IconRobot size={16} />
              Synaptica AI
            </div>
            <div className="ai-panel-actions">
              <button
                className="ai-panel-expand"
                title="Open full screen"
                aria-label="Open full screen"
                onClick={() => {
                  setAiOpen(false);
                  navigate("/ai-assistant", { state: { seedMessages: aiMessages } });
                }}
              >
                <i className="ti ti-arrows-diagonal" aria-hidden="true" />
              </button>
              <button className="ai-panel-close" onClick={() => setAiOpen(false)} aria-label="Close AI assistant">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="ai-panel-body">
            {aiMessages.length === 0 && (
              <>
                <p className="ai-intro"><strong>Here are a few things I can do,</strong> or ask me anything!</p>
                <div className="ai-suggestions">
                  {["Plan my study week", "What should I study next?", "Summarise my notes", "Create a Pomodoro plan", "Review my progress"].map(s => (
                    <button key={s} className="ai-suggest-chip" onClick={() => sendAI(s)}>
                      <i className="ti ti-sparkles" aria-hidden="true" />
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {aiMessages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                {m.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            ))}

            {aiLoading && (
              <div className="ai-msg assistant ai-loading">
                <span /><span /><span />
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          <div className="ai-panel-input">
            <div className="ai-input-row">
              <i className="ti ti-sparkles ai-spark" aria-hidden="true" />
              <input
                placeholder="Do anything with AI..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAI(); } }}
              />
              <button className="ai-send" onClick={() => sendAI()} disabled={aiLoading}>
                <i className="ti ti-arrow-up" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}