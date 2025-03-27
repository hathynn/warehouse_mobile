export interface ImportRequestType {
  importRequestId: number;
  importReason: string;
  importType: ImportRequestTypeEnum;
  status: ImportRequestStatus;
  providerId: number;
  exportRequestId?: number | null;
  importRequestDetailIds: number[];
  importOrdersId: number[];
  createdBy: string;
  updatedBy: string;
  createdDate: string;
  updatedDate: string;
}

export enum ImportRequestStatus {
  NOT_STARTED = "NOT_STARTED"
}

export enum ImportRequestTypeEnum {
  ORDER = "ORDER"
}
