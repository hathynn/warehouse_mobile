import { ReactNode, useEffect, useRef, useState } from "react";
import { NotificationEvent, PusherContext, PusherContextType } from "./PusherContext";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { createPusherClient } from "@/config/pusher";
import { IMPORT_ORDER_CREATED_EVENT, IMPORT_ORDER_COUNTED_EVENT, IMPORT_ORDER_CONFIRMED_EVENT, IMPORT_ORDER_COMPLETED_EVENT, IMPORT_ORDER_EXTENDED_EVENT, IMPORT_ORDER_CANCELLED_EVENT, IMPORT_ORDER_ASSIGNED_EVENT, PRIVATE_STAFF_CHANNEL } from "../../constants/channelsNEvents";
import { PRIVATE_ACCOUNTING_CHANNEL } from "../../constants/channelsNEvents";
import { PRIVATE_DEPARTMENT_CHANNEL } from "../../constants/channelsNEvents";
import { PRIVATE_ADMIN_CHANNEL } from "../../constants/channelsNEvents";
import { PRIVATE_WAREHOUSE_MANAGER_CHANNEL } from "../../constants/channelsNEvents";
import { AccountRole } from "../../types/account.type";


export function getChannelForRole(userRole: AccountRole, accountId: number): string | null {
  switch (userRole) {
      case AccountRole.WAREHOUSE_MANAGER:
          return PRIVATE_WAREHOUSE_MANAGER_CHANNEL;
      case AccountRole.DEPARTMENT:
          return PRIVATE_DEPARTMENT_CHANNEL;
      case AccountRole.ACCOUNTING:
          return PRIVATE_ACCOUNTING_CHANNEL;
      case AccountRole.ADMIN:
          return PRIVATE_ADMIN_CHANNEL;
      case AccountRole.STAFF:
          return PRIVATE_STAFF_CHANNEL + "-" + accountId;
      default:
          return null;
  }
}

export const PusherProvider = ({ children }: { children: ReactNode }) => {
  const [latestNotification, setLatestNotification] = useState<NotificationEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { user, isLoggedIn } = useSelector((state: RootState) => state.auth);

  // Create Pusher instance only once
  const pusherRef = useRef<any>(null);
  const channelRef = useRef<any>(null);

  // Handler for notification events
  const handleNotificationEvent = (data: any, eventType: string) => {
    console.log("handleNotificationEvent", data, eventType);
    setLatestNotification({ type: eventType, data, timestamp: Date.now() });
  };

  useEffect(() => {
    // Only set up Pusher if user is authenticated and has a role
    if (!isLoggedIn || !user) {
      // Clean up existing connection if user is not authenticated
      if (pusherRef.current) {
        if (channelRef.current) {
          channelRef.current.unbind_all();
          pusherRef.current.unsubscribe(channelRef.current.name);
          channelRef.current = null;
        }
        pusherRef.current.disconnect();
        pusherRef.current = null;
        setIsConnected(false);
      }
      return undefined;
    }

    // Determine Pusher channel for this role
    const channelName = getChannelForRole(user.role as AccountRole, Number(user.id));

    try {
      // Create Pusher instance if it doesn't exist
      if (!pusherRef.current) {
        pusherRef.current = createPusherClient();

        pusherRef.current.connection.bind('connected', () => {
          setIsConnected(true);
          setConnectionError(null);
        });

        pusherRef.current.connection.bind('disconnected', () => {
          setIsConnected(false);
        });

        pusherRef.current.connection.bind('error', (error: any) => {
          setConnectionError(`Connection error: ${error.message || 'Unknown error'}`);
          setIsConnected(false);
        });
      }

      // Subscribe to the channel and bind events
      const channel = pusherRef.current.subscribe(channelName);
      console.log("channelName", channelName);
      channelRef.current = channel;
      channel.bind('pusher:subscription_succeeded', () => {
        setConnectionError(null);
      });
      channel.bind('pusher:subscription_error', (error: any) => {
        setConnectionError(`Subscription error: ${error.message || 'Unknown error'}`);
      });
      channel.bind(IMPORT_ORDER_CREATED_EVENT, (data: any) => handleNotificationEvent(data, IMPORT_ORDER_CREATED_EVENT));
      channel.bind(IMPORT_ORDER_COUNTED_EVENT, (data: any) => handleNotificationEvent(data, IMPORT_ORDER_COUNTED_EVENT));
      channel.bind(IMPORT_ORDER_CONFIRMED_EVENT, (data: any) => handleNotificationEvent(data, IMPORT_ORDER_CONFIRMED_EVENT));
      channel.bind(IMPORT_ORDER_CANCELLED_EVENT, (data: any) => handleNotificationEvent(data, IMPORT_ORDER_CANCELLED_EVENT));
      channel.bind(IMPORT_ORDER_EXTENDED_EVENT, (data: any) => handleNotificationEvent(data, IMPORT_ORDER_EXTENDED_EVENT));
      channel.bind(IMPORT_ORDER_COMPLETED_EVENT, (data: any) => handleNotificationEvent(data, IMPORT_ORDER_COMPLETED_EVENT));
      channel.bind(IMPORT_ORDER_ASSIGNED_EVENT, (data: any) => handleNotificationEvent(data, IMPORT_ORDER_ASSIGNED_EVENT));
    } catch (error) {
      setConnectionError(`Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusherRef.current?.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [user, isLoggedIn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, []);

  const contextValue: PusherContextType = {
    latestNotification,
    isConnected,
    connectionError,
  };

  return (
    <PusherContext.Provider value={contextValue}>
      {children}
    </PusherContext.Provider>
  );
};