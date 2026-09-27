// DashboardPage.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext } from "react-beautiful-dnd";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiSearch,
  FiPlus,
  FiChevronDown,
  FiX,
  FiInbox,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

import ListView from "./components/ListView";
import { createTask as apiCreateTask, patchTask, deleteTask as apiDeleteTask } from "./api/tasksApi";
import { localDateKey, todayKey } from "./utils/dateKey";
import { buildToggledTask, logCompletionHistory } from "./utils/completeTask";
import "./Dashboard.css";

const TAG_OPTIONS = ["Work", "Personal", "Urgent", "Low Priority", "Learning"];
const PRIORITIES = ["All", "High", "Medium", "Low"];
const STATUS_FILTERS = [
  { value: "All", label: "All" },
  { value: "Today", label: "Due today" },
  { value: "Overdue", label: "Overdue" },
];

const defaultTask = {
  title: "",
  estimatedMinutes: "",
  dueDate: "",
  priority: "Medium",
  note: "",
  tags: [],
  recurrence: "None",
  subtasks: [],
};

const DashboardPage = ({ tasks, setTasks }) => {
  const navigate = useNavigate();

  const [newTask, setNewTask] = useState(defaultTask);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterTags, setFilterTags] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("created");
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showFormTagsDropdown, setShowFormTagsDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | saving | saved | error
  const syncTimeoutRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const formDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setShowTagsDropdown(false);
      }
      if (formDropdownRef.current && !formDropdownRef.current.contains(e.target)) {
        setShowFormTagsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trackSync = (promise) => {
    setSyncStatus("saving");
    clearTimeout(syncTimeoutRef.current);
    promise
      .then(() => {
        setSyncStatus("saved");
        syncTimeoutRef.current = setTimeout(() => setSyncStatus("idle"), 1500);
      })
      .catch(() => {
        setSyncStatus("error");
        syncTimeoutRef.current = setTimeout(() => setSyncStatus("idle"), 2500);
      });
    return promise;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const addTask = async () => {
    if (!newTask.title.trim() || submitting) return;

    const SESSION_TOTAL_MINUTES = 25 + 5; // 25 work + 5 break
    const rawMinutes = parseInt(newTask.estimatedMinutes, 10) || 0;

    // Auto-adjust to full Pomodoro cycles
    const adjustedMinutes =
      Math.ceil(rawMinutes / SESSION_TOTAL_MINUTES) * SESSION_TOTAL_MINUTES;
    const sessions = Math.ceil(adjustedMinutes / SESSION_TOTAL_MINUTES);

    const taskToCreate = {
      ...newTask,
      estimatedMinutes: adjustedMinutes,
      status: "To Do",
      sessions,
      completed: false,
      subtasks: [],
    };

    setSubmitting(true);
    try {
      const created = await apiCreateTask(taskToCreate);
      setTasks((prev) => [created, ...prev]);
      setNewTask(defaultTask);
      setShowFormTagsDropdown(false);
      setShowForm(false);
    } catch (err) {
      alert(err.message || "Could not create task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = (id) => {
    let toggledTask = null;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const toggled = buildToggledTask(task);
        logCompletionHistory(task, toggled);
        toggledTask = toggled;
        return toggled;
      })
    );

    if (toggledTask) {
      const { id: _omit, ...updates } = toggledTask;
      trackSync(patchTask(id, updates)).catch(() => {
        alert("Couldn't save that change — check your connection and try again.");
      });
    }
  };

  const startPomodoro = (task) => {
    localStorage.setItem("activeTask", JSON.stringify(task));
    navigate("/dashboard/focus");
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    trackSync(apiDeleteTask(id)).catch(() => {
      alert("Couldn't delete that task on the server — it may reappear on refresh.");
    });
  };

  const editInline = (id, field, value) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, [field]: value } : task))
    );
    trackSync(patchTask(id, { [field]: value })).catch(() => {
      alert("Couldn't save that edit — check your connection and try again.");
    });
  };

  const addSubtask = (id, subtaskTitle) => {
    if (!subtaskTitle || !subtaskTitle.trim()) return;
    let updatedSubtasks = null;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        updatedSubtasks = Array.isArray(task.subtasks)
          ? [...task.subtasks, { title: subtaskTitle.trim(), done: false }]
          : [{ title: subtaskTitle.trim(), done: false }];
        return { ...task, subtasks: updatedSubtasks };
      })
    );

    if (updatedSubtasks) {
      trackSync(patchTask(id, { subtasks: updatedSubtasks })).catch(() => {
        alert("Couldn't save that subtask — check your connection and try again.");
      });
    }
  };

  const toggleSubtask = (taskId, index) => {
    let updatedSubtasks = null;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        updatedSubtasks = task.subtasks.map((sub, i) =>
          i === index ? { ...sub, done: !sub.done } : sub
        );
        return { ...task, subtasks: updatedSubtasks };
      })
    );

    if (updatedSubtasks) {
      trackSync(patchTask(taskId, { subtasks: updatedSubtasks })).catch(() => {
        alert("Couldn't save that change — check your connection and try again.");
      });
    }
  };

  // Note: reordering here is session-only. The backend sorts tasks by
  // createdAt, so manual drag order isn't persisted across a refresh yet —
  // would need an explicit `order` field on the Task model to fix properly.
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(tasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setTasks(items);
  };

  const isOverdue = (task) =>
    task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  const isDueToday = (task) => {
    const today = todayKey();
    return task.dueDate === today && !task.completed;
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.completed)
      .filter((task) => (task.title || "").toLowerCase().includes(searchTerm.toLowerCase()))
      .filter((task) => (filterPriority === "All" ? true : task.priority === filterPriority))
      .filter((task) =>
        filterTags.length === 0
          ? true
          : filterTags.every((tag) => (task.tags || []).includes(tag))
      )
      .filter((task) => {
        if (filterStatus === "All") return true;
        if (filterStatus === "Overdue") return isOverdue(task);
        if (filterStatus === "Today") return isDueToday(task);
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const priorityOrder = { High: 1, Medium: 2, Low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        } else if (sortBy === "dueDate") {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        return b.createdAt - a.createdAt;
      });
  }, [tasks, searchTerm, filterPriority, filterTags, filterStatus, sortBy]);

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;
  const todayCount = tasks.filter((t) => isDueToday(t)).length;

  const exportWeekAsPdf = () => {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      alert("PDF export isn't available right now — try refreshing the page.");
      return;
    }

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);

    const weekTasks = tasks
      .filter((t) => !t.completed)
      .filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= now && due <= weekEnd;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("This Week's Tasks", 14, 18);
    doc.setFontSize(10);
    doc.text(`${now.toLocaleDateString()} — ${weekEnd.toLocaleDateString()}`, 14, 25);

    let y = 38;
    if (weekTasks.length === 0) {
      doc.text("No tasks due this week.", 14, y);
    } else {
      weekTasks.forEach((t, i) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.text(`${i + 1}. ${t.title}`, 14, y);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Due ${t.dueDate} · ${t.priority || "Medium"} priority${t.tags?.length ? ` · ${t.tags.join(", ")}` : ""}`, 18, y + 6);
        doc.setTextColor(0);
        y += 16;
      });
    }

    doc.save(`synaptica-week-${localDateKey(now)}.pdf`);
  };

  const toggleFormTag = (tag) => {
    setNewTask((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const toggleFilterTag = (tag) => {
    setFilterTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const hasActiveFilters =
    searchTerm || filterPriority !== "All" || filterStatus !== "All" || filterTags.length > 0;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterPriority("All");
    setFilterStatus("All");
    setFilterTags([]);
  };

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <header className="db-header">
        <div>
          <h1>Dashboard</h1>
          <p className="db-subtitle">Plan your work, then work your plan.</p>
        </div>

        <div className="db-header-right">
          {syncStatus !== "idle" && (
            <span className={`db-sync-status ${syncStatus}`}>
              {syncStatus === "saving" && "Saving…"}
              {syncStatus === "saved" && "Saved"}
              {syncStatus === "error" && "Couldn't save"}
            </span>
          )}

          <button className="db-export-btn" onClick={exportWeekAsPdf}>
            Export this week
          </button>

          <div className="db-stats">
          <div className="db-stat">
            <FiInbox aria-hidden="true" />
            <span>{pendingCount} pending</span>
          </div>
          <div className={`db-stat ${todayCount > 0 ? "warn" : ""}`}>
            <FiCheckCircle aria-hidden="true" />
            <span>{todayCount} due today</span>
          </div>
          <div className={`db-stat ${overdueCount > 0 ? "danger" : ""}`}>
            <FiAlertCircle aria-hidden="true" />
            <span>{overdueCount} overdue</span>
          </div>
        </div>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="db-toolbar">
        <div className="db-search">
          <FiSearch aria-hidden="true" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="db-pillgroup" role="group" aria-label="Filter by priority">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              className={`db-pill ${filterPriority === p ? "active" : ""}`}
              onClick={() => setFilterPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="db-pillgroup" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              className={`db-pill ${filterStatus === s.value ? "active" : ""}`}
              onClick={() => setFilterStatus(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="db-dropdown" ref={filterDropdownRef}>
          <button className="db-dropdown-trigger" onClick={() => setShowTagsDropdown((v) => !v)}>
            {filterTags.length > 0 ? `${filterTags.length} tag${filterTags.length > 1 ? "s" : ""}` : "Tags"}
            <FiChevronDown className={`db-chevron ${showTagsDropdown ? "open" : ""}`} aria-hidden="true" />
          </button>
          <AnimatePresence>
            {showTagsDropdown && (
              <motion.div
                className="db-dropdown-panel"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                {TAG_OPTIONS.map((tag) => (
                  <label key={tag} className="db-check-row">
                    <input
                      type="checkbox"
                      checked={filterTags.includes(tag)}
                      onChange={() => toggleFilterTag(tag)}
                    />
                    {tag}
                  </label>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <select className="db-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="created">Newest first</option>
          <option value="priority">By priority</option>
          <option value="dueDate">By due date</option>
        </select>

        {hasActiveFilters && (
          <button className="db-clear" onClick={clearFilters}>
            <FiX aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      {/* ── Add task ── */}
      <button className="db-add-trigger" onClick={() => setShowForm((v) => !v)}>
        <FiPlus className={`db-plus-icon ${showForm ? "rot" : ""}`} aria-hidden="true" />
        {showForm ? "Close" : "Add task"}
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="task-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="task-form-grid">
              <input
                type="text"
                name="title"
                placeholder="Task name"
                value={newTask.title}
                onChange={handleChange}
                className="tf-span-2"
                autoFocus
              />
              <input
                type="number"
                name="estimatedMinutes"
                placeholder="Time (minutes)"
                value={newTask.estimatedMinutes}
                onChange={handleChange}
                min="0"
              />
              <input type="date" name="dueDate" value={newTask.dueDate} onChange={handleChange} />

              <select name="priority" value={newTask.priority} onChange={handleChange}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>

              <select name="recurrence" value={newTask.recurrence} onChange={handleChange}>
                <option value="None">No repeat</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>

              <div className="db-dropdown tf-span-2" ref={formDropdownRef}>
                <button
                  type="button"
                  className="db-dropdown-trigger full"
                  onClick={() => setShowFormTagsDropdown((v) => !v)}
                >
                  {newTask.tags.length > 0 ? newTask.tags.join(", ") : "Select tags"}
                  <FiChevronDown className={`db-chevron ${showFormTagsDropdown ? "open" : ""}`} aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {showFormTagsDropdown && (
                    <motion.div
                      className="db-dropdown-panel"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      {TAG_OPTIONS.map((tag) => (
                        <label key={tag} className="db-check-row">
                          <input
                            type="checkbox"
                            checked={newTask.tags.includes(tag)}
                            onChange={() => toggleFormTag(tag)}
                          />
                          {tag}
                        </label>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <textarea
                name="note"
                placeholder="Additional notes..."
                value={newTask.note}
                onChange={handleChange}
                className="tf-span-2"
                rows={2}
              />
            </div>

            <div className="task-form-actions">
              <button className="tf-cancel" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="tf-submit" onClick={addTask} disabled={!newTask.title.trim() || submitting}>
                {submitting ? "Adding…" : "Add task"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Task list ── */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <ListView
          tasks={filteredTasks}
          setTasks={setTasks}
          toggleComplete={toggleComplete}
          startPomodoro={startPomodoro}
          deleteTask={deleteTask}
          editInline={editInline}
          addSubtask={addSubtask}
          toggleSubtask={toggleSubtask}
          handleDragEnd={handleDragEnd}
          hasAnyTasks={tasks.filter((t) => !t.completed).length > 0}
        />
      </DragDropContext>
    </div>
  );
};

export default DashboardPage;