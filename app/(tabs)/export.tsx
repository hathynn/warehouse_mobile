import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TextInput,
  StyleSheet,
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

// Component hiển thị thông tin với icon (giống như trang đơn nhập)
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

// Component Status Badge (tương tự như trong trang đơn nhập)
const StatusBadge = ({ status }: { status: ExportRequestStatus }) => {
  const getStatusInfo = () => {
    switch (status) {
      case ExportRequestStatus.IN_PROGRESS:
        return {
          label: "Đang xử lý",
          color: "#FFF",
          bgColor: "#1677ff",
          buttonColor: "#1677ff",
        };
      case ExportRequestStatus.COUNTED:
        return {
          label: "Đã kiểm đếm",
          color: "#E1F5FE",
          bgColor: "#03A9F4",
          buttonColor: "#03A9F4",
        };
      case ExportRequestStatus.COUNT_CONFIRMED:
        return {
          label: "Đã xác nhận kiểm đếm",
          color: "#fff",
          bgColor: "#213448",
          buttonColor: "#4CAF50",
        };
      case ExportRequestStatus.WAITING_EXPORT:
        return {
          label: "Chờ xuất kho",
          color: "#fffbe6",
          bgColor: "#faad14",
          buttonColor: "#faad14",
        };
      case ExportRequestStatus.CONFIRMED:
        return {
          label: "Đã xuất kho",
          color: "#ECFAE5", // xanh nhẹ
          bgColor: "#B0DB9C", // nền xanh nhạt
          buttonColor: "#ECFAE5", // nút xanh
        };

      case ExportRequestStatus.COMPLETED:
        return {
          label: "Hoàn tất",
          color: "#2196F3",
          bgColor: "#E3F2FD",
          buttonColor: "#2196F3",
        };
      case ExportRequestStatus.CANCELLED:
        return {
          label: "Đã hủy",
          color: "#F44336",
          bgColor: "#FFEBEE",
          buttonColor: "#F44336",
        };
      default:
        return {
          label: "Không xác định",
          color: "#757575",
          bgColor: "#F5F5F5",
          buttonColor: "#757575",
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
  const [selectedStatus, setSelectedStatus] =
    useState<ExportRequestStatus | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
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

  const statusOptions = [
    { label: "Chưa bắt đầu", value: ExportRequestStatus.NOT_STARTED },
    { label: "Đang xử lý", value: ExportRequestStatus.IN_PROGRESS },
    { label: "Chờ xác nhận", value: ExportRequestStatus.COUNTED },
    {
      label: "Đã xác nhận kiểm đếm",
      value: ExportRequestStatus.COUNT_CONFIRMED,
    },
    { label: "Chờ xuất kho", value: ExportRequestStatus.WAITING_EXPORT },
    { label: "Hoàn tất", value: ExportRequestStatus.COMPLETED },
    { label: "Đã hủy", value: ExportRequestStatus.CANCELLED },
  ];

  // Render chip thể hiện trạng thái lọc hiện tại
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

  const filteredExports =
    exportRequests?.filter((request: ExportRequestType) => {
      const matchSearch =
        request?.exportRequestId &&
        request.exportRequestId
          .toString()
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchStatus = selectedStatus
        ? request.status === selectedStatus
        : true;

      return matchSearch && matchStatus;
    }) || [];

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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Danh sách phiếu xuất</Text>
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
              placeholder="Tìm kiếm theo mã phiếu xuất"
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

        {/* Danh sách phiếu xuất */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1677ff" />
          </View>
        ) : filteredExports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color="#BDBDBD" />
            <Text style={styles.emptyText}>Không có phiếu xuất phù hợp</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredExports.map((request: ExportRequestType) => (
              <TouchableOpacity
                key={request.exportRequestId}
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
                      Phiếu xuất {request.exportRequestId}
                    </Text>
                  </View>
                  <StatusBadge status={request.status} />
                </View>

                {/* Nội dung phiếu xuất */}
                <View style={styles.orderContent}>
                  {/* {request.exportReason && (
                    <InfoRow
                      icon="information-circle-outline"
                      title="Lý do xuất"
                      value={request.exportReason}
                    />
                  )} */}

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
                      backgroundColor = "#E3F2FD";
                      break;
                    case ExportRequestStatus.CANCELLED:
                      backgroundColor = "#FFEBEE";
                      break;
                  }

                  return (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor }]}
                      onPress={() => {
                        if (
                          request.status === ExportRequestStatus.COUNT_CONFIRMED
                        ) {
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
                  setSelectedStatus(status.value);
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

// Thêm component Modal để hiển thị
const Modal = ({
  visible,
  transparent,
  animationType,
  children,
}: {
  visible: boolean;
  transparent: boolean;
  animationType: "slide" | "none" | "fade";
  children: React.ReactNode;
}) => {
  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: transparent ? "transparent" : "white",
        zIndex: 1000,
      }}
    >
      {children}
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
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

export default function ExportList() {
  return (
    <QueryClientProvider client={queryClient}>
      <ExportListComponent />
    </QueryClientProvider>
  );
}
