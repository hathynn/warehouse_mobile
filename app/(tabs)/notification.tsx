import { useRouter } from "expo-router";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  FlatList,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Mock data cho notifications
const mockNotifications = [
  {
    id: 1,
    title: "Đơn nhập #12345 cần kiểm đếm",
    message: "Đơn nhập hàng mới đã được tạo và cần được kiểm đếm",
    time: "2 phút trước",
    type: "import",
    isRead: false,
  },
  {
    id: 2,
    title: "Đơn nhập #12344 đã hoàn tất",
    message: "Đơn nhập hàng đã được xác nhận và hoàn tất thành công",
    time: "1 giờ trước",
    type: "success",
    isRead: true,
  },
  {
    id: 3,
    title: "Cập nhật hệ thống",
    message: "Hệ thống đã được cập nhật với các tính năng mới",
    time: "3 giờ trước",
    type: "system",
    isRead: false,
  },
  {
    id: 4,
    title: "Đơn nhập #12343 cần xác nhận",
    message: "Đơn nhập đã được kiểm đếm và chờ xác nhận từ quản lý",
    time: "5 giờ trước",
    type: "pending",
    isRead: true,
  },
];

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Đếm số thông báo chưa đọc
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Đánh dấu một thông báo đã đọc
  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // Lấy icon theo loại thông báo
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

  // Render notification item
  const renderNotificationItem = ({ item }: { item: any }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, item.isRead && styles.readCard]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${icon.color}15` },
            ]}
          >
            <Ionicons name={icon.name} size={24} color={icon.color} />
          </View>

          {/* Nội dung */}
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.notificationTitle,
                item.isRead && styles.readTitle,
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.notificationMessage,
                item.isRead && styles.readMessage,
              ]}
              numberOfLines={2}
            >
              {item.message}
            </Text>
            <Text
              style={[styles.notificationTime, item.isRead && styles.readTime]}
            >
              {item.time}
            </Text>
          </View>

          {/* Chấm đỏ cho thông báo chưa đọc */}
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* StatusBar */}
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>

      {/* Summary */}
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

      {/* Notifications List */}
      {notifications.length === 0 ? (
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
    opacity: 0.6,
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
  },
});
