import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { login, logout } from "@/redux/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginAccount } from "@/types/loginAccount.type";
import useApiService from "./useApi";
import { AccountResponse } from "@/types/account.type";

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
        // console.log("Lỗi khi đăng nhập:", e);
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

  const getAccountByEmail = useCallback(
    async (email: string): Promise<AccountResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const encodedEmail = encodeURIComponent(email);
        const response = await callApi("get", `/account/by-email?email=${encodedEmail}`);
        return response as AccountResponse;
      } catch (e: any) {
        console.log("Lỗi khi lấy thông tin tài khoản:", e);
        setError("Không thể lấy thông tin tài khoản.");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  return {
    loading,
    error,
    loginUser,
    logoutUser,
    getAccountByEmail
  };
};

export default useAccountService;
