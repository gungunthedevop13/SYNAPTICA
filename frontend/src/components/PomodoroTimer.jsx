import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { patchTask } from "../api/tasksApi";
import { logFocusSession } from "../api/focusApi";
import "./PomodoroTimer.css";

const PomodoroTimer = () => {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [task, setTask] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sessionsLeft, setSessionsLeft] = useState(0);

  // Load task
  useEffect(() => {
    const saved = localStorage.getItem("activeTask");
    if (saved) {
      const parsed = JSON.parse(saved);
      setTask(parsed);
      const estimatedSessions = Math.floor((parsed.estimatedMinutes || 0) / 30);
      const sessions = estimatedSessions > 0 ? estimatedSessions : 1;
      setSessionsLeft(sessions);
      setSecondsLeft(25 * 60); // Start with work
    } else {
      navigate("/dashboard");
    }
  }, [navigate]);

  // Timer effect
  useEffect(() => {
  let timer;
  if (isRunning && secondsLeft > 0) {
    timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
  } else if (isRunning && secondsLeft === 0) {
    audioRef.current?.play();
    setIsRunning(false);

    if (isBreak) {
      // Break finished → start focus session
      if (sessionsLeft > 0) {
        setIsBreak(false);
        setSecondsLeft(25 * 60);
        setIsRunning(true);
      }
    } else {
      // Focus finished — log this session regardless of whether more remain
      logFocusSession({
        task: task?.id || null,
        taskTitle: task?.title || "",
        tags: task?.tags || [],
        durationMinutes: 25,
      }).catch(() => {});

      if (sessionsLeft > 1) {
        setSessionsLeft((prev) => prev - 1);
        setIsBreak(true);
        setSecondsLeft(5 * 60);
        setIsRunning(true);
      } else {
        // ✅ Last session done → mark task complete
        alert("✅ All sessions completed!");
        setSessionsLeft(0);

        // Mark task as completed on the server
        if (task?.id) {
          patchTask(task.id, { completed: true, completedAt: new Date().toISOString() }).catch(() => {
            alert("Session finished, but couldn't sync completion to the server.");
          });
        }

        // Remove activeTask from storage
        localStorage.removeItem("activeTask");

        // Optional: Navigate back to dashboard automatically
        navigate("/dashboard");
      }
    }
  }

  return () => clearInterval(timer);
}, [isRunning, secondsLeft, isBreak, sessionsLeft, task, navigate]);


  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleStartPause = () => setIsRunning((prev) => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setSecondsLeft(25 * 60);
    const estimatedSessions = Math.floor((task?.estimatedMinutes || 0) / 30);
    setSessionsLeft(estimatedSessions > 0 ? estimatedSessions : 1);
  };

  return (
    <div className="pomodoro-page">
      <div className="pomodoro-container">
        <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
        <h1>Focus Mode</h1>
        {task ? (
          <div className="task-details">
            <h2>{task.title}</h2>
            {task.note && <p>{task.note}</p>}
            <p className="sessions-left">{sessionsLeft} session{sessionsLeft === 1 ? "" : "s"} remaining</p>
          </div>
        ) : (
          <p className="no-task">No task selected — timer will run standalone.</p>
        )}

        <div className={`timer-display ${isBreak ? "is-break" : ""}`}>
          <span>{formatTime(secondsLeft)}</span>
          <p>{isBreak ? "Break time" : "Focus time"}</p>
        </div>

        <div className="timer-controls">
          <button className="pt-primary" onClick={toggleStartPause}>
            {isRunning ? "Pause" : "Start"}
          </button>
          <button className="pt-reset" onClick={resetTimer}>Reset</button>
          <button className="pt-back" onClick={() => navigate("/dashboard")}>← Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;