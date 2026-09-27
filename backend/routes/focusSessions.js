const express = require("express");
const FocusSession = require("../models/FocusSession");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// GET /api/focus-sessions — all sessions for the logged-in user
router.get("/", async (req, res) => {
  try {
    const sessions = await FocusSession.find({ user: req.user._id }).sort({ completedAt: -1 });
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: "Could not load focus sessions." });
  }
});

// POST /api/focus-sessions — log a completed focus interval
router.post("/", async (req, res) => {
  try {
    const { task, taskTitle, tags, durationMinutes } = req.body;
    const session = await FocusSession.create({
      user: req.user._id,
      task: task || null,
      taskTitle: taskTitle || "",
      tags: tags || [],
      durationMinutes: durationMinutes || 25,
      completedAt: new Date(),
    });
    res.status(201).json({ session });
  } catch (err) {
    res.status(500).json({ message: "Could not log focus session." });
  }
});

module.exports = router;