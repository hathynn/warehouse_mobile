export interface ImportOrderDetailType {
  id: string;
  import_order_id: string;
  item_id: string;
  expected_quantity: number;
  actual_quantity: number;
  status: ImportOrderDetailStatus;
}

export enum ImportOrderDetailStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  COMPLETED = "Completed",
}
