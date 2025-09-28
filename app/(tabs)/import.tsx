import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  StyleSheet,
  FlatList,
} from "react-native";
import { ReactNode, useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import useImportOrder from "@/services/useImportOrderService";
import { useDispatch, useSelector } from "react-redux";
import { setPaperData } from "@/redux/paperSlice";
import useImportOrderDetail from "@/services/useImportOrderDetailService";
import { setProducts } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import usePaperService from "@/services/usePaperService";
import { ImportOrderStatus } from "@/types/importOrder.type";
import StatusBadge from "@/components/StatusBadge";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePusherContext } from "@/contexts/pusher/PusherContext";
import {
  IMPORT_ORDER_CREATED_EVENT,
  IMPORT_ORDER_COUNTED_EVENT,
  IMPORT_ORDER_CONFIRMED_EVENT,
  IMPORT_ORDER_CANCELLED_EVENT,
  IMPORT_ORDER_COMPLETED_EVENT,
  IMPORT_ORDER_ASSIGNED_EVENT,
  IMPORT_ORDER_EXTENDED_EVENT,
  IMPORT_ORDER_COUNT_AGAIN_REQUESTED_EVENT,
  IMPORT_ORDER_IN_PROGRESS_EVENT,
  IMPORT_ORDER_COUNT_CONFIRMED_EVENT,
  IMPORT_ORDER_READY_TO_STORE_EVENT,
  IMPORT_ORDER_STORED_EVENT,
  IMPORT_ORDER_STATUS_CHANGED_EVENT
} from "@/constants/channelsNEvents";

interface StatusTab {
  key: string;
  title: string;
  status: ImportOrderStatus | "ALL";
  count: number;
}

