import React from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { todayKey, localDateKey } from "../utils/dateKey";
import { buildToggledTask, logCompletionHistory } from "../utils/completeTask";
import { patchTask } from "../api/tasksApi";
import "./TodayTasksPage.css";

const TodayTasksPage = ({ tasks, setTasks }) => {
  const navigate = useNavigate();
  const today = todayKey();

  const todayTasks = tasks
    .filter(
      (task) =>
        !task.completed &&
        task.dueDate &&
        localDateKey(task.dueDate) === today
    )
    .sort((a, b) => {
      const order = { High: 1, Medium: 2, Low: 3 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });

  const toggleComplete = (task) => {
    const toggled = buildToggledTask(task);
    logCompletionHistory(task, toggled);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? toggled : t)));
    const { id: _omit, ...updates } = toggled;
    patchTask(task.id, updates).catch(() => {
      alert("Couldn't save that — check your connection and try again.");
    });
  };

  const startFocus = (task) => {
    localStorage.setItem("activeTask", JSON.stringify(task));
    navigate("/dashboard/focus");
  };

  return (
    <div className="today-page">
      <div className="today-head">
        <h2>Today</h2>
        <p className="today-sub">
          {dayjs().format("dddd, MMMM D")} · {todayTasks.length} task
          {todayTasks.length === 1 ? "" : "s"} due
        </p>
      </div>

      {todayTasks.length === 0 ? (
        <div className="today-empty">
          <div className="today-empty-title">Nothing due today</div>
          <div className="today-empty-sub">Enjoy the clear runway, or get ahead on tomorrow.</div>
        </div>
      ) : (
        <ul className="today-list">
          {todayTasks.map((task) => (
            <li key={task.id} className={`today-item pr-${(task.priority || "Medium").toLowerCase()}`}>
              <button
                className="today-item-check"
                onClick={() => toggleComplete(task)}
                aria-label={`Mark "${task.title}" complete`}
              >
                <i className="ti ti-check" aria-hidden="true" />
              </button>

              <div className="today-item-body">
                <div className="today-item-title">{task.title}</div>
                <div className="today-item-meta">
                  <span className={`today-priority-pill ${(task.priority || "Medium").toLowerCase()}`}>
                    {task.priority || "Medium"}
                  </span>
                  {task.estimatedMinutes ? <span>{task.estimatedMinutes} min</span> : null}
                </div>
                {task.note && <p className="today-item-note">{task.note}</p>}
              </div>

              <button
                className="today-item-focus"
                onClick={() => startFocus(task)}
                aria-label={`Start focus session for "${task.title}"`}
                title="Start focus session"
              >
                <i className="ti ti-player-play" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TodayTasksPage;