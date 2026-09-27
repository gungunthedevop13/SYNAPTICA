import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import "./Calendar.css";

const TAG_COLORS = {
  Work: "#60a5fa",
  Personal: "#f472b6",
  Urgent: "#ef4444",
  "Low Priority": "#9a9d96",
  Learning: "#6ee7b7",
};

const Calendar = () => {
  const today = dayjs();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem("calendarEvents");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: "", tag: "" });

  // Save events to local storage
  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(events));
  }, [events]);

  const generateCalendarGrid = () => {
    const startOfMonth = currentMonth.startOf("month");
    const endOfMonth = currentMonth.endOf("month");
    const startDate = startOfMonth.startOf("week");
    const endDate = endOfMonth.endOf("week");

    let date = startDate.clone();
    const calendar = [];

    while (date.isBefore(endDate, "day")) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(date.clone());
        date = date.add(1, "day");
      }
      calendar.push(week);
    }
    return calendar;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, "month"));
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setNewEvent({ title: "", tag: "" });
  };

  const handleCreateEvent = () => {
    if (!newEvent.title.trim()) return;
    setEvents([
      ...events,
      {
        id: Date.now(),
        date: selectedDate.format("YYYY-MM-DD"),
        title: newEvent.title,
        tag: newEvent.tag,
      },
    ]);
    setSelectedDate(null);
  };

  const handleCancelEvent = () => {
    setSelectedDate(null);
  };

  const handleDragStart = (e, event) => {
    e.dataTransfer.setData("eventId", event.id);
  };

  const handleDrop = (e, day) => {
    const id = e.dataTransfer.getData("eventId");
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === Number(id) && evt.date !== day.format("YYYY-MM-DD")
          ? { ...evt, date: day.format("YYYY-MM-DD") }
          : evt
      )
    );
  };

  const handleDragOver = (e) => e.preventDefault();

  useEffect(() => {
    if (!selectedDate) return;
    const onKey = (e) => e.key === "Escape" && setSelectedDate(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedDate]);

  const calendar = generateCalendarGrid();

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h1>{currentMonth.format("MMMM YYYY")}</h1>
        <div className="calendar-nav-buttons">
          <button onClick={handlePrevMonth}>← Prev</button>
          <button onClick={handleNextMonth}>Next →</button>
        </div>
      </div>

      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="calendar-day">
            {d}
          </div>
        ))}

        {calendar.map((week) =>
          week.map((day) => {
            const dayEvents = events.filter((event) =>
              day.isSame(dayjs(event.date), "day")
            );
            return (
              <div
                key={day.format()}
                className={`calendar-cell ${
                  day.isSame(today, "day") ? "today" : ""
                }`}
                onClick={() => handleDateClick(day)}
                onDrop={(e) => handleDrop(e, day)}
                onDragOver={handleDragOver}
              >
                <div className="cell-date">{day.date()}</div>

                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="event"
                    draggable
                    onDragStart={(e) => handleDragStart(e, event)}
                    style={{
                      backgroundColor: TAG_COLORS[event.tag] || "#6b7280",
                    }}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {selectedDate && (
        <div className="event-modal-backdrop" onClick={handleCancelEvent}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add event — {selectedDate.format("DD MMM YYYY")}</h3>
            <input
              type="text"
              placeholder="Event title"
              value={newEvent.title}
              autoFocus
              onChange={(e) =>
                setNewEvent({ ...newEvent, title: e.target.value })
              }
              onKeyDown={(e) => e.key === "Enter" && handleCreateEvent()}
            />
            <select
              value={newEvent.tag}
              onChange={(e) => setNewEvent({ ...newEvent, tag: e.target.value })}
            >
              <option value="">Select tag</option>
              {Object.keys(TAG_COLORS).map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={handleCancelEvent}>
                Cancel
              </button>
              <button onClick={handleCreateEvent} disabled={!newEvent.title.trim()}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;