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

export const fetchTasks = async () => {
  const res = await fetch(`${API}/api/tasks`, { headers: authHeaders() });
  const { tasks } = await handle(res);
  return tasks;
};

export const createTask = async (task) => {
  const res = await fetch(`${API}/api/tasks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(task),
  });
  const { task: created } = await handle(res);
  return created;
};

export const patchTask = async (id, updates) => {
  const res = await fetch(`${API}/api/tasks/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const { task: updated } = await handle(res);
  return updated;
};

export const deleteTask = async (id) => {
  const res = await fetch(`${API}/api/tasks/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handle(res);
};