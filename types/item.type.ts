export interface ItemType {
  id: number; 
  name: string;
  description?: string;
  measurementUnit: string; 
  totalMeasurementValue: number;
  unitType: string; 
  daysUntilDue: number; 
  minimumStockQuantity: number; 
  maximumStockQuantity: number; 
  categoryId: number; 
  providerId: number;
  importOrderDetailIds: number[];
  importRequestDetailIds: number[];
  exportRequestDetailIds: number[];
  inventoryItemIds: number[];
}
