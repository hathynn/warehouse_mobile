import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import useApiService from "./useApi";

const usePaperService = () => {
  const { callApi, setIsLoading } = useApiService();

  const createPaper = useCallback(
    async (paperData: any) => {
      try {
        const formData = new FormData();

        formData.append("id", paperData.id || "");
        formData.append("description", paperData.description || "");
        formData.append("importOrderId", paperData.importOrderId || "");
        formData.append("exportRequestId", paperData.exportRequestId || "");

        // ✨ Xử lý linh hoạt cả base64 và file://
        const processImageInput = async (input: string, filename: string) => {
          if (!input) throw new Error("Thiếu ảnh chữ ký");
          
          if (input.startsWith("data:image")) {
            // Là base64 → tách ra và ghi vào file
            const base64 = input.split(",")[1];
            const path = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.writeAsStringAsync(path, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return path;
          }

          if (input.startsWith("file://")) {
            // Là đường dẫn ảnh từ ImagePicker
            return input;
          }

          throw new Error("Dữ liệu ảnh không hợp lệ");
        };

        const signProviderPath = await processImageInput(
          paperData.signProviderUrl,
          "chuki1.jpg"
        );
        const signWarehousePath = await processImageInput(
          paperData.signWarehouseUrl,
          "chuki2.jpg"
        );

        formData.append("signProviderUrl", {
          uri: signProviderPath,
          name: "chuki1.jpg",
          type: "image/jpeg",
        } as any);

        formData.append("signWarehouseUrl", {
          uri: signWarehousePath,
          name: "chuki2.jpg",
          type: "image/jpeg",
        } as any);

        const response = await callApi("post", "/paper", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        console.log("✅ Paper Created:", response);
        return response;
      } catch (error: any) {
        console.error("❌ Lỗi tạo paper:", error.message || error);
        return null;
      }
    },
    [callApi]
  );

  const getPaperById = useCallback(
    async (id: number | string) => {
      try {
        const response = await callApi("get", `/paper/${id}`);
        return response?.content;
      } catch (error: any) {
        console.error("❌ Lỗi lấy chứng từ:", error.message || error);
        return null;
      }
    },
    [callApi]
  );

  return { createPaper, getPaperById };
};

export default usePaperService;
