export enum ExportRequestTypeEnum {
  BORROWING = "BORROWING",
  RETURN = "RETURN",
  LIQUIDDATION = "LIQUIDATION",
  PARTIAL = "PARTIAL",
  PRODUCTION = "PRODUCTION",
}

// types/exportRequest.type.ts
export enum ExportRequestStatus {
  NOT_STARTED = "NOT_STARTED",        // Chưa bắt đầu
  IN_PROGRESS = "IN_PROGRESS",        // Đang xử lý (sau khi đã assign nhân viên kiểm kho)
  COUNTED = "COUNTED",                // Đã kiểm đếm (do nhân viên kiểm kho xác nhận xong)
  COUNT_CONFIRMED = "COUNT_CONFIRMED",
  // Đã xác nhận kiểm đếm (trưởng kho xác nhận)
  CONFIRMED = "CONFIRMED",
  WAITING_EXPORT = "WAITING_EXPORT",  // Chờ xuất kho (phòng ban xác nhận ngày khách đến lấy)
  COMPLETED = "COMPLETED",            // Đã hoàn tất
  CANCELLED = "CANCELLED"             // Đã hủy
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
  exportRequestId: string; 
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
