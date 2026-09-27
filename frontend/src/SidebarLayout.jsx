import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./SidebarLayout.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "List view", icon: "ti-list", end: true },
  { to: "/dashboard/board", label: "Board view", icon: "ti-layout-kanban" },
  { to: "/dashboard/calendar-view", label: "Calendar view", icon: "ti-calendar" },
  { to: "/dashboard/today", label: "Today's tasks", icon: "ti-sun" },
  { to: "/dashboard/completed", label: "Completed", icon: "ti-checkbox" },
  { to: "/dashboard/stopwatch", label: "Stopwatch", icon: "ti-clock" },
];

const SidebarLayout = () => {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2 className="logo">Dashboard</h2>

        <nav className="nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink to="/home" className="nav-item nav-back">
          <i className="ti ti-arrow-left" aria-hidden="true" />
          <span>Back to Home</span>
        </NavLink>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default SidebarLayout;