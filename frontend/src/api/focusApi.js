const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const authHeaders = () => {
  const token = localStorage.getItem("synaptica_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handle = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
};

export const fetchFocusSessions = async () => {
  const res = await fetch(`${API}/api/focus-sessions`, { headers: authHeaders() });
  const { sessions } = await handle(res);
  return sessions;
};

export const logFocusSession = async (session) => {
  const res = await fetch(`${API}/api/focus-sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(session),
  });
  const { session: created } = await handle(res);
  return created;
};