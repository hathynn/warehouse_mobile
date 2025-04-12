import api from "@/config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";

const useApiService = () => {
  const [loading, setIsLoading] = useState<boolean>(false);

  const callApi = useCallback(
    async (
      method: "get" | "post" | "put" | "delete",
      url: string,
      data?: any,
      config: any = {}
    ) => {
      try {
        setIsLoading(true);

        const token = await AsyncStorage.getItem("access_token");
        if (token) {
          config.headers = {
            ...(config.headers || {}),
            Authorization: `Bearer ${token}`,
          };
        } else {
          console.warn("⚠️ Không tìm thấy token");
        }

        // console.log("➡️ Gọi API:", { method, url, headers: config.headers });

        const response =
          method === "get" || method === "delete"
            ? await api[method](url, config)
            : await api[method](url, data, config);

        if (!response || !response.data) {
          console.warn("⚠️ API không trả về dữ liệu hợp lệ");
          return undefined;
        }

        return response.data;
      } catch (error: any) {
        console.error(
          "API Error:",
          error.response?.data || error.message || error
        );
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { loading, callApi, setIsLoading };
};

export default useApiService;
