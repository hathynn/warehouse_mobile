import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const api = axios.create({
  baseURL: "https://warehouse-backend-jlcj5.ondigitalocean.app",
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

const refreshToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await AsyncStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(
      "https://warehouse-backend-jlcj5.ondigitalocean.app/account/refresh",
      { refresh_token: refreshToken }
    );

    const { access_token, refresh_token: newRefreshToken } = response.data.content;

    if (access_token && newRefreshToken) {
      await AsyncStorage.setItem("access_token", access_token);
      await AsyncStorage.setItem("refresh_token", newRefreshToken);
      return access_token;
    }

    throw new Error("Invalid refresh response");
  } catch (error) {
    console.log("Token refresh failed:", error);
    // Clear tokens on refresh failure
    await AsyncStorage.removeItem("access_token");
    await AsyncStorage.removeItem("refresh_token");
    return null;
  }
};

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("access_token");
    if (token) {
      // Check if token is expired before making request
      if (isTokenExpired(token)) {
        console.log("Token expired, attempting refresh...");
        const newToken = await refreshToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
        } else {
          // Redirect to login or handle auth failure
          throw new Error("Authentication failed - please login again");
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();
        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          processQueue(new Error("Token refresh failed"), null);
          // Redirect to login
          throw new Error("Authentication failed - please login again");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
