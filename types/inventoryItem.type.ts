export interface InventoryItem {
  id: string;
  reasonForDisposal: string | null;
  measurementValue: number;
  status: string | null;
  expiredDate: string; 
  importedDate: string;
  updatedDate: string; 
  parentId: number | null;
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
