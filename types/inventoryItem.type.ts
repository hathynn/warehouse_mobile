export enum InventoryItemStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  NEED_LIQUID = "NEED_LIQUID",
}

export interface InventoryItem {
  id: string;
  reasonForDisposal: string | null;
  measurementValue: number;
  status: InventoryItemStatus | null; // ✅ enum
  expiredDate: string; 
  importedDate: string;
  updatedDate: string; 
  parentId: string | null;
  childrenIds: number[];
  itemId: string; 
  itemName: string;
  itemCode: string | null;
  exportRequestDetailId: number | null;
  importOrderDetailId: number;
  storedLocationId: number | null;
  storedLocationName: string | null;
  isTrackingForExport: boolean;
}
