// CalendarView.jsx
import React, { useState, useRef } from "react";
import { localDateKey, todayKey } from "../utils/dateKey";
import { createTask } from "../api/tasksApi";
import "../components/CalendarVIew.css";

const DayCell = ({ date, dayTasks, isToday, isWeekend, onAddTask }) => {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const submit = async () => {
    if (submitLockRef.current) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      await onAddTask(trimmed, date);
      setTitle("");
      setAdding(false);
    } catch {
      // onAddTask already surfaces its own error; keep the input open so
      // the person doesn't lose what they typed.
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className={`calendar-day ${isToday ? "is-today" : ""} ${isWeekend ? "is-weekend" : ""}`}>
      <div className="date-label">
        <span className="date-weekday">
          {date.toLocaleDateString("en-GB", { weekday: "short" })}
        </span>
        <span className="date-num">{date.getDate()}</span>
        {!adding && (
          <button
            className="cv-add-btn"
            onClick={() => setAdding(true)}
            aria-label={`Add task for ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}
            title="Add task"
          >
            +
          </button>
        )}
      </div>

      <div className="task-container">
        {dayTasks.map((task) => (
          <div key={task.id} className="calendar-task">
            <strong>{task.title}</strong>
            {task.estimatedMinutes ? <small>{task.estimatedMinutes} min</small> : null}
          </div>
        ))}

        {adding && (
          <input
            className="cv-quick-input"
            autoFocus
            placeholder="Task title..."
            value={title}
            disabled={submitting}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setAdding(false); setTitle(""); }
            }}
            onBlur={submit}
          />
        )}

        {dayTasks.length === 0 && !adding && <div className="calendar-empty" />}
      </div>
    </div>
  );
};

const CalendarView = ({ tasks, setTasks }) => {
  const today = new Date();
  const todaysKey = todayKey();

  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(today.getDate() + i);
    return date;
  });

  const grouped = tasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    const key = localDateKey(task.dueDate);
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const months = [];
  days.forEach((date) => {
    const monthLabel = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    let group = months.find((m) => m.label === monthLabel);
    if (!group) {
      group = { label: monthLabel, days: [] };
      months.push(group);
    }
    group.days.push(date);
  });

  const handleAddTask = async (title, date) => {
    const dueDate = localDateKey(date);
    try {
      const created = await createTask({
        title,
        dueDate,
        priority: "Medium",
        status: "To Do",
        completed: false,
        subtasks: [],
      });
      setTasks((prev) => [created, ...prev]);
    } catch (err) {
      alert(err.message || "Couldn't create that task. Please try again.");
      throw err;
    }
  };

  return (
    <div className="calendar-view-page">
      <div className="cv-header">
        <h2>Upcoming</h2>
        <p className="cv-sub">Next 30 days, at a glance. Hover a day to add a task.</p>
      </div>

      {months.map((month) => (
        <div className="cv-month-group" key={month.label}>
          <div className="cv-month-label">{month.label}</div>
          <div className="calendar-view">
            {month.days.map((date) => {
              const key = localDateKey(date);
              const dayOfWeek = date.getDay();
              return (
                <DayCell
                  key={key}
                  date={date}
                  dayTasks={grouped[key] || []}
                  isToday={key === todaysKey}
                  isWeekend={dayOfWeek === 0 || dayOfWeek === 6}
                  onAddTask={handleAddTask}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CalendarView;