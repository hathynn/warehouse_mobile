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
import { ReactNode, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
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

interface StatusTab {
  key: string;
  title: string;
  status: ImportOrderStatus | 'ALL';
  count: number;
}

export default function ReceiptDetail() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();

  const { loading, fetchImportOrders } = useImportOrder();
  const [allOrders, setAllOrders] = useState([]);
  const [papers, setPapers] = useState<any[]>([]);
  const { getPaperById } = usePaperService();
  const { fetchImportOrderDetails } = useImportOrderDetail();
  const insets = useSafeAreaInsets();

  // Định nghĩa các tab status
  const getStatusTabs = (): StatusTab[] => {
    const validOrders = allOrders.filter((order: any) => 
      order.status !== ImportOrderStatus.CANCELLED
    );

    return [
    
      {
        key: 'IN_PROGRESS',
        title: 'Cần kiểm đếm',
        status: ImportOrderStatus.IN_PROGRESS,
        count: validOrders.filter((order: any) => 
          order.status === ImportOrderStatus.IN_PROGRESS
        ).length,
      },
      {
        key: 'COUNTED',
        title: 'Chờ xác nhận',
        status: ImportOrderStatus.COUNTED,
        count: validOrders.filter((order: any) => 
          order.status === ImportOrderStatus.COUNTED
        ).length,
      },
      {
        key: 'CONFIRMED',
        title: 'Đã xác nhận',
        status: ImportOrderStatus.CONFIRMED,
        count: validOrders.filter((order: any) => 
          order.status === ImportOrderStatus.CONFIRMED
        ).length,
      },
      {
        key: 'COMPLETED',
        title: 'Hoàn tất',
        status: ImportOrderStatus.COMPLETED,
        count: validOrders.filter((order: any) => 
          order.status === ImportOrderStatus.COMPLETED
        ).length,
      },
      
    ];
  };

  useEffect(() => {
    const fetchOrders = async () => {
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
        console.error("Lỗi khi lấy đơn nhập:", err);
      }
    };

    fetchOrders();
  }, [userId]);

  // Lọc dữ liệu theo tab active và search
  const getFilteredData = () => {
    let filtered = allOrders.filter((order: any) => {
      // Loại bỏ đơn hàng đã hủy
      if (order.status === ImportOrderStatus.CANCELLED) return false;

      // Lọc theo tab
      if (activeTab !== 'ALL' && order.status !== activeTab) return false;

      // Lọc theo search query
      const matchSearch = order.importOrderId
        ?.toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchSearch;
    });

    return filtered;
  };

  const handleImportCount = async (order: any) => {
    try {
      const response = await fetchImportOrderDetails(order.importOrderId);

      const products = response?.map((item: any) => ({
        id: item.itemId,
        name: item.itemName,
        expect: item.expectQuantity,
        actual: item.actualQuantity || 0,
        importOrderId: order.importOrderId,
      }));

      dispatch(setProducts(products));
      dispatch(
        setPaperData({
          importOrderId: order.importOrderId,
        })
      );

      router.push("/import/scan-qr");
    } catch (error) {
      console.error("Lỗi khi tạo chứng từ:", error);
    }
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
          <Text style={styles.orderId}>
            {order.importOrderId}
          </Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Nội dung đơn nhập */}
      <View style={styles.orderContent}>
        <InfoRow
          icon="calendar-outline"
          title="Ngày dự nhập"
          value={new Date(order.dateReceived).toLocaleDateString(
            "vi-VN",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }
          )}
        />
      </View>

      {/* Footer đơn nhập */}
      {order.status === ImportOrderStatus.IN_PROGRESS ||
      order.status === ImportOrderStatus.NOT_STARTED ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleImportCount(order)}
        >
          <Ionicons
            name="scan-outline"
            size={18}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Kiểm đếm đơn nhập</Text>
        </TouchableOpacity>
      ) : order.status === ImportOrderStatus.COMPLETED &&
        order.paperIds ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() =>
            router.push({
              pathname: "/import/detail/[id]",
              params: { id: order.importOrderId.toString() },
            })
          }
        >
          <Ionicons
            name="eye-outline"
            size={18}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Xem chi tiết đơn nhập</Text>
        </TouchableOpacity>
      ) : order.status === ImportOrderStatus.CONFIRMED &&
        order.paperIds ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton2]}
          onPress={() =>
            router.push({
              pathname: "/import/detail/[id]",
              params: { id: order.importOrderId.toString() },
            })
          }
        >
          <Ionicons
            name="eye-outline"
            size={18}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Xem chi tiết đơn nhập</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#213448' }]}
          onPress={() =>
            router.push({
              pathname: "/import/detail/[id]",
              params: { id: order.importOrderId.toString() },
            })
          }
        >
          <Ionicons
            name="time-outline"
            size={18}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Chờ xác nhận</Text>
        </TouchableOpacity>
      )}
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
        <Text style={styles.headerTitle}>Danh sách đơn nhập</Text>
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
              : `Không có đơn nhập ${statusTabs.find(t => t.key === activeTab)?.title.toLowerCase()}`
            }
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