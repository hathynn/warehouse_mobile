import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TextInput,
  StyleSheet,
  FlatList,
} from "react-native";
import {
  useQuery,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, ReactNode } from "react";
import useExportRequest from "@/services/useExportRequestService";
import {
  ExportRequestStatus,
  ExportRequestType,
} from "@/types/exportRequest.type";
import { useDispatch, useSelector } from "react-redux";
import { setPaperData } from "@/redux/paperSlice";
import { RootState } from "@/redux/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePusherContext } from "@/contexts/pusher/PusherContext";
import {
  EXPORT_REQUEST_CREATED_EVENT,
  EXPORT_REQUEST_COUNTED_EVENT,
  EXPORT_REQUEST_CONFIRMED_EVENT,
  EXPORT_REQUEST_CANCELLED_EVENT,
  EXPORT_REQUEST_COMPLETED_EVENT,
  EXPORT_REQUEST_ASSIGNED_EVENT,
  EXPORT_REQUEST_EXTENDED_EVENT,
  EXPORT_REQUEST_IN_PROGRESS_EVENT,
  EXPORT_REQUEST_COUNT_CONFIRMED_EVENT,
  EXPORT_REQUEST_WAITING_EXPORT_EVENT,
  EXPORT_REQUEST_STATUS_CHANGED_EVENT
} from "@/constants/channelsNEvents";

const queryClient = new QueryClient();

interface StatusTab {
  key: string;
  title: string;
  status: ExportRequestStatus | "ALL";
  count: number;
  roles?: string[];
}

// Component hiển thị thông tin với icon
const InfoRow = ({
  icon,
  title,
  value,
}: {
  icon?: string;
  title: string;
  value: ReactNode;
}) => (
  <View style={styles.infoRow}>
    {icon && (
      <Ionicons name={icon} size={16} color="#666" style={styles.infoIcon} />
    )}
    <Text style={styles.infoLabel}>{title}</Text>
    <View style={styles.infoValue}>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.infoValueText}>{value}</Text>
      ) : (
        value
      )}
    </View>
  </View>
);

