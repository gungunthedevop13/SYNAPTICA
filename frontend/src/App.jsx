import React from "react";
import { Routes, Route } from "react-router-dom";
import { useTasks } from "./hooks/useTasks";

// Public Pages
import WelcomePage from "./components/WelcomePage";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import Home from "./components/Home";
import NotesPage from "./components/NotesPage";
import ProfilePage from "./components/ProfilePage";
import TimetablePage from "./pages/TimetablePage";
import ProgressPage from "./pages/ProgressPage";
import AIStudyAssistantPage from "./pages/AIStudyassistantPage";
import Calendar from "./pages/Calendar"; // Adjust if the path differs

// Layouts
import SidebarLayout from "./SidebarLayout"; // For /dashboard/*
import ProtectedRoute from "./ProtectedRoute";

// Dashboard Pages
import Dashboard from "./Dashboard";
import TodayTasksPage from "./components/TodayTasksPage";
import CompletedTasksPage from "./components/CompletedTasksPage";
import CalendarView from "./components/CalendarView";
import BoardView from "./components/BoardView";
import PomodoroTimer from "./components/PomodoroTimer";
import StopwatchPage from "./components/StopwatchPage";


const App = () => {
  const { tasks, setTasks } = useTasks();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute><TimetablePage /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
      <Route path="/ai-assistant" element={<ProtectedRoute><AIStudyAssistantPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />

      {/* Dashboard Layout Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard tasks={tasks} setTasks={setTasks} />} />
        <Route path="today" element={<TodayTasksPage tasks={tasks} setTasks={setTasks} />} />
        <Route path="completed" element={<CompletedTasksPage />} />
        <Route path="calendar-view" element={<CalendarView tasks={tasks} setTasks={setTasks} />} />
        <Route path="board" element={<BoardView tasks={tasks} setTasks={setTasks} />} />
        <Route path="focus" element={<PomodoroTimer />} />
        <Route path="stopwatch" element={<StopwatchPage />} />
      </Route>


    </Routes>
  );
};

export default App;