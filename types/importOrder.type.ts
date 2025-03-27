export interface ImportOrderType {
  importOrderId: number;
  importRequestId: number;
  dateReceived: string;
  timeReceived: string;
  note: string;
  status: ImportOrderStatus | null;
  importOrderDetailIds: number[];
  createdBy: string;
  updatedBy: string | null;
  createdDate: string;
  updatedDate: string | null;
  paperIds: number[] | null;
  assignedWareHouseKeeperId: number;
}

export enum ImportOrderStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  COMPLETED = "Completed"
}
