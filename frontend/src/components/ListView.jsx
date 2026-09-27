// ListView.jsx
import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlay,
  FiTrash2,
  FiChevronDown,
  FiPlus,
  FiCheck,
  FiMove,
  FiInbox,
} from "react-icons/fi";

const formatDueDate = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diff === 0) return { label: "Today", tone: "today" };
  if (diff === 1) return { label: "Tomorrow", tone: "soon" };
  if (diff < 0) return { label: "Overdue", tone: "overdue" };
  return {
    label: due.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    tone: "normal",
  };
};

const PRIORITY_CLASS = { High: "high", Medium: "medium", Low: "low" };

const SessionDots = ({ count = 0 }) => {
  if (!count) return null;
  const shown = Math.min(count, 6);
  return (
    <span className="session-dots" title={`${count} pomodoro session${count > 1 ? "s" : ""}`}>
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className="session-dot" />
      ))}
      {count > shown && <span className="session-dot-extra">+{count - shown}</span>}
    </span>
  );
};

const TaskCard = ({
  task,
  index,
  toggleComplete,
  startPomodoro,
  deleteTask,
  addSubtask,
  toggleSubtask,
}) => {
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState("");
  const due = formatDueDate(task.dueDate);
  const subtaskCount = task.subtasks?.length || 0;
  const subtaskDone = task.subtasks?.filter((s) => s.done).length || 0;

  const submitSubtask = () => {
    if (!subtaskInput.trim()) return;
    addSubtask(task.id, subtaskInput);
    setSubtaskInput("");
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <motion.li
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          layout
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`task-item pr-${PRIORITY_CLASS[task.priority] || "medium"} ${
            snapshot.isDragging ? "dragging" : ""
          }`}
        >
          <span className="task-dragbar" {...provided.dragHandleProps} title="Drag to reorder" aria-label="Drag to reorder">
            <FiMove aria-hidden="true" />
          </span>

          <button
            className={`task-checkbox ${task.completed ? "checked" : ""}`}
            onClick={() => toggleComplete(task.id)}
            aria-label="Complete task"
          >
            <FiCheck aria-hidden="true" />
          </button>

          <div className="task-body">
            <div className="task-row-top">
              <span className="task-title">{task.title}</span>
              <SessionDots count={task.sessions} />
            </div>

            <div className="task-meta-row">
              {due && <span className={`meta-pill due-${due.tone}`}>{due.label}</span>}
              <span className={`meta-pill priority-${PRIORITY_CLASS[task.priority] || "medium"}`}>
                {task.priority}
              </span>
              {(task.tags || []).map((tag) => (
                <span key={tag} className="meta-pill tag">
                  {tag}
                </span>
              ))}
            </div>

            {task.note && <p className="task-note">{task.note}</p>}

            <div className="task-subtasks">
              <button
                className="subtasks-toggle"
                onClick={() => setSubtasksOpen((v) => !v)}
              >
                <FiChevronDown className={`sub-chevron ${subtasksOpen ? "open" : ""}`} aria-hidden="true" />
                {subtaskCount > 0
                  ? `Subtasks (${subtaskDone}/${subtaskCount})`
                  : "Add subtasks"}
              </button>

              <AnimatePresence>
                {subtasksOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="subtask-panel"
                  >
                    {subtaskCount > 0 && (
                      <ul className="subtask-list">
                        {task.subtasks.map((sub, i) => (
                          <li key={i} className="subtask-item">
                            <button
                              className={`sub-checkbox ${sub.done ? "checked" : ""}`}
                              onClick={() => toggleSubtask(task.id, i)}
                              aria-label="Complete subtask"
                            >
                              <FiCheck aria-hidden="true" />
                            </button>
                            <span className={sub.done ? "done" : ""}>{sub.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="subtask-add-row">
                      <input
                        value={subtaskInput}
                        onChange={(e) => setSubtaskInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitSubtask()}
                        placeholder="New subtask..."
                      />
                      <button onClick={submitSubtask} aria-label="Add subtask">
                        <FiPlus aria-hidden="true" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="task-actions">
            <button className="ta-start" onClick={() => startPomodoro(task)} title="Start focus session" aria-label="Start focus session">
              <FiPlay aria-hidden="true" />
            </button>
            <button className="ta-delete" onClick={() => deleteTask(task.id)} title="Delete task" aria-label="Delete task">
              <FiTrash2 aria-hidden="true" />
            </button>
          </div>
        </motion.li>
      )}
    </Draggable>
  );
};

const ListView = ({
  tasks,
  toggleComplete,
  startPomodoro,
  deleteTask,
  addSubtask,
  toggleSubtask,
  hasAnyTasks,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="task-empty">
        <FiInbox size={28} aria-hidden="true" />
        <div className="task-empty-title">
          {hasAnyTasks ? "No tasks match your filters" : "No tasks yet"}
        </div>
        <div className="task-empty-sub">
          {hasAnyTasks
            ? "Try clearing a filter or searching for something else."
            : "Add your first task above to start tracking your work."}
        </div>
      </div>
    );
  }

  return (
    <div className="task-list">
      <Droppable droppableId="taskList">
        {(provided) => (
          <ul {...provided.droppableProps} ref={provided.innerRef}>
            <AnimatePresence>
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  toggleComplete={toggleComplete}
                  startPomodoro={startPomodoro}
                  deleteTask={deleteTask}
                  addSubtask={addSubtask}
                  toggleSubtask={toggleSubtask}
                />
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </div>
  );
};

export default ListView;