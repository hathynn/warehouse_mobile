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
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string }>
    ) => {
      const { access_token, refresh_token } = action.payload;
      const decoded: DecodedToken = jwtDecode(access_token);

      state.accessToken = access_token;
      state.refreshToken = refresh_token;
      state.user = {
        email: decoded.email,
        role: decoded.role,
        id: decoded.sub,
      };
      state.isLoggedIn = true;
    },

    setToken: (
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string }>
    ) => {
      const { access_token, refresh_token } = action.payload;
      const decoded: DecodedToken = jwtDecode(access_token);

      state.accessToken = access_token;
      state.refreshToken = refresh_token;
      state.user = {
        email: decoded.email,
        role: decoded.role,
        id: decoded.sub,
      };
    },

    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isLoggedIn = false;
    },
  },
});

export const { login, logout, setToken } = authSlice.actions;
export default authSlice.reducer;
