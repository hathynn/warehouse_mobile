import { useState, useCallback } from "react";
import axios from "axios";

const BASE_URL = "https://warehouse-backend-q6ibz.ondigitalocean.app/paper";

const usePaperService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Kiểm tra nếu dữ liệu là Base64
  const isBase64 = (data: string) => data.startsWith("data:image/");

  // 🔹 Chuyển Base64 thành Blob
  const base64ToBlob = (base64: string): Blob => {
    const [prefix, data] = base64.split(",");
    const mime = prefix.match(/:(.*?);/)?.[1] || "image/png"; // Lấy MIME type
    const byteCharacters = atob(data);
    const byteNumbers = new Uint8Array(byteCharacters.length).map((_, i) =>
      byteCharacters.charCodeAt(i)
    );
    return new Blob([byteNumbers], { type: mime });
  };

  // ✅ Hàm tạo paper
  const createPaper = useCallback(
    async (paperData: {
      signProviderUrl: string | Blob; // Có thể là Base64 hoặc Blob
      signWarehouseUrl: string | Blob;
      description?: string;
      importOrderId: number;
      exportRequestId?: number;
    }) => {
      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();

        // Chuyển Base64 thành Blob nếu cần
        const signProviderBlob =
          typeof paperData.signProviderUrl === "string" &&
          isBase64(paperData.signProviderUrl)
            ? base64ToBlob(paperData.signProviderUrl)
            : (paperData.signProviderUrl as Blob); // Đảm bảo là Blob

        const signWarehouseBlob =
          typeof paperData.signWarehouseUrl === "string" &&
          isBase64(paperData.signWarehouseUrl)
            ? base64ToBlob(paperData.signWarehouseUrl)
            : (paperData.signWarehouseUrl as Blob); // Đảm bảo là Blob

        // Thêm dữ liệu vào FormData
        formData.append(
          "signProviderUrl",
          signProviderBlob,
          "provider_signature.png"
        );
        formData.append(
          "signWarehouseUrl",
          signWarehouseBlob,
          "warehouse_signature.png"
        );
        if (paperData.description) {
          formData.append("description", paperData.description);
        }
        formData.append("importOrderId", String(paperData.importOrderId));
        if (paperData.exportRequestId) {
          formData.append("exportRequestId", String(paperData.exportRequestId));
        }

        // Gửi API
        const response = await axios.post(BASE_URL, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        return response.data;
      } catch (err: any) {
        console.error("Lỗi khi tạo paper:", err);
        setError(err.response?.data?.message || "Lỗi khi tạo paper");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, createPaper };
};

export default usePaperService;

// import { useState, useCallback } from "react";
// import axios from "axios";

// const BASE_URL = "https://warehouse-backend-q6ibz.ondigitalocean.app/paper";

// const usePaperService = () => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // ✅ Hàm tạo paper
//   const createPaper = useCallback(
//     async (paperData: {
//       signProviderUrl: Blob;
//       signWarehouseUrl: Blob;
//       description?: string;
//       importOrderId: number;
//       exportRequestId?: number;
//     }) => {
//       setLoading(true);
//       setError(null);

//       try {
//         const formData = new FormData();
//         formData.append("signProviderUrl", paperData.signProviderUrl);
//         formData.append("signWarehouseUrl", paperData.signWarehouseUrl);
//         if (paperData.description) {
//           formData.append("description", paperData.description);
//         }
//         formData.append("importOrderId", String(paperData.importOrderId));
//         if (paperData.exportRequestId) {
//           formData.append("exportRequestId", String(paperData.exportRequestId));
//         }

//         const response = await axios.post(BASE_URL, formData, {
//           headers: {
//             "Content-Type": "multipart/form-data",
//           },
//         });

//         return response.data;
//       } catch (err) {
//         console.error("Lỗi khi tạo paper:", err);
//         setError("Lỗi khi tạo paper");
//         return null;
//       } finally {
//         setLoading(false);
//       }
//     },
//     []
//   );

//   return { loading, error, createPaper };
// };

// export default usePaperService;
