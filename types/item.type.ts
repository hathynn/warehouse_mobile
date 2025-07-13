export interface ItemType {
  id: string; 
  name: string;
  description?: string;
  measurementUnit: string; 
  measurementValue: number;
  totalMeasurementValue: number;
  quantity: number;
  unitType: string;
  daysUntilDue: number;
  minimumStockQuantity: number;
  maximumStockQuantity: number;
  categoryId: number;
  providerIds: number[];
  importOrderDetailIds: number[];
  importRequestDetailIds: number[];
  exportRequestDetailIds: number[];
  inventoryItemIds: string[];
  numberOfAvailableItems: number;
}
