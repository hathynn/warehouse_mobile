import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const usePaperService = () => {
  const createPaper = useCallback(
    async (paperData: any) => {
      try {
        // 1. Đọc accessToken từ AsyncStorage
        const token = await AsyncStorage.getItem("access_token");
        if (!token) {
          throw new Error("Không tìm thấy access token");
        }

        // 2. Chuẩn bị FormData
        const formData = new FormData();
        formData.append("id", paperData.id || "");
        formData.append("description", paperData.description || "");
        if (paperData.importOrderId) {
          formData.append("importOrderId", paperData.importOrderId);
        }
        if (paperData.exportRequestId) {
          formData.append("exportRequestId", paperData.exportRequestId);
        }

        // 3. Hàm helper để xử lý base64 hoặc file://
        const processImageInput = async (input: string, filename: string) => {
          if (!input) throw new Error("Thiếu ảnh chữ ký");

          if (input.startsWith("data:image")) {
            // Là base64 → ghi ra file
            const base64 = input.split(",")[1];
            const path = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.writeAsStringAsync(path, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return path;
          }

          if (input.startsWith("file://")) {
            // Đường dẫn từ ImagePicker
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

        // 4. Gọi Axios với header Authorization
        const response = await axios.post(
          "https://warehouse-backend-jlcj5.ondigitalocean.app/paper",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        return response.data;
      } catch (error: any) {
        console.error("❌ Lỗi tạo paper:", error.response?.data || error.message);
        return null;
      }
    },
    []
  );

  const getPaperById = useCallback(
    async (id: number | string) => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) throw new Error("Không tìm thấy access token");

        const response = await axios.get(
          `https://warehouse-backend-jlcj5.ondigitalocean.app/paper/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        return response.data?.content;
      } catch (error: any) {
        console.error("❌ Lỗi lấy chứng từ:", error.response?.data || error.message);
        return null;
      }
    },
    []
  );

  return { createPaper, getPaperById };
};

export default usePaperService;
