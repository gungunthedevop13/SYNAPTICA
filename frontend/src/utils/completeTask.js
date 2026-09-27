import { localDateKey } from "./dateKey";

// Computes what a task should look like after its completion state is
// toggled — including advancing the due date for recurring tasks.
// This must stay identical everywhere a task can be marked complete
// (Dashboard, Home's quick-add, Today's page, etc.) or recurring tasks
// and streak tracking silently diverge between pages.
export const buildToggledTask = (task) => {
  const now = new Date();
  let nextDue = null;

  if (task.recurrence === "Daily") {
    nextDue = new Date(now.setDate(now.getDate() + 1));
  } else if (task.recurrence === "Weekly") {
    nextDue = new Date(now.setDate(now.getDate() + 7));
  } else if (task.recurrence === "Monthly") {
    nextDue = new Date(now.setMonth(now.getMonth() + 1));
  }

  const willBeCompleted = !task.completed;

  return {
    ...task,
    completed: willBeCompleted,
    completedAt: willBeCompleted ? Date.now() : null,
    dueDate: nextDue ? localDateKey(nextDue) : task.dueDate,
    status: willBeCompleted ? "Done" : task.status,
  };
};

// Logs a completion into the "history" localStorage array (used for streak
// calculation on Home/Progress) — but only on the transition into
// "completed", and only once per task per day.
export const logCompletionHistory = (originalTask, toggledTask) => {
  if (originalTask.completed || !toggledTask.completed) return;

  const history = JSON.parse(localStorage.getItem("history")) || [];
  const alreadyLogged = history.some(
    (h) =>
      h.id === originalTask.id &&
      new Date(h.completedAtISO).toDateString() === new Date().toDateString()
  );

  if (!alreadyLogged) {
    const updatedHistory = [
      ...history,
      {
        ...toggledTask,
        completedAtFormatted: new Date().toLocaleString(),
        completedAtISO: new Date().toISOString(),
      },
    ];
    localStorage.setItem("history", JSON.stringify(updatedHistory));
  }
};