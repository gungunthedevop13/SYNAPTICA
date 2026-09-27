import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WelcomePage.css";

const quotes = [
  "Discipline is the bridge between goals and accomplishment.",
  "Push yourself, because no one else is going to do it for you.",
  "Success doesn't just find you. You have to go out and get it.",
  "Study hard, stay consistent, and trust the process.",
  "Each day is a chance to get better. Don't waste it.",
];

const features = ["Kanban Board", "Pomodoro Timer", "AI Study Assistant", "Smart Notes"];

// Node positions for the synapse network (percentages within viewBox 0-400 x 0-400)
const nodes = [
  { x: 60, y: 80 }, { x: 180, y: 50 }, { x: 320, y: 110 },
  { x: 90, y: 200 }, { x: 230, y: 190 }, { x: 350, y: 230 },
  { x: 140, y: 300 }, { x: 280, y: 330 }, { x: 60, y: 350 },
];
const edges = [
  [0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [2, 5],
  [3, 4], [4, 5], [3, 6], [4, 7], [5, 7], [6, 7], [6, 8],
];

const WelcomePage = () => {
  const navigate = useNavigate();
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="welcome-page">
      <div className="synapse-field" aria-hidden="true">
        <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
          {edges.map(([a, b], i) => (
            <line
              key={i}
              x1={nodes[a].x} y1={nodes[a].y}
              x2={nodes[b].x} y2={nodes[b].y}
              className="synapse-edge"
              style={{ animationDelay: `${(i % 6) * 0.6}s` }}
            />
          ))}
          {nodes.map((n, i) => (
            <circle
              key={i}
              cx={n.x} cy={n.y} r={i % 3 === 0 ? 5 : 3.2}
              className="synapse-node"
              style={{ animationDelay: `${(i % 5) * 0.4}s` }}
            />
          ))}
        </svg>
      </div>

      <div className="welcome-content">
        <span className="bracket bracket-tl" aria-hidden="true" />
        <span className="bracket bracket-br" aria-hidden="true" />
        <svg className="connector-wire" viewBox="0 0 120 80" aria-hidden="true">
          <path d="M0,8 H70 Q80,8 80,18 V70" className="wire-path" />
          <circle cx="80" cy="70" r="3" className="wire-node" />
        </svg>

        <span className="eyebrow reveal" style={{ animationDelay: "0.1s" }}>
          <span className="eyebrow-dot" />
          Welcome to
        </span>
        <h1 className="brand-title reveal" style={{ animationDelay: "0.22s" }}>
          Synaptica<span className="spark">.</span>
        </h1>
        <p className="tagline reveal" style={{ animationDelay: "0.34s" }}>
          Where every study session connects.
        </p>

        <p className="quote reveal" style={{ animationDelay: "0.46s" }} key={quoteIndex}>
          "{quotes[quoteIndex]}"
        </p>

        <div className="feature-chips reveal" style={{ animationDelay: "0.58s" }}>
          {features.map((f) => (
            <span className="chip" key={f}>{f}</span>
          ))}
        </div>

        <div className="cta-row reveal" style={{ animationDelay: "0.7s" }}>
          <button className="start-btn" onClick={() => navigate("/signup")}>
            Get Started <span className="arrow">→</span>
          </button>
          <button className="ghost-btn" onClick={() => navigate("/login")}>
            Already have an account? Log in
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;