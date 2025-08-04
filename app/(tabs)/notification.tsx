import { useRouter, useFocusEffect } from "expo-router";
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback, useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import useNotificationService, {
  NotificationResponse,
} from "@/services/useNotificationService";
import { PusherContext } from "@/contexts/pusher/PusherContext";
import { EXPORT_REQUEST_ASSIGNED_EVENT, IMPORT_ORDER_ASSIGNED_EVENT } from "@/constants/channelsNEvents";

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " năm trước";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " tháng trước";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " ngày trước";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " giờ trước";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " phút trước";
  }
  return "Vừa xong";
};

const getNotificationTypeFromContent = (content: string): string => {
  if (!content) return "default";
  const lowerContent = content.toLowerCase();
  if (
    lowerContent.includes("cần kiểm đếm") ||
    lowerContent.includes("đơn nhập hàng mới")
  ) {
    return "import";
  }
  if (lowerContent.includes("đã hoàn tất")) {
    return "success";
  }
  if (lowerContent.includes("cập nhật hệ thống")) {
    return "system";
  }
  if (lowerContent.includes("cần xác nhận")) {
    return "pending";
  }
  if (lowerContent.includes("báo cáo")) {
    return "report";
  }
  return "default";
};

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;
  const { getAllNotifications, clickNotification, viewAllNotifications, loading: isLoading } = useNotificationService();
  const { latestNotification } = useContext(PusherContext);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      return;
    }
    const response = await getAllNotifications(Number(userId));
    if (
      response.statusCode >= 200 &&
      response.statusCode < 300 &&
      Array.isArray(response.content)
    ) {
      setNotifications(response.content);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      if (userId) {
        viewAllNotifications(Number(userId)).catch(error => {
          console.error('Failed to mark all notifications as viewed:', error);
        });
      }
    }, [userId])
  );

  useEffect(() => {
    if (latestNotification) {
      fetchNotifications();
    }
  }, [latestNotification]);

  const handleNotificationPress = async (notification: NotificationResponse) => {
    if (!notification.isClicked) {
      try {
        await clickNotification(notification.id);
        await fetchNotifications();
      } catch (error) {
        console.error("Failed to mark notification as clicked:", error);
      }
    }
    if (notification.eventType === IMPORT_ORDER_ASSIGNED_EVENT) {
      router.push(`/import/detail/${notification.objectId}`);
    }
    else if (notification.eventType === EXPORT_REQUEST_ASSIGNED_EVENT) {
      router.push(`/export/export-detail/${notification.objectId}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isClicked).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "import":
        return { name: "cube-outline", color: "#1677ff" };
      case "success":
        return { name: "checkmark-circle-outline", color: "#4CAF50" };
      case "system":
        return { name: "settings-outline", color: "#FF9800" };
      case "pending":
        return { name: "time-outline", color: "#213448" };
      case "report":
        return { name: "document-text-outline", color: "#9C27B0" };
      default:
        return { name: "notifications-outline", color: "#666" };
    }
  };

  const renderNotificationItem = ({
    item,
  }: {
    item: NotificationResponse;
  }) => {
    const type = getNotificationTypeFromContent(item.content);
    const icon = getNotificationIcon(type);
    const iconName = icon.name as keyof typeof Ionicons.glyphMap;

    return (
      <TouchableOpacity
        style={[styles.notificationCard, item.isClicked && styles.readCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${icon.color}15` },
            ]}
          >
            <Ionicons name={iconName} size={24} color={icon.color} />
          </View>

          <View style={styles.textContainer}>
            <Text
              style={[
                styles.notificationTitle,
                item.isClicked && styles.readTitle,
              ]}
            >
              {item.content}
            </Text>
            <Text
              style={[
                styles.notificationTime,
                item.isClicked && styles.readTime,
              ]}
            >
              {formatTimeAgo(item.createdDate)}
            </Text>
          </View>

          {!item.isClicked && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>

      {unreadCount > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryContent}>
            <Ionicons name="notifications" size={20} color="#1677ff" />
            <Text style={styles.summaryText}>
              Bạn có {unreadCount} thông báo chưa đọc
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1677ff" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={60} color="#BDBDBD" />
          <Text style={styles.emptyText}>Bạn chưa có thông báo nào</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchNotifications}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    backgroundColor: "#1677ff",
    paddingBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  summaryContainer: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    color: "#757575",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  notificationCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  readCard: {
    opacity: 0.7,
  },
  notificationContent: {
    flexDirection: "row",
    padding: 16,
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1677ff",
    marginBottom: 4,
  },
  readTitle: {
    fontWeight: "500",
    color: "#333",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 6,
  },
  readMessage: {
    color: "#999",
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  readTime: {
    color: "#bbb",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1677ff",
    marginTop: 4,
    marginLeft: 8,
  },
});