export default function ReceiptDetail() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>(
    ImportOrderStatus.IN_PROGRESS
  );

  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  // WebSocket integration
  const { latestNotification, isConnected } = usePusherContext();
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<number>(0);

  const { loading, fetchImportOrders } = useImportOrder();
  const [allOrders, setAllOrders] = useState([]);
  const [papers, setPapers] = useState<any[]>([]);
  const { getPaperById } = usePaperService();
  const { fetchImportOrderDetails } = useImportOrderDetail();

  // Định nghĩa các tab status
  const getStatusTabs = (): StatusTab[] => {
    const validOrders = allOrders.filter(
      (order: any) => order.status !== ImportOrderStatus.CANCELLED
    );

    return [
      {
        key: "IN_PROGRESS",
        title: "Cần kiểm đếm",
        status: ImportOrderStatus.IN_PROGRESS,
        count: validOrders.filter(
          (order: any) => order.status === ImportOrderStatus.IN_PROGRESS
        ).length,
      },
      {
        key: "COUNTED",
        title: "Chờ xác nhận",
        status: ImportOrderStatus.COUNTED,
        count: validOrders.filter(
          (order: any) => order.status === ImportOrderStatus.COUNTED
        ).length,
      },
      {
        key: "COUNT_AGAIN_REQUESTED",
        title: "Cần kiểm đếm lại",
        status: ImportOrderStatus.COUNT_AGAIN_REQUESTED,
        count: validOrders.filter(
          (order: any) => order.status === ImportOrderStatus.COUNT_AGAIN_REQUESTED
        ).length,
      },
      // {
      //   key: "CONFIRMED",
      //   title: "Đã xác nhận",
      //   status: ImportOrderStatus.CONFIRMED,
      //   count: validOrders.filter(
      //     (order: any) => order.status === ImportOrderStatus.CONFIRMED
      //   ).length,
      // },
      {
        key: "COMPLETED",
        title: "Hoàn tất",
        status: ImportOrderStatus.COMPLETED,
        count: validOrders.filter(
          (order: any) => order.status === ImportOrderStatus.COMPLETED
        ).length,
      },
      {
        key: "READY_TO_STORE",
        title: "Sẵn sàng nhập kho",
        status: ImportOrderStatus.READY_TO_STORE,
        count: validOrders.filter(
          (order: any) => order.status === ImportOrderStatus.READY_TO_STORE
        ).length,
      },

      {
        key: "STORED",
        title: "Đã nhập kho",
        status: ImportOrderStatus.STORED,
        count: validOrders.filter(
          (order: any) => order.status === ImportOrderStatus.STORED
        ).length,
      },
    ];
  };

  const fetchOrders = useCallback(async () => {
    if (!userId) return;

    try {
      const orders = await fetchImportOrders(parseInt(userId));
      setAllOrders(orders);

      const paperIds = orders
        .map((order: any) => order.paperIds)
        .filter(Boolean);
      if (paperIds.length === 0) return;

      const fetchedPapers = await Promise.all(paperIds.map(getPaperById));
      setPapers(fetchedPapers);
    } catch (err) {
      console.log("Lỗi khi lấy đơn nhập:", err);
    }
  }, [userId, fetchImportOrders, getPaperById]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  // Handle WebSocket notifications
  useEffect(() => {
    if (!latestNotification || !userId) return;

    const { type: eventType, data, timestamp } = latestNotification;

    // Avoid processing the same event multiple times
    if (timestamp <= lastProcessedTimestamp) {
      console.log("⏭️ Import Screen - Skipping already processed event:", { timestamp, lastProcessed: lastProcessedTimestamp });
      return;
    }

    console.log("🔔 [IMPORT SCREEN] Processing new WebSocket event:", {
      eventType,
      data,
      userId,
      timestamp,
      screen: 'IMPORT'
    });

    // 🔥 UNIVERSAL HANDLER - Refresh on ANY event related to "import"
    const containsImport = eventType.toLowerCase().includes('import');

    // Check if the event is related to import orders
    const importEvents = [
      // Basic events
      IMPORT_ORDER_CREATED_EVENT,
      IMPORT_ORDER_COUNTED_EVENT,
      IMPORT_ORDER_CONFIRMED_EVENT,
      IMPORT_ORDER_CANCELLED_EVENT,
      IMPORT_ORDER_COMPLETED_EVENT,
      IMPORT_ORDER_ASSIGNED_EVENT,
      IMPORT_ORDER_EXTENDED_EVENT,
      IMPORT_ORDER_COUNT_AGAIN_REQUESTED_EVENT,

      // Status change events
      IMPORT_ORDER_IN_PROGRESS_EVENT,
      IMPORT_ORDER_COUNT_CONFIRMED_EVENT,
      IMPORT_ORDER_READY_TO_STORE_EVENT,
      IMPORT_ORDER_STORED_EVENT,
      IMPORT_ORDER_STATUS_CHANGED_EVENT
    ];

    const isImportEvent = importEvents.some(event =>
      eventType === event || eventType.startsWith(event + '-')
    );

    console.log("🤔 [IMPORT SCREEN] Event analysis:", {
      eventType,
      importEvents,
      isImportEvent,
      containsImport,
      exactMatch: importEvents.includes(eventType),
      startsWithMatch: importEvents.some(event => eventType.startsWith(event + '-'))
    });

    // 🚨 REFRESH IF: Known import event OR contains "import"
    if (isImportEvent || containsImport) {
      console.log("🔄 [IMPORT SCREEN] REFRESHING DATA:", {
        reason: isImportEvent ? 'Known import event' : 'Contains import keyword',
        eventType
      });
      setLastProcessedTimestamp(timestamp);
      // Refetch import orders
      fetchOrders();
    } else {
      console.log("⏭️ Import Screen - Ignoring non-import event:", eventType);
      setLastProcessedTimestamp(timestamp);
    }
  }, [latestNotification, userId, fetchOrders, lastProcessedTimestamp]);

  // Lọc dữ liệu theo tab active và search
  const getFilteredData = () => {
    let filtered = allOrders.filter((order: any) => {
      // Loại bỏ đơn hàng đã hủy
      if (order.status === ImportOrderStatus.CANCELLED) return false;

      // Lọc theo tab
      if (activeTab !== "ALL" && order.status !== activeTab) return false;

      // Lọc theo search query
      const matchSearch = order.importOrderId
        ?.toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchSearch;
    });

    return filtered;
  };

  // const handleImportCount = async (order: any) => {
  //   try {
  //     const response = await fetchImportOrderDetails(order.importOrderId);

  //     const products = response?.map((item: any) => ({
  //       id: item.itemId,
  //       name: item.itemName,
  //       expect: item.expectQuantity,
  //       actual: item.actualQuantity || 0,
  //       importOrderId: order.importOrderId,
  //     }));

  //     dispatch(setProducts(products));
  //     dispatch(
  //       setPaperData({
  //         importOrderId: order.importOrderId,
  //       })
  //     );

  //     router.push("/import/scan-qr");
  //   } catch (error) {
  //     console.log("Lỗi khi tạo chứng từ:", error);
  //   }
  // };

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

  // Render order item
  const renderOrderItem = ({ item: order }: { item: any }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() =>
        router.push({
          pathname: "/import/detail/[id]",
          params: { id: order.importOrderId.toString() },
        })
      }
      activeOpacity={0.7}
    >
      {/* Header đơn nhập */}
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Ionicons name="cube-outline" size={20} color="#1677ff" />
          <Text style={styles.orderId}>{order.importOrderId}</Text>
        </View>
        <StatusBadge status={order.status} flow="import" />
      </View>

      {/* Nội dung đơn nhập */}
      <View style={styles.orderContent}>
        <InfoRow
          icon="calendar-outline"
          title="Ngày dự nhập"
          value={new Date(order?.dateReceived).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        />
        <InfoRow
          icon="time-outline"
          title="Thời gian dự nhập"
          value={order?.timeReceived}
        />
      </View>

      {/* Footer đơn nhập */}

    </TouchableOpacity>
  );

  const filteredData = getFilteredData();
  const statusTabs = getStatusTabs();

  return (
    <View style={styles.container}>
      {/* StatusBar */}
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Danh sách đơn nhập</Text>
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
              ]}
            />
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
            placeholder="Tìm kiếm theo mã đơn nhập"
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

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1677ff" />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#BDBDBD" />
          <Text style={styles.emptyText}>
            {searchQuery
              ? "Không tìm thấy đơn nhập phù hợp"
              : `Không có đơn nhập ${statusTabs
                .find((t) => t.key === activeTab)
                ?.title.toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.importOrderId.toString()}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// Component hiển thị thông tin với icon
const InfoRow = ({
  icon,
  title,
  value,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
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

  viewButton: {
    backgroundColor: "#4CAF50",
  },
  viewButton2: {
    backgroundColor: "#213448",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
});
