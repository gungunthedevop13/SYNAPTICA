const express = require("express");
const Task = require("../models/Task");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// GET /api/tasks — all tasks for the logged-in user
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: "Could not load tasks." });
  }
});

// POST /api/tasks — create a task
router.post("/", async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, user: req.user._id });
    res.status(201).json({ task });
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)[0].message;
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: "Could not create task." });
  }
});

// PATCH /api/tasks/:id — partial update (toggle complete, edit field, subtasks, board status, etc.)
router.patch("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ task });
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)[0].message;
      return res.status(400).json({ message });
    }
    res.status(500).json({ message: "Could not update task." });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ message: "Task deleted." });
  } catch (err) {
    res.status(500).json({ message: "Could not delete task." });
  }
});

module.exports = router;