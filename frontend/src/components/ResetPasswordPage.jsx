import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./LoginPage.css";

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-synapse" aria-hidden="true">
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMid slice">
          <line x1="20" y1="60" x2="120" y2="140" className="auth-edge" />
          <line x1="120" y1="140" x2="60" y2="260" className="auth-edge" style={{ animationDelay: "0.8s" }} />
          <line x1="120" y1="140" x2="220" y2="220" className="auth-edge" style={{ animationDelay: "1.4s" }} />
          <line x1="60" y1="260" x2="40" y2="420" className="auth-edge" style={{ animationDelay: "2s" }} />
          <line x1="220" y1="220" x2="260" y2="380" className="auth-edge" style={{ animationDelay: "2.6s" }} />
          <line x1="40" y1="420" x2="140" y2="520" className="auth-edge" style={{ animationDelay: "0.4s" }} />
          <circle cx="20" cy="60" r="3.5" className="auth-node" />
          <circle cx="120" cy="140" r="4.5" className="auth-node" style={{ animationDelay: "0.3s" }} />
          <circle cx="60" cy="260" r="3" className="auth-node" style={{ animationDelay: "0.6s" }} />
          <circle cx="220" cy="220" r="4" className="auth-node" style={{ animationDelay: "0.9s" }} />
          <circle cx="40" cy="420" r="3" className="auth-node" style={{ animationDelay: "1.2s" }} />
          <circle cx="260" cy="380" r="3.5" className="auth-node" style={{ animationDelay: "1.5s" }} />
          <circle cx="140" cy="520" r="4" className="auth-node" style={{ animationDelay: "1.8s" }} />
        </svg>
      </div>

      <div className="auth-box">
        <Link to="/" className="auth-brand">
          Synaptica<span className="spark">.</span>
        </Link>

        <h2 className="auth-title">Set a new password</h2>
        <p className="auth-subtitle">
          {success ? "Password updated — taking you to log in…" : "Choose a new password for your account."}
        </p>

        {!success && (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group password-wrapper">
              <label className="field-label" htmlFor="password">New password</label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="form-group">
              <label className="field-label" htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                autoComplete="new-password"
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Updating…" : <>Reset password <span className="arrow">→</span></>}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;