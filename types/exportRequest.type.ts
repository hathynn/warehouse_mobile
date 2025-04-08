// types/exportRequest.type.ts
export enum ExportRequestStatus {
  PROCESSING = "PROCESSING", // Đang xử lý
  CHECKING = "CHECKING", // Đang kiểm kho
  CHECKED = "CHECKED", // Đã kiểm kho
  WAITING_EXPORT = "WAITING_EXPORT", // Chờ xuất hàng
  COMPLETED = "COMPLETED", // Đã hoàn thành
  CANCELLED = "CANCELLED", // Đã hủy
}

export type ExportRequestType = {
  exportRequestId: string;
  exportReason?: string;
  status: ExportRequestStatus;
};
