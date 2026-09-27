const cron = require("node-cron");
const Task = require("../models/Task");
const User = require("../models/User");
const { sendDueTasksEmail } = require("./mailer");

// Runs every day at 8:00 AM server time
const startReminderCron = () => {
  cron.schedule("0 8 * * *", async () => {
    console.log("⏰ Running due-date reminder job...");

    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // Find all incomplete tasks due today
      const dueTasks = await Task.find({
        dueDate: todayStr,
        completed: false,
      }).populate("user", "name email");

      if (dueTasks.length === 0) {
        console.log("✅ No tasks due today.");
        return;
      }

      // Group tasks by user
      const byUser = {};
      for (const task of dueTasks) {
        if (!task.user || !task.user.email) continue;
        const uid = task.user._id.toString();
        if (!byUser[uid]) {
          byUser[uid] = { user: task.user, tasks: [] };
        }
        byUser[uid].tasks.push(task);
      }

      // Send one email per user
      for (const { user, tasks } of Object.values(byUser)) {
        try {
          await sendDueTasksEmail(user.email, user.name, tasks);
          console.log(`📧 Reminder sent to ${user.email} (${tasks.length} task(s))`);
        } catch (err) {
          console.error(`❌ Failed to send reminder to ${user.email}:`, err.message);
        }
      }
    } catch (err) {
      console.error("❌ Reminder cron error:", err.message);
    }
  });

  console.log("⏰ Due-date reminder cron scheduled (8 AM daily)");
};

module.exports = { startReminderCron };