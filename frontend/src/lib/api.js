import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });
http.defaults.maxContentLength = Infinity;
http.defaults.maxBodyLength = Infinity;

export const projectsApi = {
  list: () => http.get("/projects").then((r) => r.data),
  create: (data) => http.post("/projects", data).then((r) => r.data),
  get: (id) => http.get(`/projects/${id}`).then((r) => r.data),
  update: (id, data) => http.patch(`/projects/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/projects/${id}`).then((r) => r.data),
};

export const areasApi = {
  list: (projectId) => http.get(`/projects/${projectId}/areas`).then((r) => r.data),
  create: (projectId, data) => http.post(`/projects/${projectId}/areas`, data).then((r) => r.data),
  update: (projectId, areaId, data) => http.patch(`/projects/${projectId}/areas/${areaId}`, data).then((r) => r.data),
  remove: (projectId, areaId) => http.delete(`/projects/${projectId}/areas/${areaId}`).then((r) => r.data),
};

export const linesApi = {
  list: (projectId) => http.get(`/projects/${projectId}/lines`).then((r) => r.data),
  create: (projectId, data) => http.post(`/projects/${projectId}/lines`, data).then((r) => r.data),
  update: (projectId, lineId, data) => http.patch(`/projects/${projectId}/lines/${lineId}`, data).then((r) => r.data),
  remove: (projectId, lineId) => http.delete(`/projects/${projectId}/lines/${lineId}`).then((r) => r.data),
};

export const deliveriesApi = {
  add: (projectId, data) => http.post(`/projects/${projectId}/deliveries`, data).then((r) => r.data),
  remove: (projectId, deliveryId) => http.delete(`/projects/${projectId}/deliveries/${deliveryId}`).then((r) => r.data),
};

export const backgroundApi = {
  get: (projectId) => http.get(`/projects/${projectId}/background`).then((r) => r.data),
  put: (projectId, data) => http.put(`/projects/${projectId}/background`, data).then((r) => r.data),
  patch: (projectId, data) => http.patch(`/projects/${projectId}/background`, data).then((r) => r.data),
  remove: (projectId) => http.delete(`/projects/${projectId}/background`).then((r) => r.data),
};
