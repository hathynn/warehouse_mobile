import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  TextInput,
  StyleSheet,
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

export default function ReceiptDetail() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<ImportOrderStatus | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();

  const { loading, fetchImportOrders } = useImportOrder();
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [papers, setPapers] = useState<any[]>([]); // danh sách chứng từ đã fetch
  const { getPaperById } = usePaperService();
  const { fetchImportOrderDetails } = useImportOrderDetail();
  const insets = useSafeAreaInsets();
  const statusOptions = [
    { label: "Chờ kiểm đếm", value: ImportOrderStatus.IN_PROGRESS },
    { label: "Hoàn tất", value: ImportOrderStatus.COMPLETED },
    { label: "Chờ xác nhận", value: ImportOrderStatus.COUNTED },
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) return;

      try {
        const orders = await fetchImportOrders(parseInt(userId));
        setFilteredOrders(orders);

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

  const filteredData = filteredOrders.filter((order: any) => {
    if (order.status === ImportOrderStatus.CANCELLED) return false;

    const matchSearch = order.importOrderId
      ?.toString()
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchStatus = selectedStatus ? order.status === selectedStatus : true;

    return matchSearch && matchStatus;
  });

  const products = useSelector((state: RootState) => state.product.products);

  // Hàm render chip thể hiện trạng thái lọc hiện tại
  const renderStatusChip = () => {
    if (!selectedStatus) return null;

    const statusInfo = statusOptions.find(
      (opt) => opt.value === selectedStatus
    );
    if (!statusInfo) return null;

    return (
      <TouchableOpacity
        style={styles.statusChip}
        onPress={() => setSelectedStatus(null)}
      >
        <Text style={styles.statusChipText}>{statusInfo.label}</Text>
        <Ionicons
          name="close-circle"
          size={16}
          color="#FFFFFF"
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: ImportOrderStatus) => {
    switch (status) {
      case ImportOrderStatus.IN_PROGRESS:
        return "#E3F2FD"; // Nền xanh nhạt
      case ImportOrderStatus.COMPLETED:
        return "#E8F5E9"; // Nền xanh lá nhạt
      case ImportOrderStatus.COUNTED:
        return "#FFF8E1"; // Nền vàng nhạt
      default:
        return "#FFFFFF";
    }
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

  return (
    <View style={styles.container}>
      {/* StatusBar */}
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Danh sách đơn nhập</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Thanh tìm kiếm */}
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

          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            style={styles.filterButton}
          >
            <Ionicons name="filter" size={22} color="#1677ff" />
          </TouchableOpacity>
        </View>

        {/* Hiển thị trạng thái lọc */}
        {renderStatusChip()}

        {/* Danh sách đơn nhập */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1677ff" />
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color="#BDBDBD" />
            <Text style={styles.emptyText}>Không có đơn nhập phù hợp</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredData.map((order: any) => (
              <TouchableOpacity
                key={order.importOrderId}
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
                      Đơn nhập số {order.importOrderId}
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
                ) :  order.status === ImportOrderStatus.COMPLETED &&
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
                ) :  order.status === ImportOrderStatus.CONFIRMED &&
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
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal lọc */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lọc theo trạng thái</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.statusOption,
                  selectedStatus === status.value && styles.selectedOption,
                ]}
                onPress={() => {
                  setSelectedStatus(status.value as ImportOrderStatus);
                  setFilterVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    selectedStatus === status.value &&
                      styles.selectedOptionText,
                  ]}
                >
                  {status.label}
                </Text>
                {selectedStatus === status.value && (
                  <Ionicons name="checkmark" size={20} color="#1677ff" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSelectedStatus(null);
                setFilterVisible(false);
              }}
            >
              <Text style={styles.resetButtonText}>Bỏ lọc</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginLeft: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1677ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 16,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  statusChipText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
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
  },
  ordersList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  statusOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  selectedOption: {
    backgroundColor: "#F0F7FF",
  },
  statusOptionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedOptionText: {
    color: "#1677ff",
    fontWeight: "500",
  },
  resetButton: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});
