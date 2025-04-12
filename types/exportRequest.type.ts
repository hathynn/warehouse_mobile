export enum ExportRequestTypeEnum {
  BORROWING = "BORROWING",
  RETURN = "RETURN",
  LIQUIDDATION = "LIQUIDATION",
  PARTIAL = "PARTIAL",
  PRODUCTION = "PRODUCTION",
  // Các loại khác có thể được bổ sung thêm tại đây
}

// types/exportRequest.type.ts
export enum ExportRequestStatus {
  NOT_STARTED = "NOT_STARTED", // Chưa bắt đầu
  PROCESSING = "PROCESSING", // Đang xử lý
  CHECKING = "CHECKING", // Đang kiểm kho
  CHECKED = "CHECKED", // Đã kiểm kho
  WAITING_EXPORT = "WAITING_EXPORT", // Chờ xuất hàng
  COMPLETED = "COMPLETED", // Đã hoàn thành
  CANCELLED = "CANCELLED", // Đã hủy
}

export interface ExportRequestType {
  exportRequestId: number;
  exportReason: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string | null;
  departmentId: number;
  providerId: number | null;
  status: ExportRequestStatus | null;
  type: ExportRequestTypeEnum;
  exportDate: string;
  exportTime: string;
  expectedReturnDate: string;
  assignedWareHouseKeeperId: number | null;
  paperId: number | null;
  importRequestIds: number[];
  exportRequestDetailIds: number[];
  createdBy: string;
  updatedBy: string | null;
  createdDate: string;
  updatedDate: string | null;
}
