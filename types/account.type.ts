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

export enum AccountRole {
  DEPARTMENT = "ROLE_DEPARTMENT",
  STAFF = "ROLE_STAFF",
  ADMIN = "ROLE_ADMIN",
  WAREHOUSE_MANAGER = "ROLE_WAREHOUSE_MANAGER",
  ACCOUNTING = "ROLE_ACCOUNTING",
}
