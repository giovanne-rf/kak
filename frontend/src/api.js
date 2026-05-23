const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function assetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

async function request(path, options = {}) {
  const token = localStorage.getItem("condotech_token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const fallbackMessage =
      response.status === 502
        ? "Backend indisponivel. Verifique se a API iniciou no servidor."
        : `Nao foi possivel concluir a operacao (${response.status})`;
    throw new Error(data?.detail || fallbackMessage);
  }

  return data;
}

export const api = {
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request("/api/me"),
  dashboard: () => request("/api/dashboard"),
  listBuildings: () => request("/api/buildings"),
  createBuilding: (formData) =>
    request("/api/buildings", {
      method: "POST",
      body: formData,
    }),
  listUsers: () => request("/api/users"),
  createUser: (payload) =>
    request("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listEquipments: () => request("/api/equipments"),
  createEquipment: (payload) =>
    request("/api/equipments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
