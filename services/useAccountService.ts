import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { login, logout } from "@/redux/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginAccount } from "@/types/loginAccount.type";
import useApiService from "./useApi";

const useAccountService = () => {
  const { loading, callApi, setIsLoading } = useApiService();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);

  const loginUser = useCallback(
    async (loginData: loginAccount) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await callApi("post", "/account/login", loginData);

        const { access_token, refresh_token } = response?.content || {};

        if (access_token && refresh_token) {
          await AsyncStorage.setItem("access_token", access_token);
          await AsyncStorage.setItem("refresh_token", refresh_token);

          dispatch(login({ access_token, refresh_token }));
        }

        return response;
      } catch (e: any) {
        console.error("Lỗi khi đăng nhập:", e);
        setError("Đăng nhập thất bại, vui lòng thử lại.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, dispatch, setIsLoading]
  );

  const logoutUser = useCallback(async () => {
    await AsyncStorage.removeItem("access_token");
    await AsyncStorage.removeItem("refresh_token");
    dispatch(logout());
  }, [dispatch]);

  return {
    loading,
    error,
    loginUser,
    logoutUser,
  };
};

export default useAccountService;
