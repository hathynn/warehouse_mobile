import { RootState } from "@/redux/store";
import useAccountService from "@/services/useAccountService";
import useStaffTaskService from "@/services/useStaffTaskService";
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

  const importCount = taskOfStaffPerDate?.importOrderIds?.length || 0;
  const exportCount = taskOfStaffPerDate?.exportRequestIds?.length || 0;
  const stockCheckCount = taskOfStaffPerDate?.stockCheckIds?.length || 0;

  const tasks = [
    {
      id: 1,
      title: "Đơn Nhập Hàng",
      subtitle: "Kiểm đếm và xử lý đơn nhập kho",
      icon: "download" as const,
      gradient: ["#1677ff", "#0ea5e9"],
      pending: importCount,
      description: `${importCount} đơn nhập chờ xử lý`,
      screen: "/import" as const,
    },
    {
      id: 2,
      title: "Phiếu Xuất Hàng",
      subtitle: "Kiểm đếm và xử lý yêu cầu xuất kho",
      icon: "cloud-upload" as const,
      gradient: ["#1677ff", "#0ea5e9"],
      pending: exportCount,
      description: `${exportCount} phiếu xuất chờ xử lý`,
      screen: "/export" as const,
    },
    {
      id: 3,
      title: "Phiếu Kiểm Kho",
      subtitle: "Thực hiện kiểm tra tồn kho",
      icon: "clipboard" as const,
      gradient: ["#1677ff", "#0ea5e9"],
      pending: stockCheckCount,
      description: `${stockCheckCount} yêu cầu kiểm kho mới`,
      screen: "/stock-check" as const,
    },
  ];

  type ValidScreen = "/import" | "/export" | "/stock-check";

  const handleTaskPress = (screen: ValidScreen) => {
    router.push(screen);
  };

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
            <Text style={styles.sectionTitle}>Công việc hôm nay</Text>
            <Text style={styles.sectionSubtitle}>
              Bạn có {tasks.reduce((total, task) => total + task.pending, 0)}{" "}
              công việc cần hoàn thành
            </Text>
          </View>

          {/* Task Cards */}
          <View style={styles.taskContainer}>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => handleTaskPress(task.screen)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8fafc']}
                  style={styles.taskCardGradient}
                >
                  <View style={styles.taskContent}>
                    <View style={styles.taskLeft}>
                      <LinearGradient
                        colors={task.gradient} 
                        style={styles.taskIcon}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                      >
                        <Ionicons 
                          name={task.icon} 
                          size={28} 
                          color="white" 
                        />
                      </LinearGradient>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <Text style={styles.taskSubtitle}>{task.subtitle}</Text>
                        <LinearGradient
                          colors={task.gradient}
                          style={styles.taskStatus}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 0}}
                        >
                          <Text style={styles.taskStatusText}>
                            {task.description}
                          </Text>
                        </LinearGradient>
                      </View>
                    </View>
                    <View style={styles.taskRight}>
                      <LinearGradient
                        colors={task.gradient}
                        style={styles.taskPendingBadge}
                      >
                        <Text style={styles.taskPending}>{task.pending}</Text>
                      </LinearGradient>
                      <Text style={styles.taskPendingLabel}>Chờ xử lý</Text>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color="#9CA3AF" 
                      />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Stats */}
          {/* <LinearGradient
            colors={['#ffffff', '#f8fafc']}
            style={styles.statsCard}
          >
            <View style={styles.statsHeader}>
              <Ionicons name="analytics-outline" size={24} color="#1677ff" />
              <Text style={styles.statsTitle}>Thống kê nhanh</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['#1677ff', '#0ea5e9']}
                  style={styles.statCircle}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                </LinearGradient>
                <Text style={styles.statNumber}>
                  {importCount + exportCount + stockCheckCount}
                </Text>
                <Text style={styles.statLabel}>Hôm nay</Text>
              </View>
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['#0ea5e9', '#0284c7']}
                  style={styles.statCircle}
                >
                  <Ionicons name="time" size={20} color="white" />
                </LinearGradient>
                <Text style={styles.statNumber}>
                  {Math.max(importCount, exportCount, stockCheckCount)}
                </Text>
                <Text style={styles.statLabel}>Ưu tiên</Text>
              </View>
              <View style={styles.statItem}>
                <LinearGradient
                  colors={['#0284c7', '#1d4ed8']}
                  style={styles.statCircle}
                >
                  <Ionicons name="trending-up" size={20} color="white" />
                </LinearGradient>
                <Text style={styles.statNumber}>
                  {staffTaskLoading ? '...' : '98%'}
                </Text>
                <Text style={styles.statLabel}>Hiệu suất</Text>
              </View>
            </View>
          </LinearGradient> */}
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
  sectionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
  },
  taskContainer: {
    gap: 16,
  },
  taskCard: {
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  taskCardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  taskSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 10,
    lineHeight: 20,
  },
  taskStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  taskStatusText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  taskRight: {
    alignItems: "center",
    gap: 4,
  },
  taskPendingBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  taskPending: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  taskPendingLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 8,
    fontWeight: "500",
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 8,
  },
  statCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
});

export default MainDashboard;
