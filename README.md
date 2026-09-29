# Synaptica 📚

A full-stack productivity and study management app built with the MERN stack. Synaptica helps students plan tasks, track study sessions, stay consistent with streaks, and get AI-powered study assistance.

🔗 **Live Demo:** [synaptica-fsnk.vercel.app](https://synaptica-fsnk.vercel.app)  
📦 **GitHub:** [github.com/gungunthedevop13/SYNAPTICA](https://github.com/gungunthedevop13/SYNAPTICA)

---

## Features

### Task Management
- Create, edit, and delete tasks with **priority levels** (High / Medium / Low)
- **Subtasks** with individual completion tracking
- **Drag and drop** reordering in List View
- **Board View** (Kanban) with drag-and-drop across columns (To Do / In Progress / Done)
- **Calendar View** for date-based task planning
- Filter by priority, tag, and status; sort by due date or priority
- Recurring tasks (Daily / Weekly / Monthly)

### Focus & Productivity
- **Pomodoro Timer** with custom work/break intervals
- **Stopwatch** for free-form session tracking
- Focus sessions logged to the database per task
- Weekly focus time summary on the Progress page

### Progress & Analytics
- **LeetCode-style activity heatmap** — 365 days of task completion history
- **Weekly focus chart** — last 7 days of Pomodoro/stopwatch sessions
- Tasks completed per day bar chart
- Study time per day line chart
- Focus time by tag breakdown
- Streak tracking — current and longest streak
- Achievement badges unlocked based on activity

### AI Study Assistant
- Powered by **OpenRouter (GPT-3.5-Turbo)**
- Context-aware — knows your pending tasks and recent notes
- Tools: Summarizer, Quiz generator, Flashcard maker, Schedule planner, Doubt solver, Rewriter
- Docked widget on the Home page + full-screen mode
- Chat history persisted across sessions

### Profile
- **LeetCode-style profile page** — two-column layout with sidebar and main content
- Activity heatmap (last 6 months)
- Stats: tasks completed, active days, streaks, focus hours
- Achievement badges display
- Editable bio, location, website, GitHub link
- Avatar upload

### Notifications & Automation
- **Daily email reminders** via Resend — sends a summary of tasks due today at 8 AM
- **Password reset** via email with secure tokenized links
- Cron job powered by `node-cron`

### Other
- JWT-based authentication (signup, login, forgot/reset password)
- Notes with rich text editor (Quill)
- Timetable and Calendar pages
- **PWA support** — installable on mobile as a standalone app
- Responsive sidebar with hamburger menu on mobile

---

## Tech Stack

### Frontend
| Technology | Usage |
|---|---|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| Vite | Build tool |
| Recharts | Charts and data visualization |
| Framer Motion | Animations |
| react-beautiful-dnd | Drag and drop |
| Quill | Rich text notes editor |
| vite-plugin-pwa | PWA support |

### Backend
| Technology | Usage |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Resend | Email (reminders + password reset) |
| node-cron | Scheduled jobs |
| OpenRouter API | AI assistant |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Resend account (for emails)
- OpenRouter account (for AI)

### Clone the repo
```bash
git clone https://github.com/gungunthedevop13/SYNAPTICA.git
cd SYNAPTICA
```

### Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
OPENROUTER_API_KEY=your_openrouter_api_key
CLIENT_URL=http://localhost:5173
PORT=5000
```

Start the backend:
```bash
npm run dev
```

### Frontend setup
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
VITE_API_URL=http://localhost:5000
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

Start the frontend:
```bash
npm run dev
```

Open `http://localhost:5173`

---

## Deployment

| Service | Purpose |
|---|---|
| Vercel | Frontend hosting |
| Render | Backend hosting |
| MongoDB Atlas | Database |
| Resend | Email service |

---

## Project Structure

```
SYNAPTICA/
├── backend/
│   ├── middleware/        # JWT auth middleware
│   ├── models/            # Mongoose models (User, Task, FocusSession)
│   ├── routes/            # Express routes (auth, tasks, focus, ai)
│   ├── utils/             # Mailer, cron job
│   └── server.js
│
└── frontend/
    └── src/
        ├── api/           # API calls (tasks, focus sessions)
        ├── components/    # Reusable UI components
        ├── context/       # Auth context
        ├── hooks/         # Custom hooks (useTasks)
        ├── pages/         # Page components (Progress, AI, Calendar)
        ├── utils/         # Helpers (streak, dateKey, completeTask)
        └── views/         # View wrappers
```

---

## Key Technical Decisions

- **JWT in localStorage** — simple stateless auth suitable for a portfolio project
- **OpenRouter API called from backend** — API key never exposed to the client
- **node-cron for email reminders** — lightweight scheduler, no queue infrastructure needed
- **localStorage + MongoDB hybrid** — task history and badges use localStorage for speed; source of truth is MongoDB
- **Vite PWA plugin** — service worker and manifest generated automatically at build time

---

## Author

**Gungun Bohare**  
Final-year B.Tech IT student at ITM University, Gwalior  
🔗 [GitHub](https://github.com/gungunthedevop13) · [LeetCode](https://leetcode.com/dev_gungun)

---

## License

MIT
