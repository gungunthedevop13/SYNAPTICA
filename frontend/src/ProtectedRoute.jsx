import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#08090c",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#caff4d", fontFamily: "Space Grotesk, sans-serif",
        fontSize: "1rem", letterSpacing: "0.1em",
      }}>
        Connecting...
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
