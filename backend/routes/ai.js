const express = require("express");
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const promptMap = {
  summarizer: (text) => `Summarize this:\n${text}`,
  quiz: (text) => `Make 5 quiz questions from:\n${text}`,
  flashcard: (text) => `Make flashcards (term: definition) from:\n${text}`,
  schedule: (text) => `Suggest a 5-day study schedule for:\n${text}`,
  doubt: (text) => `Answer this academic doubt:\n${text}`,
  rewriter: (text) => `Rewrite this in simpler, clearer language:\n${text}`,
};

router.post("/", async (req, res) => {
  const { tool, inputText } = req.body;

  if (!tool || !inputText) {
    return res.status(400).json({ message: "tool and inputText are required" });
  }

  const buildPrompt = promptMap[tool];
  const prompt = buildPrompt ? buildPrompt(inputText) : inputText;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);
      return res.status(response.status).json({ message: data.error?.message || "OpenRouter error" });
    }

    const result = data.choices[0].message.content;
    res.json({ result });
  } catch (err) {
    console.error("AI route error:", err.message);
    res.status(500).json({ message: "Failed to get AI response" });
  }
});

module.exports = router;