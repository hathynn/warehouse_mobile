export interface ImportOrderType {
  importOrderId: string;
  importRequestId: number;
  dateReceived: string;
  timeReceived: string;
  note: string;
  status: ImportOrderStatus | null;
  importOrderDetailIds: string[];
  createdBy: string;
  updatedBy: string | null;
  createdDate: string;
  updatedDate: string | null;
  paperIds: number[] | null;
  assignedWareHouseKeeperId: number;
}

export enum ImportOrderStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  COUNTED = "COUNTED",
  CONFIRMED="CONFIRMED",
  READY_TO_STORE="READY_TO_STORE",
  STORED="STORED"
}
