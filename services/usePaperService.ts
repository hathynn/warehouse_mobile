import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import api from "../config/api";

const usePaperService = () => {
  const createPaper = useCallback(async (paperData: any) => {
    try {

      // 1. Chuẩn bị FormData
      const formData = new FormData();
      // Only append ID if it exists and is not empty
      if (paperData.id && paperData.id.toString().trim()) {
        formData.append("id", paperData.id.toString());
      }
      formData.append("description", paperData.description || "");

      // Debug: Show all available IDs in Redux state
      console.log("📋 Redux state contains IDs:", {
        exportRequestId: paperData.exportRequestId || null,
        stockCheckRequestId: paperData.stockCheckRequestId || null,
        importOrderId: paperData.importOrderId || null
      });

      // Only append ONE ID based on operation priority: export > stock > import
      // This prevents backend errors when multiple IDs are present in redux
      if (paperData.exportRequestId) {
        console.log("📋 Creating EXPORT paper with exportRequestId:", paperData.exportRequestId);
        console.log("📋 Ignoring other IDs:", {
          stockCheckRequestId: paperData.stockCheckRequestId || "none",
          importOrderId: paperData.importOrderId || "none"
        });
        formData.append("exportRequestId", paperData.exportRequestId);
      } else if (paperData.stockCheckRequestId) {
        console.log("📋 Creating STOCK CHECK paper with stockCheckRequestId:", paperData.stockCheckRequestId);
        console.log("📋 Ignoring other IDs:", {
          exportRequestId: "none",
          importOrderId: paperData.importOrderId || "none"
        });
        formData.append("stockCheckRequestId", paperData.stockCheckRequestId);
      } else if (paperData.importOrderId) {
        console.log("📋 Creating IMPORT paper with importOrderId:", paperData.importOrderId);
        console.log("📋 Ignoring other IDs:", {
          exportRequestId: "none",
          stockCheckRequestId: "none"
        });
        formData.append("importOrderId", paperData.importOrderId);
      } else {
        console.warn("❌ No valid operation ID found for paper creation");
        throw new Error("Thiếu thông tin đơn hàng để tạo phiếu");
      }
      formData.append("signProviderName", paperData.signProviderName || "");
      formData.append("signReceiverName", paperData.signReceiverName || "");

      // 2. Hàm helper để xử lý base64 hoặc file://
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
        paperData.signReceiverUrl,
        "chuki2.jpg"
      );

      //       console.log("✅ Path1:", signProviderPath);
      // console.log("✅ Path2:", signWarehousePath);

      formData.append("signProviderUrl", {
        uri: signProviderPath,
        type: "image/jpeg",
        name: "chuki1.jpg",
      } as any);

      formData.append("signReceiverUrl", {
        uri: signWarehousePath,
        type: "image/jpeg",
        name: "chuki2.jpg",
      } as any);

      // 3. Gọi API với configured api instance
      console.log("📤 Making createPaper API request to /paper");
      console.log("📋 FormData contents:");
      for (let [key, value] of formData.entries()) {
        if (typeof value === 'object' && value !== null && 'uri' in value) {
          console.log(`  ${key}: [File] ${(value as any).uri} (${(value as any).type})`);
        } else {
          console.log(`  ${key}:`, value);
        }
      }

      const response = await api.post("/paper", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("📥 API Response status:", response.status);
      console.log("📥 API Response data:", response.data);
      
      if (!response.data) {
        console.error("❌ API returned empty response data");
        console.error("❌ Full response object:", response);
      }

      return response.data;
    } catch (error: any) {
      console.error("❌ Lỗi tạo paper - Full error:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      console.error("❌ Error message:", error.message);
      return null;
    }
  }, []);

  const getPaperById = useCallback(async (id: number | string) => {
    try {
      const response = await api.get(`/paper/${id}`);
      return response.data?.content;
    } catch (error: any) {
      console.error(
        "❌ Lỗi lấy chứng từ:",
        error.response?.data || error.message
      );
      return null;
    }
  }, []);

  const resetPaperById = useCallback(async (paperId: number | string) => {
    try {
      const response = await api.put(`/paper/reset/${paperId}`, {});
      return response.data;
    } catch (error: any) {
      console.error(
        "❌ Lỗi reset paper:",
        error.response?.data || error.message
      );
      return null;
    }
  }, []);

  return { createPaper, getPaperById, resetPaperById };
};

export default usePaperService;
