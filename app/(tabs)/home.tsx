const formatDate = (date) => {
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
import { RootState } from "@/redux/store";
import useAccountService from "@/services/useAccountService";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

const { width } = Dimensions.get("window");

const MainDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { getAccountByEmail } = useAccountService();

  const email = useSelector((state: RootState) => state.auth.user?.email);
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
      if (email) {
        const res = await getAccountByEmail(email);
        if (res?.content) {
          setUser((prev) => ({
            ...prev,
            name: res.content.fullName,
            email: res.content.email,
            phone: res.content.phone || "",
          }));
        }
      }
    };
    fetchUser();
  }, [email]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const tasks = [
    {
      id: 1,
      title: "Đơn Nhập Hàng",
      subtitle: "Quản lý và xử lý đơn nhập kho",
      icon: "📦",
      color: "#3B82F6",
      pending: 5,
      description: "5 đơn nhập chờ xử lý",
      screen: "/import" as const,
    },
    {
      id: 2,
      title: "Phiếu Xuất Hàng",
      subtitle: "Xử lý yêu cầu xuất kho",
      icon: "📋",
      color: "#10B981",
      pending: 3,
      description: "3 phiếu xuất chờ duyệt",
      screen: "/export" as const,
    },
    {
      id: 3,
      title: "Yêu Cầu Kiểm Kho",
      subtitle: "Thực hiện kiểm tra tồn kho",
      icon: "🔍",
      color: "#F59E0B",
      pending: 2,
      description: "2 yêu cầu kiểm kho mới",
      screen: "/export" as const,
    },
  ];

  type ValidScreen = "/import" | "/export";

  const handleTaskPress = (screen: ValidScreen) => {
    router.push(screen);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.userText}>
              <Text style={styles.greeting}>Xin chào, {user.name}</Text>
              <Text style={styles.subGreeting}>
                Chúc bạn một ngày làm việc hiệu quả
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Date Section */}
      <View style={styles.dateSection}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar" size={17} color="white" />
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
                activeOpacity={0.7}
              >
                <View style={styles.taskContent}>
                  <View style={styles.taskLeft}>
                    <View
                      style={[styles.taskIcon, { backgroundColor: task.color }]}
                    >
                      <Text style={styles.taskIconText}>{task.icon}</Text>
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <Text style={styles.taskSubtitle}>{task.subtitle}</Text>
                      <View style={styles.taskStatus}>
                        <Text style={styles.taskStatusText}>
                          {task.description}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.taskRight}>
                    <Text style={styles.taskPending}>{task.pending}</Text>
                    <Text style={styles.taskPendingLabel}>Chờ xử lý</Text>
                    <Text style={styles.chevronIcon}>▶</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Stats */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Thống kê nhanh</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: "#3B82F6" }]}>
                  12
                </Text>
                <Text style={styles.statLabel}>Hoàn thành</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: "#F59E0B" }]}>
                  10
                </Text>
                <Text style={styles.statLabel}>Đang xử lý</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: "#10B981" }]}>
                  95%
                </Text>
                <Text style={styles.statLabel}>Hiệu suất</Text>
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
    backgroundColor: "#F5F7FA",
  },
  header: {
    backgroundColor: "#1677ff",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  userText: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  subGreeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  dateSection: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateContainer: {
    gap: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  dateIcon: {
    fontSize: 16,
    marginRight: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  taskContainer: {
    gap: 16,
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
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
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  taskIconText: {
    fontSize: 28,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  taskSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  taskStatus: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  taskStatusText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
  },
  taskRight: {
    alignItems: "center",
  },
  taskPending: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  taskPendingLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  chevronIcon: {
    fontSize: 16,
    color: "#9CA3AF",
    transform: [{ rotate: "90deg" }],
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
});

export default MainDashboard;
