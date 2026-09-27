// ViewSwitcher.jsx
import React from "react";
import "../components/ViewSwitcher.css";

const ViewSwitcher = ({ view, setView }) => {
  return (
    <div className="view-switcher">
      <button
        className={view === "list" ? "active" : ""}
        onClick={() => setView("list")}
      >
        📝 List
      </button>
      <button
        className={view === "board" ? "active" : ""}
        onClick={() => setView("board")}
      >
        🧱 Board
      </button>
      <button
        className={view === "calendar" ? "active" : ""}
        onClick={() => setView("calendar")}
      >
        📅 Calendar
      </button>
    </div>
  );
};

export default ViewSwitcher;
