import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Lottie from "lottie-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import animationData from "../assets/Robot says hello.json";
import { useTasks } from "../hooks/useTasks";

import "./AIStudyassistantPage.css";

const tools = {
  summarizer: {
    name: "Summarizer",
    systemPrompt: "You are an AI that summarizes study notes in 5 clear bullet points.",
  },
  flashcards: {
    name: "Flashcards",
    systemPrompt: "You are an AI that creates useful flashcards from study material.",
  },
  quiz: {
    name: "Quiz Generator",
    systemPrompt: "You are an AI that generates quizzes from study material.",
  },
};

const loadSavedChats = () => {
  const raw = JSON.parse(localStorage.getItem("savedChats") || "[]");
  const migrated = raw.map((chat, i) =>
    chat.id ? chat : { ...chat, id: `legacy-${i}-${Date.now()}` }
  );
  if (JSON.stringify(migrated) !== JSON.stringify(raw)) {
    localStorage.setItem("savedChats", JSON.stringify(migrated));
  }
  return migrated;
};

const AIStudyAssistantPage = () => {
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const location = useLocation();
  const [selectedTool, setSelectedTool] = useState("summarizer");
  const [inputText, setInputText] = useState("");
  const [savedChats, setSavedChats] = useState(loadSavedChats);
  const [activeChatId, setActiveChatId] = useState(() => {
    const chats = loadSavedChats();
    return chats.length > 0 ? chats[chats.length - 1].id : null;
  });
  const [messages, setMessages] = useState(() => {
    const chats = loadSavedChats();
    const seed = location.state?.seedMessages;
    if (seed?.length) return seed;
    const last = chats[chats.length - 1];
    return last?.messages || [];
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const recognitionRef = useRef(null);

  // Persist messages into the active chat (creating one on the first message if needed)
  useEffect(() => {
    if (messages.length === 0) return;

    setSavedChats((prev) => {
      let chats = [...prev];
      let idx = chats.findIndex((c) => c.id === activeChatId);

      if (idx === -1) {
        const newChat = {
          id: Date.now().toString(),
          title: messages[0]?.content?.slice(0, 30) || `Chat with ${tools[selectedTool].name}`,
          tool: selectedTool,
          messages,
        };
        chats = [...chats, newChat];
        setActiveChatId(newChat.id);
      } else {
        chats[idx] = { ...chats[idx], messages };
      }

      localStorage.setItem("savedChats", JSON.stringify(chats));
      return chats;
    });
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleDeleteChat = (indexToDelete) => {
    const deleted = savedChats[indexToDelete];
    const updatedChats = savedChats.filter((_, index) => index !== indexToDelete);
    setSavedChats(updatedChats);
    localStorage.setItem("savedChats", JSON.stringify(updatedChats));
    if (deleted?.id === activeChatId) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const handleLoadChat = (chat) => {
    setActiveChatId(chat.id);
    setSelectedTool(chat.tool);
    setMessages(chat.messages);
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };
const handleSend = async (retryMessages) => {
  const sendingMessages = retryMessages || messages;
  if (!retryMessages && !inputText.trim()) return;

  const userMessage = retryMessages ? null : { role: "user", content: inputText };
  const updatedMessages = userMessage ? [...sendingMessages, userMessage] : sendingMessages;

  if (userMessage) setMessages(updatedMessages);
  setInputText("");
  setLoading(true);
  setErrorMessage(null);

  try {
    const pendingSummary = tasks
      .filter((t) => !t.completed)
      .slice(0, 12)
      .map((t) => `- "${t.title}"${t.dueDate ? ` (due ${t.dueDate})` : ""} [${t.priority || "Medium"}]`)
      .join("\n");

    const systemContent = pendingSummary
      ? `${tools[selectedTool].systemPrompt}\n\nFor context, the user's current pending tasks are:\n${pendingSummary}\nUse this only if the user's question relates to their tasks/schedule.`
      : tools[selectedTool].systemPrompt;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemContent },
          ...updatedMessages,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data?.choices?.[0]?.message) {
      setErrorMessage({
        text: "The assistant didn't return a response. Try rephrasing or sending again.",
        retryable: true,
        lastMessages: updatedMessages,
      });
      return;
    }

    const aiMessage = response.data.choices[0].message;
    setMessages((prev) => [...prev, aiMessage]);
    speak(aiMessage.content);
  } catch (error) {
    const status = error.response?.status;
    let text;
    if (!import.meta.env.VITE_OPENROUTER_API_KEY) {
      text = "No API key is configured for the AI assistant (VITE_OPENROUTER_API_KEY is missing).";
    } else if (status === 401) {
      text = "The AI service rejected the API key. Check that it's valid and hasn't expired.";
    } else if (status === 429) {
      text = "Rate limit hit — the AI service is temporarily throttling requests. Wait a moment and try again.";
    } else if (!error.response) {
      text = "Couldn't reach the AI service — check your internet connection.";
    } else {
      text = error.response?.data?.message || "Something went wrong talking to the AI service.";
    }
    setErrorMessage({ text, retryable: true, lastMessages: updatedMessages });
  } finally {
    setLoading(false);
  }
};

  const handleExportText = () => {
    const text = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice input not supported");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onresult = (e) => setInputText(e.results[0][0].transcript);
    recognition.start();
    recognitionRef.current = recognition;
  };

  return (
    <div className="ai-page">
      {sidebarOpen && (
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h2>Chats</h2>
            <button className="close-sidebar-button" onClick={() => setSidebarOpen(false)}>Close</button>
          </div>
          <button className="ai-back-btn" onClick={() => navigate("/home")}>← Back to Home</button>
          <button className="new-chat-btn" onClick={handleNewChat}>+ New Chat</button>
          <ul>
              {savedChats.map((chat, index) => (
              <li key={chat.id || index} className={`chat-list-item ${chat.id === activeChatId ? "active" : ""}`}>
                 <span onClick={() => handleLoadChat(chat)}>{chat.title}</span>
                   <button className="delete-chat-btn" onClick={() => handleDeleteChat(index)}>Delete</button>
              </li>
                     ))}
          </ul>

        </div>
      )}

      {!sidebarOpen && (
        <button className="open-sidebar-btn" onClick={() => setSidebarOpen(true)}>📂 Open Chats</button>
      )}

      <div className="chat-container">
        <div className="page-heading">
          <button className="ai-back-btn ai-back-btn-top" onClick={() => navigate("/home")}>← Back</button>
          <Lottie animationData={animationData} style={{ height: 80 }} />
          <h1>AI Study Assistant</h1>
          <div className="tool-header">
            <div className="tool-tabs-with-clear">
              <div className="tool-tabs">
                {Object.keys(tools).map((key) => (
                  <button
                    key={key}
                    className={selectedTool === key ? "active" : ""}
                    onClick={() => setSelectedTool(key)}
                  >
                    {tools[key].name}
                  </button>
                ))}
              </div>
              <button className="clear-button-inline" onClick={handleClearChat}> Clear Chat</button>
            </div>
          </div>
        </div>

        <div className="chat-box">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role === "user" ? "user" : "assistant"}`}>
              {msg.role === "assistant" ? (
                <div className="assistant-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="user-msg">{msg.content}</div>
              )}
            </div>
          ))}

          {loading && <div className="typing">Assistant is typing…</div>}

          {errorMessage && (
            <div className="ai-error-bubble">
              <span>{errorMessage.text}</span>
              {errorMessage.retryable && (
                <button
                  className="ai-retry-btn"
                  onClick={() => handleSend(errorMessage.lastMessages)}
                  disabled={loading}
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>

        <div className="input-bar">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message here..."
          />
          <button onClick={startVoiceInput}>🎤</button>
          <button onClick={() => window.speechSynthesis.cancel()} className="stop-voice-btn">
             🛑 Stop Voice
              </button>

          <button onClick={() => handleSend()}>Send</button>
          <button onClick={handleExportText}>📄</button>
        </div>
      </div>
    </div>
  );
};

export default AIStudyAssistantPage;