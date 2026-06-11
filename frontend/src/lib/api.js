import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

export const projectsApi = {
  list: () => http.get("/projects").then((r) => r.data),
  create: (data) => http.post("/projects", data).then((r) => r.data),
  get: (id) => http.get(`/projects/${id}`).then((r) => r.data),
  update: (id, data) => http.patch(`/projects/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/projects/${id}`).then((r) => r.data),
};

export const areasApi = {
  list: (projectId) => http.get(`/projects/${projectId}/areas`).then((r) => r.data),
  create: (projectId, data) =>
    http.post(`/projects/${projectId}/areas`, data).then((r) => r.data),
  remove: (projectId, areaId) =>
    http.delete(`/projects/${projectId}/areas/${areaId}`).then((r) => r.data),
};
