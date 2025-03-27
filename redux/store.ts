import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/authSlice"; // Đảm bảo đường dẫn đúng
import productReducer from "@/redux/productSlice"; // Đảm bảo đường dẫn đúng
import paperReducer from "@/redux/paperSlice"; // Đảm bảo đường dẫn đúng

export const store = configureStore({
  reducer: {
    auth: authReducer,
    product: productReducer,
    paper: paperReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
