import { RootState } from "@/redux/store";
import useAccountService from "@/services/useAccountService";
import useStaffTaskService from "@/services/useStaffTaskService";
import useImportOrder from "@/services/useImportOrderService";
import useExportRequest from "@/services/useExportRequestService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
const formatDate = (date) => {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const { width } = Dimensions.get("window");

const MainDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { getAccountByEmail } = useAccountService();
  const { 
    taskOfStaffPerDate, 
    fetchTaskOfStaffToday, 
    loading: staffTaskLoading 
  } = useStaffTaskService();
  
  const { fetchImportOrderById } = useImportOrder();
  const { fetchExportRequestById } = useExportRequest();

  const authState = useSelector((state: RootState) => state.auth);
  const { user: authUser, isLoggedIn, isLoggingOut, isRestoring } = authState;
  const email = authUser?.email;
  const [user, setUser] = useState({
    name: "",
    email: email || "",
    phone: "",
    avatar:
      "https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg",
    coverPhoto: "https://via.placeholder.com/500x200/2176FF/FFFFFF",
  });

  useEffect(() => {
    const fetchUser = async () => {
      // Don't fetch user data if logging out, restoring, or not properly authenticated
      if (!email || !authUser || isLoggingOut || isRestoring || !isLoggedIn) {
        console.log("HomeScreen: Skipping user fetch", {
          hasEmail: !!email,
          hasAuthUser: !!authUser,
          isLoggingOut,
          isRestoring,
          isLoggedIn
        });
        return;
      }

      try {
        console.log("HomeScreen: Fetching user data for", email);
        const res = await getAccountByEmail(email);
        if (res?.content) {
          setUser((prev) => ({
            ...prev,
            name: res.content.fullName,
            email: res.content.email,
            phone: res.content.phone || "",
          }));
        }
      } catch (error) {
        console.log("HomeScreen: Error fetching user data:", error);
      }
    };
    fetchUser();
  }, [email, authUser, isLoggingOut, isRestoring, isLoggedIn]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch staff tasks for today
  useEffect(() => {
    if (authUser?.id && isLoggedIn && !isLoggingOut && !isRestoring) {
      console.log("🏠 Home: Fetching staff tasks for user ID:", authUser.id);
      fetchTaskOfStaffToday(authUser.id);
    }
  }, [authUser?.id, isLoggedIn, isLoggingOut, isRestoring, fetchTaskOfStaffToday]);

  // Debug: Log staff task data when it changes
  useEffect(() => {
    if (taskOfStaffPerDate) {
      console.log("🏠 Home - Staff tasks per date:", taskOfStaffPerDate);
      console.log("🎯 Priority task IDs:", taskOfStaffPerDate.priorityTaskIds);
      console.log("📦 Export request IDs:", taskOfStaffPerDate.exportRequestIds);
      console.log("📥 Import order IDs:", taskOfStaffPerDate.importOrderIds);
      console.log("📋 Stock check IDs:", taskOfStaffPerDate.stockCheckIds);
    }
  }, [taskOfStaffPerDate]);

  const formatTime = (date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const router = useRouter();

  const goToImport = () => {
    router.push("/import"); // Điều hướng đến (tabs)/import.tsx
  };

  const goToExport = () => {
    router.push("/export"); // Điều hướng đến (tabs)/export.tsx
  };

  const [filteredOrderItems, setFilteredOrderItems] = useState([]);
  const [importCount, setImportCount] = useState(0);
  const [exportCount, setExportCount] = useState(0);
  const [stockCheckCount, setStockCheckCount] = useState(0);

  // Filter orders by status and create order items using priorityTaskIds
  useEffect(() => {
    const filterOrders = async () => {
      if (!taskOfStaffPerDate || !taskOfStaffPerDate.priorityTaskIds) return;
      
      const orderItems = [];
      let importFilteredCount = 0;
      let exportFilteredCount = 0;
      let stockFilteredCount = 0;
      
      // Process each priority task ID and determine its type
      for (const taskId of taskOfStaffPerDate.priorityTaskIds) {
        try {
          // Try to identify task type by attempting to fetch from different services
          let taskProcessed = false;

          // Try as import order first
          if (!taskProcessed) {
            try {
              const order = await fetchImportOrderById(taskId);
              if (order) {
                // Skip COMPLETED and STORED orders
                if (order.status !== 'COMPLETED' && order.status !== 'STORED') {
                  orderItems.push({
                    id: `import_${taskId}`,
                    type: "import",
                    title: `Đơn Nhập Hàng #${taskId}`,
                    subtitle: "Kiểm đếm và xử lý đơn nhập kho",
                    icon: "download" as const,
                    gradient: ["#1677ff", "#0ea5e9"],
                    priority: "high",
                    screen: `/import/detail/${taskId}`,
                    orderId: taskId,
                    status: order.status,
                  });
                  importFilteredCount++;
                }
                taskProcessed = true;
              }
            } catch (error) {
              // Not an import order, continue to next type
            }
          }

          // Try as export request if not processed
          if (!taskProcessed) {
            try {
              await fetchExportRequestById(taskId);
              // fetchExportRequestById sets the exportRequest in state but doesn't return it
              // We need to access it from the service's state or make an assumption that it exists
              // For now, we'll add the task and let the UI handle the display
              orderItems.push({
                id: `export_${taskId}`,
                type: "export",
                title: `Phiếu Xuất Hàng #${taskId}`,
                subtitle: "Kiểm đếm và xử lý yêu cầu xuất kho",
                icon: "arrow-up-circle" as const,
                gradient: ["#1677ff", "#0ea5e9"],
                priority: "high",
                screen: `/export/export-detail/${taskId}`,
                orderId: taskId,
              });
              exportFilteredCount++;
              taskProcessed = true;
            } catch (error) {
              // Not an export request, continue to next type
            }
          }

          // If not processed as import or export, assume it's a stock check
          if (!taskProcessed) {
            orderItems.push({
              id: `stock_${taskId}`,
              type: "stock_check",
              title: `Phiếu Kiểm Kho #${taskId}`,
              subtitle: "Thực hiện kiểm tra tồn kho",
              icon: "clipboard" as const,
              gradient: ["#1677ff", "#0ea5e9"],
              priority: "medium",
              screen: `/stock-check/detail/${taskId}`,
              orderId: taskId,
            });
            stockFilteredCount++;
          }
        } catch (error) {
          console.log(`Error processing task ID ${taskId}:`, error);
        }
      }

      setFilteredOrderItems(orderItems);
      setImportCount(importFilteredCount);
      setExportCount(exportFilteredCount);
      setStockCheckCount(stockFilteredCount);
    };

    filterOrders();
  }, [taskOfStaffPerDate, fetchImportOrderById, fetchExportRequestById]);

  const handleOrderPress = (screen: string) => {
    router.push(screen);
  };

  // Separate filtered orders by priority
  const highPriorityOrders = filteredOrderItems.filter(item => item.priority === "high");
  const mediumPriorityOrders = filteredOrderItems.filter(item => item.priority === "medium");

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header with Solid Blue */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color="white" />
            </View>
            <View style={styles.userText}>
              <Text style={styles.greeting}>Xin chào, {user.name || 'User'}</Text>
              <Text style={styles.subGreeting}>
                Chúc bạn một ngày làm việc hiệu quả
              </Text>
            </View>
          </View>
        </View>

        {/* Date Section */}
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={18} color="white" />
          <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Ionicons name="list" size={24} color="#1e293b" />
              <Text style={styles.sectionTitle}>Danh sách công việc hôm nay</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              {filteredOrderItems.length > 0 
                ? `Bạn có ${filteredOrderItems.length} đơn hàng cần xử lý hôm nay`
                : "Tuyệt vời! Bạn đã hoàn thành tất cả công việc hôm nay"}
            </Text>
          </View>

          {/* High Priority Orders */}
          {highPriorityOrders.length > 0 && (
            <View style={styles.prioritySection}>
              <View style={styles.priorityHeader}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.priorityTitle}>Ưu tiên cao - Nhập/Xuất hàng</Text>
                <Text style={styles.priorityCount}>({highPriorityOrders.length})</Text>
              </View>
              {highPriorityOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, styles.urgentCard]}
                  onPress={() => handleOrderPress(order.screen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.orderContent}>
                    <View style={styles.orderLeft}>
                      <LinearGradient
                        colors={order.gradient}
                        style={styles.orderIcon}
                      >
                        <Ionicons name={order.icon} size={20} color="white" />
                      </LinearGradient>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderTitle}>{order.title}</Text>
                        <Text style={styles.orderSubtitle}>{order.subtitle}</Text>
                        <View style={styles.orderMeta}>
                          <Ionicons name="time-outline" size={14} color="#64748b" />
                          <Text style={styles.orderTime}>Cần xử lý ngay</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.orderRight}>
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentText}>Cần xử lý</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Medium Priority Orders */}
          {mediumPriorityOrders.length > 0 && (
            <View style={styles.prioritySection}>
              <View style={styles.priorityHeader}>
                <Ionicons name="time" size={20} color="#f59e0b" />
                <Text style={styles.priorityTitle}>Ưu tiên vừa - Kiểm kho</Text>
                <Text style={styles.priorityCount}>({mediumPriorityOrders.length})</Text>
              </View>
              {mediumPriorityOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => handleOrderPress(order.screen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.orderContent}>
                    <View style={styles.orderLeft}>
                      <LinearGradient
                        colors={order.gradient}
                        style={styles.orderIcon}
                      >
                        <Ionicons name={order.icon} size={20} color="white" />
                      </LinearGradient>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderTitle}>{order.title}</Text>
                        <Text style={styles.orderSubtitle}>{order.subtitle}</Text>
                        <View style={styles.orderMeta}>
                          <Ionicons name="calendar-outline" size={14} color="#64748b" />
                          <Text style={styles.orderTime}>Trong ngày hôm nay</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.orderRight}>
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty State */}
          {filteredOrderItems.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
              <Text style={styles.emptyTitle}>Hoàn thành!</Text>
              <Text style={styles.emptySubtitle}>
                Bạn đã xử lý xong tất cả công việc hôm nay
              </Text>
            </View>
          )}

          {/* Compact Count Overview */}
          <View style={styles.countOverview}>
            <View style={styles.overviewHeader}>
              <Ionicons name="bar-chart-outline" size={20} color="#1e293b" />
              <Text style={styles.overviewTitle}>Tổng quan nhanh</Text>
            </View>
            <View style={styles.countGrid}>
              <View style={styles.countItem}>
                <LinearGradient
                  colors={["#1677ff", "#0ea5e9"]}
                  style={styles.countCircle}
                >
                  <Text style={styles.countNumber}>{importCount}</Text>
                </LinearGradient>
                <Text style={styles.countLabel}>Nhập hàng</Text>
              </View>
              <View style={styles.countItem}>
                <LinearGradient
                  colors={["#1677ff", "#0ea5e9"]}
                  style={styles.countCircle}
                >
                  <Text style={styles.countNumber}>{exportCount}</Text>
                </LinearGradient>
                <Text style={styles.countLabel}>Xuất hàng</Text>
              </View>
              <View style={styles.countItem}>
                <LinearGradient
                  colors={["#1677ff", "#0ea5e9"]}
                  style={styles.countCircle}
                >
                  <Text style={styles.countNumber}>{stockCheckCount}</Text>
                </LinearGradient>
                <Text style={styles.countLabel}>Kiểm kho</Text>
              </View>
              <View style={styles.countItem}>
                <LinearGradient
                  colors={["#1677ff", "#0ea5e9"]}
                  style={styles.countCircle}
                >
                  <Text style={styles.countNumber}>
                    {importCount + exportCount + stockCheckCount}
                  </Text>
                </LinearGradient>
                <Text style={styles.countLabel}>Tổng cộng</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    backgroundColor: "#1677ff",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  userText: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  dateText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  sectionSubtitle: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
  },
  prioritySection: {
    marginBottom: 24,
  },
  priorityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  priorityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  priorityCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  orderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#e5e7eb",
  },
  urgentCard: {
    borderLeftColor: "#ef4444",
    backgroundColor: "#fefefe",
  },
  orderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  orderSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
  },
  orderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderTime: {
    fontSize: 12,
    color: "#64748b",
  },
  orderRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  urgentBadge: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  urgentText: {
    fontSize: 10,
    color: "#dc2626",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
  countOverview: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  countGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  countItem: {
    alignItems: "center",
    flex: 1,
  },
  countCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  countNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  countLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
  },
});

export default MainDashboard;
