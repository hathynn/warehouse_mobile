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
  COUNTED = "COUNTED"
}

// export interface ExportRequestType {
//   exportRequestId: number;
//   exportReason: string;
//   receiverName: string;
//   receiverPhone: string;
//   receiverAddress: string | null;
//   departmentId: number;
//   providerId: number | null;
//   status: ExportRequestStatus | null;
//   type: ExportRequestTypeEnum;
//   exportDate: string;
//   exportTime: string;
//   expectedReturnDate: string;
//   assignedWareHouseKeeperId: number | null;
//   paperId: number | null;
//   importRequestIds: number[];
//   exportRequestDetailIds: number[];
//   createdBy: string;
//   updatedBy: string | null;
//   createdDate: string;
//   updatedDate: string | null;
// }

export interface ExportRequestType {
  exportRequestId: number; 
  exportDate: string;
  exportTime: string;
  assignedWareHouseKeeperId: number | null;
  countingStaffId: number;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  updatedBy: string;
  exportReason: string;
  receiverAddress: string | null;
  receiverName: string;
  receiverPhone: string;
  status: ExportRequestStatus;
  type: ExportRequestTypeEnum;
  countingDate: string;
  countingTime: string;
  paperId: number | null;
  importRequestIds: number[];
  exportRequestDetailIds: number[];
  departmentId: number;
  providerId: number | null;
}
