const mongoose = require("mongoose");

const focusSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    taskTitle: { type: String, default: "" },
    tags: { type: [String], default: [] },
    durationMinutes: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

focusSessionSchema.index({ user: 1, completedAt: -1 });

module.exports = mongoose.model("FocusSession", focusSessionSchema);