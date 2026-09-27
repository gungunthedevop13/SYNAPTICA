// BoardView.jsx
import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { patchTask } from "../api/tasksApi";
import "../components/BoardView.css";

const columns = ["To Do", "In Progress", "Done"];
const PRIORITY_CLASS = { High: "high", Medium: "medium", Low: "low" };

const BoardView = ({ tasks, setTasks }) => {
  const grouped = columns.reduce((acc, col) => {
    acc[col] = tasks.filter((t) => (t.boardStatus || "To Do") === col);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newColumn = destination.droppableId;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggableId ? { ...task, boardStatus: newColumn } : task
      )
    );

    if (source.droppableId !== destination.droppableId) {
      patchTask(draggableId, { boardStatus: newColumn }).catch(() => {
        alert("Couldn't save that move — check your connection and try again.");
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="board-view">
        {columns.map((col) => (
          <Droppable droppableId={col} key={col}>
            {(provided, snapshot) => (
              <div
                className={`board-column ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <div className="board-column-head">
                  <h3>{col}</h3>
                  <span className="board-count">{grouped[col].length}</span>
                </div>

                <div className="column-tasks">
                  {grouped[col].length === 0 && !snapshot.isDraggingOver && (
                    <div className="board-empty">No tasks here</div>
                  )}
                  {grouped[col].map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          className={`board-card pr-${PRIORITY_CLASS[task.priority] || "medium"} ${
                            dragSnapshot.isDragging ? "dragging" : ""
                          }`}
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                        >
                          <strong>{task.title}</strong>
                          {task.note && <p>{task.note}</p>}
                          <div className="board-card-footer">
                            <span className={`board-priority-pill ${PRIORITY_CLASS[task.priority] || "medium"}`}>
                              {task.priority}
                            </span>
                            {task.estimatedMinutes ? <small>{task.estimatedMinutes} min</small> : null}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};

export default BoardView;