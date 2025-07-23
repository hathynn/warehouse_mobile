import { useState, useCallback } from "react";
import api from "../config/api"; // axios instance

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

interface CallApiOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>; // ✅ Thêm params vào options
}

const useApi = () => {
  const [loading, setIsLoading] = useState<boolean>(false);

  const callApi = useCallback(
    async (
      method: HttpMethod,
      url: string,
      data?: any,
      options?: CallApiOptions,
      message?: string
    ) => {
      try {
        setIsLoading(true);
        console.log(`→ [API] ${method.toUpperCase()} ${url}`);

        // Khởi tạo header cơ bản
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...options?.headers,
        };

        // Nếu data là FormData, bỏ Content-Type để Axios tự thêm boundary
        if (data instanceof FormData) {
          delete headers["Content-Type"];
        }

        // ✅ Tạo config hoàn chỉnh với params
        const axiosConfig = { 
          headers,
          ...(options?.params && { params: options.params }) // Thêm params nếu có
        };

        if (method === "get" || method === "delete") {
          // ✅ Với GET/DELETE, data có thể chứa params
          if (data && typeof data === 'object' && data.params) {
            axiosConfig.params = { ...axiosConfig.params, ...data.params };
          }
          
          const response = await api[method]<any>(url, axiosConfig);
          if (message) console.log(message);
          return response.data;
        } else {
          // POST/PUT/PATCH dùng (url, data, config)
          const response = await api[method]<any>(url, data, axiosConfig);
          if (message) console.log(message);
          return response.data;
        }
      } catch (error: any) {
        console.error("← [API ERROR]", error.response?.status, error.message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { loading, callApi, setIsLoading };
};

export default useApi;