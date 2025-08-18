export interface ImportRequestType {
  importRequestId: number;
  importReason: string;
  importType: ImportRequestTypeEnum;
  status: ImportRequestStatus;
  providerId: number;
  exportRequestId?: number | null;
  departmentId?: number | null;
  importRequestDetailIds: number[];
  importOrdersId: number[];
  createdBy: string;
  updatedBy: string;
  createdDate: string;
  updatedDate: string;
}

export enum ImportRequestStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ImportRequestTypeEnum {
  ORDER = "ORDER"
}
