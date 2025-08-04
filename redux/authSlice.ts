import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  role: string;
  token_type: string;
  email: string;
  sub: string;
  iat: number;
  exp: number;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    email: string;
    role: string;
    id: string;
  } | null;
  isLoggedIn: boolean;
  isLoggingOut: boolean;
  isRestoring: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoggedIn: false,
  isLoggingOut: false,
  isRestoring: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string }>
    ) => {
      try {
        const { access_token, refresh_token } = action.payload;

        if (!access_token || !refresh_token) {
          console.error("Invalid tokens provided to login action");
          return;
        }

        const decoded: DecodedToken = jwtDecode(access_token);

        // Validate decoded token has required fields
        if (!decoded.email || !decoded.role || !decoded.sub) {
          console.error("Invalid token structure - missing required fields");
          return;
        }

        state.accessToken = access_token;
        state.refreshToken = refresh_token;
        state.user = {
          email: decoded.email,
          role: decoded.role,
          id: decoded.sub,
        };
        state.isLoggedIn = true;
        state.isLoggingOut = false;
        state.isRestoring = false;
      } catch (error) {
        console.error("Error decoding JWT token in login:", error);
        // Reset state on error
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.isLoggedIn = false;
      }
    },

    setToken: (
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string }>
    ) => {
      try {
        const { access_token, refresh_token } = action.payload;

        if (!access_token || !refresh_token) {
          console.error("Invalid tokens provided to setToken action");
          return;
        }

        const decoded: DecodedToken = jwtDecode(access_token);

        // Validate decoded token has required fields
        if (!decoded.email || !decoded.role || !decoded.sub) {
          console.error("Invalid token structure - missing required fields");
          return;
        }

        state.accessToken = access_token;
        state.refreshToken = refresh_token;
        state.user = {
          email: decoded.email,
          role: decoded.role,
          id: decoded.sub,
        };
      } catch (error) {
        console.error("Error decoding JWT token in setToken:", error);
        // Don't reset state here as this might be called during token refresh
      }
    },

    startLogout: (state) => {
      state.isLoggingOut = true;
    },

    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isLoggedIn = false;
      state.isLoggingOut = false;
      state.isRestoring = false;

    },

    startRestore: (state) => {
      state.isRestoring = true;
    },


    restoreAuthState: (
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string }>
    ) => {
      try {
        const { access_token, refresh_token } = action.payload;

        if (!access_token || !refresh_token) {
          console.error("Invalid tokens provided to restoreAuthState");
          return;
        }

        const decoded: DecodedToken = jwtDecode(access_token);

        if (!decoded.email || !decoded.role || !decoded.sub) {
          console.error("Invalid token structure during restore - missing required fields");
          return;
        }


        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
          console.error("Token expired during restore");
          return;
        }

        state.accessToken = access_token;
        state.refreshToken = refresh_token;
        state.user = {
          email: decoded.email,
          role: decoded.role,
          id: decoded.sub,
        };
        state.isLoggedIn = true;
        state.isLoggingOut = false;
        state.isRestoring = false;

        console.log("Auth state restored successfully");
      } catch (error) {
        console.error("Error restoring auth state:", error);
        // Reset state on error
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.isLoggedIn = false;
        state.isLoggingOut = false;
        state.isRestoring = false;
      }
    },
  },
});

export const { login, logout, setToken, startLogout, restoreAuthState, startRestore } = authSlice.actions;

export default authSlice.reducer;
