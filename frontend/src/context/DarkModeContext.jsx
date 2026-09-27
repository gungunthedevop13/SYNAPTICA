// context/DarkModeContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

// Create Context
const DarkModeContext = createContext();

// Custom Hook
export const useDarkMode = () => useContext(DarkModeContext);

// Provider
export const DarkModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true; // Default: dark mode ON
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    document.body.classList.toggle("dark", darkMode); // toggle `dark` class on <body>
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  return (
    <DarkModeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};
