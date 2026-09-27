import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../hooks/useTasks";
import { fetchFocusSessions } from "../api/focusApi";
import { computeStreak } from "../utils/streak";
import { localDateKey } from "../utils/dateKey";
import "./ProfilePage.css";

const STORAGE_KEY = "profileData";

const readLS = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch { return fallback; }
};

/* ── Mini heatmap (last 26 weeks) ── */
const MiniHeatmap = ({ completionMap }) => {
  const [tooltip, setTooltip] = useState(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - today.getDay() - 25 * 7);

  const weeks = [];
  for (let w = 0; w < 26; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + w * 7 + d);
      const key = localDateKey(date);
      const count = completionMap[key] || 0;
      const isFuture = date > today;
      week.push({ key, count, isFuture });
    }
    weeks.push(week);
  }

  const getColor = (count) => {
    if (count === 0) return "mh-0";
    if (count === 1) return "mh-1";
    if (count <= 3)  return "mh-2";
    if (count <= 6)  return "mh-3";
    return "mh-4";
  };

  return (
    <div className="mh-wrap">
      <div className="mini-heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} className="mh-week">
            {week.map((cell) => (
              <div
                key={cell.key}
                className={`mh-cell ${cell.isFuture ? "mh-future" : getColor(cell.count)}`}
                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, count: cell.count, date: cell.key, isFuture: cell.isFuture })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mh-footer">
        <div className="mh-legend">
          <span>Less</span>
          {["mh-0","mh-1","mh-2","mh-3","mh-4"].map((c) => (
            <span key={c} className={`mh-cell ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      {tooltip && (
        <div className="mh-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}>
          {tooltip.isFuture ? tooltip.date : <><strong>{tooltip.count} task{tooltip.count !== 1 ? "s" : ""}</strong> · {tooltip.date}</>}
        </div>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tasks } = useTasks();

  const [profile, setProfile] = useState(() => {
    const saved = readLS(STORAGE_KEY, {});
    return {
      bio: saved.bio || "",
      location: saved.location || "",
      website: saved.website || "",
      github: saved.github || "",
      avatar: saved.avatar || null,
    };
  });
  const [editOpen, setEditOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const fileInputRef = useRef(null);

  const [completionMap, setCompletionMap] = useState({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(0);

  useEffect(() => {
    const map = {};
    tasks
      .filter((t) => t.completed && t.completedAt)
      .forEach((t) => {
        const key = localDateKey(new Date(t.completedAt));
        map[key] = (map[key] || 0) + 1;
      });

    const history = readLS("history", []);
    const seen = new Set();
    history.forEach((entry) => {
      const iso = entry.completedAtISO || entry.completedAtFormatted;
      if (!iso) return;
      const key = localDateKey(new Date(iso));
      const dedup = `${entry.id}-${key}`;
      if (!seen.has(dedup)) {
        seen.add(dedup);
        if (!tasks.find((t) => t.id === entry.id && t.completed && t.completedAt)) {
          map[key] = (map[key] || 0) + 1;
        }
      }
    });
    setCompletionMap(map);

    const { current, longest } = computeStreak(Object.keys(map));
    setCurrentStreak(current);
    setLongestStreak(longest);

    fetchFocusSessions()
      .then((sessions) => {
        const total = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
        setFocusMinutes(total);
      })
      .catch(() => {});
  }, [tasks]);

  const completed  = tasks.filter((t) => t.completed).length;
  const total      = tasks.length;
  const pending    = tasks.filter((t) => !t.completed).length;
  const activeDays = Object.values(completionMap).filter((v) => v > 0).length;
  const focusHours = (focusMinutes / 60).toFixed(1);
  const totalTasksDone = Object.values(completionMap).reduce((a, b) => a + b, 0);
  const badges = readLS("unlockedBadges", []);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const showAvatar = profile.avatar && !profile.avatar.includes("placeholder");

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((p) => ({ ...p, avatar: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const existing = readLS(STORAGE_KEY, {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...profile }));
    setSavedMsg("Saved!");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  return (
    <div className="prof-page">

      {/* ── FULL-WIDTH TOP BANNER ── */}
      <div className="prof-banner">
        <button className="prof-back" onClick={() => navigate("/home")}>← Back</button>
      </div>

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div className="prof-layout">

        {/* LEFT SIDEBAR */}
        <aside className="prof-sidebar">

          {/* Avatar */}
          <div className="prof-avatar-wrap" onClick={() => fileInputRef.current?.click()} title="Click to change photo">
            {showAvatar ? (
              <img src={profile.avatar} alt="avatar" className="prof-avatar-img" />
            ) : (
              <div className="prof-avatar-initials">{initials}</div>
            )}
            <div className="prof-avatar-overlay">📷</div>
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} style={{ display: "none" }} />

          {/* Name + email */}
          <h1 className="prof-name">{user?.name || "Your Name"}</h1>
          <p className="prof-email">{user?.email || ""}</p>

          {/* Bio */}
          {profile.bio && <p className="prof-bio">{profile.bio}</p>}

          {/* Meta links */}
          <div className="prof-meta">
            {profile.location && (
              <div className="prof-meta-item">
                <span className="prof-meta-icon">📍</span>
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <div className="prof-meta-item">
                <span className="prof-meta-icon">🔗</span>
                <a href={profile.website} target="_blank" rel="noreferrer" className="prof-meta-link">
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {profile.github && (
              <div className="prof-meta-item">
                <span className="prof-meta-icon">⌨️</span>
                <a href={profile.github} target="_blank" rel="noreferrer" className="prof-meta-link">
                  GitHub
                </a>
              </div>
            )}
          </div>

          <div className="prof-divider" />

          {/* Quick stats */}
          <div className="prof-side-stats">
            <div className="prof-side-stat">
              <span className="prof-side-num">{pending}</span>
              <span className="prof-side-label">Pending</span>
            </div>
            <div className="prof-side-stat">
              <span className="prof-side-num">{completed}</span>
              <span className="prof-side-label">Completed</span>
            </div>
            <div className="prof-side-stat">
              <span className="prof-side-num">{total}</span>
              <span className="prof-side-label">Total</span>
            </div>
          </div>

          <div className="prof-divider" />

          {/* Buttons */}
          <button className="prof-edit-btn" onClick={() => setEditOpen((v) => !v)}>
            {editOpen ? "✕ Close Edit" : "✏️ Edit Profile"}
          </button>
          <button className="prof-logout-btn" onClick={() => { logout(); navigate("/login"); }}>
            Log out
          </button>

          {/* Edit form */}
          {editOpen && (
            <div className="prof-edit-form">
              <div className="prof-form-group">
                <label>Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Short bio..."
                  maxLength={200}
                  rows={3}
                />
                <small>{profile.bio.length}/200</small>
              </div>
              <div className="prof-form-group">
                <label>Location</label>
                <input
                  value={profile.location}
                  onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                  placeholder="City, Country"
                />
              </div>
              <div className="prof-form-group">
                <label>Website</label>
                <input
                  value={profile.website}
                  onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://yoursite.com"
                />
              </div>
              <div className="prof-form-group">
                <label>GitHub</label>
                <input
                  value={profile.github}
                  onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))}
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="prof-form-actions">
                <button className="prof-save-btn" onClick={handleSave}>Save</button>
                {savedMsg && <span className="prof-saved-msg">{savedMsg}</span>}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT MAIN */}
        <main className="prof-main">

          {/* Stats strip */}
          <div className="prof-stats-strip">
            <div className="prof-stat-box">
              <span className="prof-stat-num">{totalTasksDone}</span>
              <span className="prof-stat-label">Tasks completed</span>
            </div>
            <div className="prof-stat-div" />
            <div className="prof-stat-box">
              <span className="prof-stat-num">{activeDays}</span>
              <span className="prof-stat-label">Active days</span>
            </div>
            <div className="prof-stat-div" />
            <div className="prof-stat-box">
              <span className="prof-stat-num prof-orange">{currentStreak} 🔥</span>
              <span className="prof-stat-label">Current streak</span>
            </div>
            <div className="prof-stat-div" />
            <div className="prof-stat-box">
              <span className="prof-stat-num">{longestStreak}</span>
              <span className="prof-stat-label">Longest streak</span>
            </div>
            <div className="prof-stat-div" />
            <div className="prof-stat-box">
              <span className="prof-stat-num prof-lime">{focusHours}h</span>
              <span className="prof-stat-label">Focus time</span>
            </div>
          </div>

          {/* Heatmap */}
          <div className="prof-section">
            <div className="prof-section-head">
              <h2>{totalTasksDone} tasks completed in the last 6 months</h2>
              <button className="prof-progress-link" onClick={() => navigate("/progress")}>
                Full stats →
              </button>
            </div>
            <MiniHeatmap completionMap={completionMap} />
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="prof-section">
              <div className="prof-section-head"><h2>🏆 Badges</h2></div>
              <div className="prof-badges">
                {badges.map((b, i) => (
                  <span key={i} className="prof-badge">{b}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="prof-section">
            <div className="prof-section-head"><h2>Recent tasks</h2></div>
            {tasks.filter((t) => t.completed).length === 0 ? (
              <p className="prof-empty">No completed tasks yet.</p>
            ) : (
              <div className="prof-recent-list">
                {tasks
                  .filter((t) => t.completed && t.completedAt)
                  .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                  .slice(0, 8)
                  .map((t) => (
                    <div key={t.id} className="prof-recent-item">
                      <span className="prof-recent-check">✓</span>
                      <span className="prof-recent-title">{t.title}</span>
                      <span className="prof-recent-date">
                        {new Date(t.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default ProfilePage;