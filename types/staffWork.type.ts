export interface StaffTasksPerDate {
    date: string;
    staffId: number;
    importOrderIds: string[];
    exportRequestIds: string[];
    stockCheckIds: string[];
}
