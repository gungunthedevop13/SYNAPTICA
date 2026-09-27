import { useEffect, useState, useCallback } from "react";
import { fetchTasks } from "../api/tasksApi";

// Normalizes Mongo's _id to id so every existing component
// (ListView, BoardView, CalendarView, etc.) keeps working unchanged.
const normalize = (task) => ({ ...task, id: task._id || task.id });

export const useTasks = () => {
  const [tasks, setTasksState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTasks();
      setTasksState(data.map(normalize));
    } catch (err) {
      setError(err.message || "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // setTasks accepts either an array or an updater function, same as useState,
  // so every existing call site (setTasks(prev => ...)) keeps working unchanged.
  const setTasks = useCallback((update) => {
    setTasksState((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      return next.map(normalize);
    });
  }, []);

  return { tasks, setTasks, loading, error, refresh: load };
};