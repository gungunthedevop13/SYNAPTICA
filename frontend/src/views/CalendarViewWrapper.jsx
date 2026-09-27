// CalendarViewWrapper.jsx
import React, { useState, useEffect } from "react";
import CalendarView from "../components/CalendarView";

const CalendarViewWrapper = () => {
  const [tasks, setTasks] = useState(() => {
    const stored = localStorage.getItem("tasks");
    return stored ? JSON.parse(stored) : [];
  });

  return <CalendarView tasks={tasks} />;
};

export default CalendarViewWrapper;
