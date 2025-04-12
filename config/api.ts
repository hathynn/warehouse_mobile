import axios from "axios";

const api = axios.create({
  baseURL: "https://warehouse-backend-jlcj5.ondigitalocean.app",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default api;
