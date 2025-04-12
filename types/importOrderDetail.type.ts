export interface ImportOrderDetailType {
  importOrderDetailId: number;
  importOrderId: number;
  itemId: number;
  itemName: string;
  expectQuantity: number;
  actualQuantity: number;
  status: ImportOrderDetailStatus | null;
}

export enum ImportOrderDetailStatus {
  LACK = "LACK",
  LESS = "LESS",
  MATCH = "MATCH",
}
