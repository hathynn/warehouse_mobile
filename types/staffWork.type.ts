export interface StaffTasksPerDate {
    date: string;
    staffId: number;
    priorityTaskIds: string[];
    importOrderIds?: string[];
    exportRequestIds?: string[];
    stockCheckIds?: string[];
}
