import axios from "axios";
import * as FileSystem from 'expo-file-system';

export const usePaperService = () => {
  const createPaper = async (paperData: any) => {
    try {
      const formData = new FormData();
  
      formData.append("id", paperData.id || "");
      formData.append("description", paperData.description || "");
      formData.append("importOrderId", paperData.importOrderId.toString());
      formData.append("exportRequestId", paperData.exportRequestId || "");
      const saveBase64ToFile = async (base64: string, filename: string) => {
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, base64.split(',')[1], {
          encoding: FileSystem.EncodingType.Base64,
        });
        return path;
      };
      const signProviderPath = await saveBase64ToFile(paperData.signProviderUrl, "chuki1.jpg");
      const signWarehousePath = await saveBase64ToFile(paperData.signWarehouseUrl, "chuki2.jpg");
  
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
  
      const response = await axios.post(
        "https://warehouse-backend-jlcj5.ondigitalocean.app/paper",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      console.log("✅ Paper Created:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Lỗi tạo paper:", error.message || error);
      return null;
    }
  };
  

  const getPaperById = async (id: number | string) => {
    try {
      const response = await axios.get(`https://warehouse-backend-jlcj5.ondigitalocean.app/paper/${id}`);
      return response.data.content;
    } catch (error: any) {
      console.error("❌ Lỗi lấy chứng từ:", error.message || error);
      return null;
    }
  };

  return { createPaper, getPaperById };
};