// Component Status Badge
const StatusBadge = ({ status }: { status: ExportRequestStatus }) => {
  const getStatusInfo = () => {
    switch (status) {
      case ExportRequestStatus.IN_PROGRESS:
        return {
          label: "Cần kiểm đếm",
          color: "#FFF",
          bgColor: "#1677ff",
        };
      case ExportRequestStatus.COUNTED:
        return {
          label: "Đã đóng gói",
          color: "#FFF",
          bgColor: "#03A9F4",
        };
      case ExportRequestStatus.COUNT_CONFIRMED:
        return {
          label: "Đã xác nhận kiểm đếm",
          color: "#fff",
          bgColor: "#213448",
        };
      case ExportRequestStatus.WAITING_EXPORT:
        return {
          label: "Chờ xuất kho",
          color: "#fff",
          bgColor: "#faad14",
        };
      case ExportRequestStatus.CONFIRMED:
        return {
          label: "Đã xác nhận",
          color: "#fff",
          bgColor: "#B0DB9C",
        };
      case ExportRequestStatus.COMPLETED:
        return {
          label: "Hoàn tất",
          color: "#fff",
          bgColor: "#4CAF50",
        };
      case ExportRequestStatus.CANCELLED:
        return {
          label: "Đã hủy",
          color: "#F44336",
          bgColor: "#FFEBEE",
        };
      default:
        return {
          label: "Không xác định",
          color: "#757575",
          bgColor: "#F5F5F5",
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
      <Text style={[styles.statusText, { color: statusInfo.color }]}>
        {statusInfo.label}
      </Text>
    </View>
  );
};

function ExportListComponent() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isLoggingOut = useSelector((state: RootState) => state.auth.isLoggingOut);
  const userId = user?.id;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>(ExportRequestStatus.IN_PROGRESS);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  // WebSocket integration
  const { latestNotification, isConnected } = usePusherContext();
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<number>(0);
  const queryClient = useQueryClient();

  const { fetchExportRequestsByStaffId, filterExportRequestsByRole } = useExportRequest();
  const { data: allExportRequests, isLoading } = useQuery({
    queryKey: ["export-requests", userId],
    queryFn: () => {
      if (!userId || !user || isLoggingOut) {
        console.warn("No user ID available or logging out - skipping export requests fetch");
        return Promise.resolve([]);
      }
      return fetchExportRequestsByStaffId(Number(userId), 1, 100);
    },
    enabled: !!userId && !!user && !isLoggingOut,
  });

  // Filter requests theo role của user
  const exportRequests = userId && allExportRequests
    ? filterExportRequestsByRole(allExportRequests, Number(userId))
    : [];

  // Handle WebSocket notifications
  useEffect(() => {
    if (!latestNotification || !userId) {
      return;
    }

    const { type: eventType, data, timestamp } = latestNotification;

    // Avoid processing the same event multiple times
    if (timestamp <= lastProcessedTimestamp) {
      console.log("⏭️ Export Screen - Skipping already processed event:", { timestamp, lastProcessed: lastProcessedTimestamp });
      return;
    }

    console.log("🔔 [EXPORT SCREEN] Processing new WebSocket event:", {
      eventType,
      data,
      userId,
      timestamp,
      screen: 'EXPORT'
    });

    // 🔥 UNIVERSAL HANDLER - Refresh on ANY event related to "export"
    const containsExport = eventType.toLowerCase().includes('export');

    // Check if the event is related to export requests
    const exportEvents = [
      EXPORT_REQUEST_CREATED_EVENT,
      EXPORT_REQUEST_COUNTED_EVENT,
      EXPORT_REQUEST_CONFIRMED_EVENT,
      EXPORT_REQUEST_CANCELLED_EVENT,
      EXPORT_REQUEST_COMPLETED_EVENT,
      EXPORT_REQUEST_ASSIGNED_EVENT,
      EXPORT_REQUEST_EXTENDED_EVENT,
      EXPORT_REQUEST_IN_PROGRESS_EVENT,
      EXPORT_REQUEST_COUNT_CONFIRMED_EVENT,
      EXPORT_REQUEST_WAITING_EXPORT_EVENT,
      EXPORT_REQUEST_STATUS_CHANGED_EVENT
    ];

    const isExportEvent = exportEvents.some(event =>
      eventType === event || eventType.startsWith(event + '-')
    );

    console.log("🤔 [EXPORT SCREEN] Event analysis:", {
      eventType,
      exportEvents,
      isExportEvent,
      containsExport,
      exactMatch: exportEvents.includes(eventType),
      startsWithMatch: exportEvents.some(event => eventType.startsWith(event + '-'))
    });

    // 🚨 REFRESH IF: Known export event OR contains "export"
    if (isExportEvent || containsExport) {
      console.log("🔄 [EXPORT SCREEN] REFRESHING DATA:", {
        reason: isExportEvent ? 'Known export event' : 'Contains export keyword',
        eventType
      });
      setLastProcessedTimestamp(timestamp);
      // Invalidate and refetch export requests
      queryClient.invalidateQueries({ queryKey: ["export-requests", userId] });
    } else {
      console.log("⏭️ Export Screen - Ignoring non-export event:", eventType);
      setLastProcessedTimestamp(timestamp);
    }
  }, [latestNotification, userId, queryClient, lastProcessedTimestamp]);

  // Định nghĩa các tab status - luôn hiển thị tất cả tabs
  const getStatusTabs = (): StatusTab[] => {
    const validRequests =
      exportRequests?.filter(
        (request: ExportRequestType) =>
          request.status !== ExportRequestStatus.CANCELLED
      ) || [];

    // Luôn return tất cả tabs, chỉ count từ filtered requests
    return [
      {
        key: "IN_PROGRESS",
        title: "Cần kiểm đếm",
        status: ExportRequestStatus.IN_PROGRESS,
        count: validRequests.filter(
          (request: ExportRequestType) =>
            request.status === ExportRequestStatus.IN_PROGRESS
        ).length,
      },
      {
        key: "COUNTED",
        title: "Đã đóng gói",
        status: ExportRequestStatus.COUNTED,
        count: validRequests.filter(
          (request: ExportRequestType) =>
            request.status === ExportRequestStatus.COUNTED
        ).length,
      },
      {
        key: "COUNT_CONFIRMED",
        title: "Đã xác nhận kiểm đếm",
        status: ExportRequestStatus.COUNT_CONFIRMED,
        count: validRequests.filter(
          (request: ExportRequestType) =>
            request.status === ExportRequestStatus.COUNT_CONFIRMED
        ).length,
      },
      {
        key: "CONFIRMED",
        title: "Đã xác nhận phiếu nhập",
        status: ExportRequestStatus.CONFIRMED,
        count: validRequests.filter(
          (request: ExportRequestType) =>
            request.status === ExportRequestStatus.CONFIRMED
        ).length,
      },
      {
        key: "WAITING_EXPORT",
        title: "Chờ xuất kho",
        status: ExportRequestStatus.WAITING_EXPORT,
        count: validRequests.filter(
          (request: ExportRequestType) =>
            request.status === ExportRequestStatus.WAITING_EXPORT
        ).length,
      },
      {
        key: "COMPLETED",
        title: "Hoàn tất",
        status: ExportRequestStatus.COMPLETED,
        count: validRequests.filter(
          (request: ExportRequestType) =>
            request.status === ExportRequestStatus.COMPLETED
        ).length,
      },
    ];
  };

  const statusTabs = getStatusTabs();


  // Lọc dữ liệu theo tab active và search
  const getFilteredData = () => {
    let filtered =
      exportRequests?.filter((request: ExportRequestType) => {
        // Loại bỏ phiếu xuất đã hủy
        if (request.status === ExportRequestStatus.CANCELLED) return false;

        // Lọc theo tab
        if (activeTab !== "ALL" && request.status !== activeTab) return false;

        // Lọc theo search query
        const matchSearch =
          request?.exportRequestId &&
          request.exportRequestId
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        return matchSearch;
      }) || [];

    return filtered;
  };

  const handleSelectExport = (request: ExportRequestType) => {
    dispatch(
      setPaperData({
        exportRequestId: request.exportRequestId,
        description: request.exportReason || "Không có lý do",
      })
    );
    router.push({
      pathname: "/export/export-detail/[id]",
      params: { id: request.exportRequestId },
    });
  };

  // Render tab item
  const renderTabItem = (tab: StatusTab) => {
    const isActive = activeTab === tab.key;

    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tabItem, isActive && styles.activeTabItem]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabTitle, isActive && styles.activeTabTitle]}>
          {tab.title}
        </Text>
        {tab.count > 0 && (
          <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
            <Text
              style={[
                styles.tabBadgeText,
                isActive && styles.activeTabBadgeText,
              ]}
            >
              {tab.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render export item
  const renderExportItem = ({ item: request }: { item: ExportRequestType }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleSelectExport(request)}
      activeOpacity={0.7}
    >
      {/* Header phiếu xuất */}
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Ionicons name="document-text-outline" size={20} color="#1677ff" />
          <Text style={styles.orderId}>{request.exportRequestId}</Text>
        </View>
        <StatusBadge status={request.status} />
      </View>

      {/* Nội dung phiếu xuất */}
      <View style={styles.orderContent}>
        {request.exportDate && (
          <InfoRow
            icon="calendar-outline"
            title="Ngày dự xuất"
            value={new Date(request.exportDate).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          />
          
        )}
      
      </View>

      {/* Footer phiếu xuất */}
     {/*
      {(() => {
        let buttonLabel = "Xem chi tiết phiếu xuất";
        let icon = "eye-outline";

        switch (request.status) {
          case ExportRequestStatus.IN_PROGRESS:
            buttonLabel = "Kiểm đếm phiếu xuất";
            icon = "clipboard-outline";
            break;
          case ExportRequestStatus.COUNT_CONFIRMED:
            buttonLabel = "Tạo chứng từ";
            icon = "document-outline";
            break;
        }

        return (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (request.status === ExportRequestStatus.COUNT_CONFIRMED) {
                router.push({
                  pathname: "/export/sign/warehouse-sign",
                  params: { id: request.exportRequestId },
                });
              } else {
                handleSelectExport(request);
              }
            }}
          >
            <Ionicons
              name={icon}
              size={18}
              color="#FFFFFF"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        );
      })()} */}
    </TouchableOpacity>
  );

  const filteredData = getFilteredData();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Danh sách phiếu xuất</Text>
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
              ]}
            />
            <Text style={styles.connectionText}>
              {isConnected ? 'Trực tuyến' : 'Ngoại tuyến'}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={18}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo mã phiếu xuất"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

      </View>

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {statusTabs.map(renderTabItem)}
        </ScrollView>
      </View>

      {/* Export Requests List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1677ff" />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#BDBDBD" />
          <Text style={styles.emptyText}>
            {searchQuery
              ? "Không tìm thấy phiếu xuất phù hợp"
              : `Không có phiếu xuất ${statusTabs
                  .find((t) => t.key === activeTab)
                  ?.title.toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderExportItem}
          keyExtractor={(item) => item.exportRequestId.toString()}
          contentContainerStyle={styles.ordersList}
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
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: "#333",
  },

  // Tabs Styles
  tabsContainer: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
  },
  activeTabItem: {
    backgroundColor: "#1677ff",
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabTitle: {
    color: "white",
    fontWeight: "600",
  },
  tabBadge: {
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
  },
  activeTabBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  activeTabBadgeText: {
    color: "white",
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#757575",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  ordersList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  orderCard: {
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderId: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  orderContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  infoValue: {
    flex: 1,
    alignItems: "flex-end",
  },
  infoValueText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flexWrap: "wrap",
    textAlign: "right",
  },
  actionButton: {
    backgroundColor: "#1677ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default function ExportList() {
  return (
    <QueryClientProvider client={queryClient}>
      <ExportListComponent />
    </QueryClientProvider>
  );
}
