export interface AccountResponse {
    content: AccountContent;
    details: string[];
    statusCode: number;
    metaDataDTO: any; // hoặc null nếu bạn muốn rõ ràng
  }
  
  export interface AccountContent {
    id: number;
    email: string;
    phone: string;
    fullName: string;
    status: "ACTIVE" | "INACTIVE" | string;
    isEnable: boolean;
    isBlocked: boolean;
    role: "STAFF" | "MANAGER" | "ADMIN" | string;
    totalActualWorkingTimeOfRequestInDay: number | null;
    totalExpectedWorkingTimeOfRequestInDay: number | null;
    importOrderIds: number[];
    exportRequestIds: number[];
  }
  