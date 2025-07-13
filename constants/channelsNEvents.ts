// Channel names must match the ones in NotificationUtil.java
// These are public channel names
export const WAREHOUSE_MANAGER_CHANNEL = 'notifications-WAREHOUSE_MANAGER';
export const DEPARTMENT_CHANNEL = 'notifications-DEPARTMENT';
export const ACCOUNTING_CHANNEL = 'notifications-ACCOUNTING';
export const ADMIN_CHANNEL = 'notifications-ADMIN';
export const STAFF_CHANNEL = 'notifications-STAFF';

// Private channel names - prepend 'private-' to conform with Pusher's private channel naming convention
export const PRIVATE_WAREHOUSE_MANAGER_CHANNEL = `private-${WAREHOUSE_MANAGER_CHANNEL}`;
export const PRIVATE_DEPARTMENT_CHANNEL = `private-${DEPARTMENT_CHANNEL}`;
export const PRIVATE_ACCOUNTING_CHANNEL = `private-${ACCOUNTING_CHANNEL}`;
export const PRIVATE_ADMIN_CHANNEL = `private-${ADMIN_CHANNEL}`;
export const PRIVATE_STAFF_CHANNEL = `private-${STAFF_CHANNEL}`;

// Events
export const IMPORT_ORDER_CREATED_EVENT = 'import-order-created';
export const IMPORT_ORDER_COUNTED_EVENT = 'import-order-counted';
export const IMPORT_ORDER_CONFIRMED_EVENT = 'import-order-confirmed';
export const IMPORT_ORDER_CANCELLED_EVENT = 'import-order-cancelled';
export const IMPORT_ORDER_EXTENDED_EVENT = 'import-order-extended';
export const IMPORT_ORDER_COMPLETED_EVENT = 'import-order-completed';
export const IMPORT_ORDER_ASSIGNED_EVENT = 'import-order-assigned';
export const EXPORT_REQUEST_CREATED_EVENT = 'export-request-created';
export const EXPORT_REQUEST_COUNTED_EVENT = 'export-request-counted';
export const EXPORT_REQUEST_CONFIRMED_EVENT = 'export-request-confirmed';
export const EXPORT_REQUEST_CANCELLED_EVENT = 'export-request-cancelled';
export const EXPORT_REQUEST_EXTENDED_EVENT = 'export-request-extended';
export const EXPORT_REQUEST_COMPLETED_EVENT = 'export-request-completed';
export const EXPORT_REQUEST_ASSIGNED_EVENT = 'export-request-assigned';

// Static events - events that don't have dynamic IDs
export const staticAppEvents = [
  IMPORT_ORDER_CREATED_EVENT,
  IMPORT_ORDER_CONFIRMED_EVENT,
  IMPORT_ORDER_CANCELLED_EVENT,
  IMPORT_ORDER_EXTENDED_EVENT,
  IMPORT_ORDER_COMPLETED_EVENT,
  IMPORT_ORDER_ASSIGNED_EVENT,
  EXPORT_REQUEST_CREATED_EVENT,
  EXPORT_REQUEST_CONFIRMED_EVENT,
  EXPORT_REQUEST_CANCELLED_EVENT,
  EXPORT_REQUEST_EXTENDED_EVENT,
  EXPORT_REQUEST_COMPLETED_EVENT,
  EXPORT_REQUEST_ASSIGNED_EVENT
];

// Dynamic events - events that have dynamic IDs appended
export const dynamicAppEvents = [
  IMPORT_ORDER_COUNTED_EVENT,
  EXPORT_REQUEST_COUNTED_EVENT
];