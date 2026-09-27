// BoardViewWrapper.jsx
import React, { useEffect, useState } from "react";
import BoardView from "../components/BoardView";

const BoardViewWrapper = () => {
  const [tasks, setTasks] = useState(() => {
    const stored = localStorage.getItem("tasks");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  return <BoardView tasks={tasks} setTasks={setTasks} />;
};

export default BoardViewWrapper;
