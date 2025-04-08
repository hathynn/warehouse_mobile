// services/useExportRequestService.ts
import {
  ExportRequestType,
  ExportRequestStatus,
} from "../types/exportRequest.type";

const fakeExportRequests: ExportRequestType[] = [
  {
    exportRequestId: "E001",
    status: ExportRequestStatus.PROCESSING,
  },
  {
    exportRequestId: "E002",
    status: ExportRequestStatus.CHECKING,
  },
  {
    exportRequestId: "E003",
    status: ExportRequestStatus.CHECKED,
  },
  {
    exportRequestId: "E004",
    status: ExportRequestStatus.WAITING_EXPORT,
  },
  {
    exportRequestId: "E005",
    status: ExportRequestStatus.COMPLETED,
  },
  {
    exportRequestId: "E006",
    status: ExportRequestStatus.CANCELLED,
  },
];

export default function useExportRequest() {
  // Fake API trả về dữ liệu sau 1 giây delay
  const fetchExportRequests = async (): Promise<ExportRequestType[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(fakeExportRequests);
      }, 1000);
    });
  };

  return { fetchExportRequests };
}
