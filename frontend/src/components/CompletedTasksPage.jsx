import React, { useMemo } from "react";
import { useTasks } from "../hooks/useTasks";
import { patchTask, deleteTask as apiDeleteTask } from "../api/tasksApi";
import "./CompletedTasksPage.css";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const CompletedTasksPage = () => {
  const { tasks, setTasks, loading } = useTasks();

  const completedTasks = useMemo(() => {
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;
    return tasks
      .filter((task) => task.completed && task.completedAt && new Date(task.completedAt).getTime() >= sevenDaysAgo)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  }, [tasks]);

  const restoreTask = (id) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: false, completedAt: null } : task))
    );
    patchTask(id, { completed: false, completedAt: null }).catch(() => {
      alert("Couldn't restore that task on the server — it may still show as completed on refresh.");
    });
  };

  const deleteTaskPermanently = (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this task?")) return;
    setTasks((prev) => prev.filter((task) => task.id !== id));
    apiDeleteTask(id).catch(() => {
      alert("Couldn't delete that task on the server — it may reappear on refresh.");
    });
  };

  return (
    <div className="completed-page">
      <div className="completed-head">
        <h2>Completed</h2>
        <p className="completed-sub">Last 7 days · {completedTasks.length} task{completedTasks.length === 1 ? "" : "s"}</p>
      </div>

      {loading ? (
        <p className="completed-sub">Loading…</p>
      ) : completedTasks.length === 0 ? (
        <div className="completed-empty">
          <div className="completed-empty-title">Nothing completed yet</div>
          <div className="completed-empty-sub">Finished tasks from the last 7 days will show up here.</div>
        </div>
      ) : (
        <ul className="completed-list">
          {completedTasks.map((task) => (
            <li key={task.id} className="completed-item">
              <div className="completed-item-title">{task.title}</div>
              <div className="completed-item-meta">
                Completed{" "}
                {new Date(task.completedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              {task.note && <p className="completed-item-note">{task.note}</p>}
              <div className="completed-item-actions">
                <button onClick={() => restoreTask(task.id)}>Restore</button>
                <button onClick={() => deleteTaskPermanently(task.id)} className="delete-permanent">
                  Delete permanently
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CompletedTasksPage;