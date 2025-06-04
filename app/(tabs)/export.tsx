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

const queryClient = new QueryClient();

interface StatusTab {
  key: string;
  title: string;
  status: ExportRequestStatus | 'ALL';
  count: number;
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
          label: "Chờ xác nhận",
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
          label: "Đã xuất kho",
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
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { fetchExportRequestsByStaffId } = useExportRequest();
  const { data: exportRequests, isLoading } = useQuery({
    queryKey: ["export-requests", userId],
    queryFn: () =>
      userId
        ? fetchExportRequestsByStaffId(Number(userId), 1, 100)
        : Promise.resolve([]),
    enabled: !!userId,
  });

  // Định nghĩa các tab status
  const getStatusTabs = (): StatusTab[] => {
    const validRequests = exportRequests?.filter((request: ExportRequestType) => 
      request.status !== ExportRequestStatus.CANCELLED
    ) || [];

    return [
  
      {
        key: 'IN_PROGRESS',
        title: 'Cần kiểm đếm',
        status: ExportRequestStatus.IN_PROGRESS,
        count: validRequests.filter((request: ExportRequestType) => 
          request.status === ExportRequestStatus.IN_PROGRESS
        ).length,
      },
      {
        key: 'COUNTED',
        title: 'Chờ xác nhận',
        status: ExportRequestStatus.COUNTED,
        count: validRequests.filter((request: ExportRequestType) => 
          request.status === ExportRequestStatus.COUNTED
        ).length,
      },
      {
        key: 'COUNT_CONFIRMED',
        title: 'Đã xác nhận',
        status: ExportRequestStatus.COUNT_CONFIRMED,
        count: validRequests.filter((request: ExportRequestType) => 
          request.status === ExportRequestStatus.COUNT_CONFIRMED
        ).length,
      },
      {
        key: 'WAITING_EXPORT',
        title: 'Chờ xuất kho',
        status: ExportRequestStatus.WAITING_EXPORT,
        count: validRequests.filter((request: ExportRequestType) => 
          request.status === ExportRequestStatus.WAITING_EXPORT
        ).length,
      },
      {
        key: 'COMPLETED',
        title: 'Hoàn tất',
        status: ExportRequestStatus.COMPLETED,
        count: validRequests.filter((request: ExportRequestType) => 
          request.status === ExportRequestStatus.COMPLETED
        ).length,
      },
    ];
  };

  // Lọc dữ liệu theo tab active và search
  const getFilteredData = () => {
    let filtered = exportRequests?.filter((request: ExportRequestType) => {
      // Loại bỏ phiếu xuất đã hủy
      if (request.status === ExportRequestStatus.CANCELLED) return false;

      // Lọc theo tab
      if (activeTab !== 'ALL' && request.status !== activeTab) return false;

      // Lọc theo search query
      const matchSearch = request?.exportRequestId &&
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
            <Text style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}>
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
          <Ionicons
            name="document-text-outline"
            size={20}
            color="#1677ff"
          />
          <Text style={styles.orderId}>
            {request.exportRequestId}
          </Text>
        </View>
        <StatusBadge status={request.status} />
      </View>

      {/* Nội dung phiếu xuất */}
      <View style={styles.orderContent}>
        {request.exportDate && (
          <InfoRow
            icon="calendar-outline"
            title="Ngày dự xuất"
            value={new Date(request.exportDate).toLocaleDateString(
              "vi-VN",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }
            )}
          />
        )}
      </View>

      {/* Footer phiếu xuất */}
      {(() => {
        let buttonLabel = "Xem chi tiết phiếu xuất";
        let backgroundColor = "#757575";
        let icon = "eye-outline";

        switch (request.status) {
          case ExportRequestStatus.IN_PROGRESS:
            buttonLabel = "Kiểm đếm phiếu xuất";
            backgroundColor = "#1677ff";
            icon = "clipboard-outline";
            break;
          case ExportRequestStatus.COUNT_CONFIRMED:
            buttonLabel = "Tạo chứng từ";
            backgroundColor = "#213448";
            icon = "document-outline";
            break;
          case ExportRequestStatus.COUNTED:
            backgroundColor = "#03A9F4";
            break;
          case ExportRequestStatus.WAITING_EXPORT:
            backgroundColor = "#faad14";
            break;
          case ExportRequestStatus.CONFIRMED:
            backgroundColor = "#B0DB9C";
            break;
          case ExportRequestStatus.COMPLETED:
            backgroundColor = "#4CAF50";
            break;
        }

        return (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor }]}
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
      })()}
    </TouchableOpacity>
  );

  const filteredData = getFilteredData();
  const statusTabs = getStatusTabs();

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Danh sách phiếu xuất</Text>
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
              : `Không có phiếu xuất ${statusTabs.find(t => t.key === activeTab)?.title.toLowerCase()}`
            }
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    marginBottom:10,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
  },
  activeTabItem: {
    backgroundColor: '#1677ff',
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabTitle: {
    color: 'white',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabBadgeText: {
    color: 'white',
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
    textAlign: 'center',
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