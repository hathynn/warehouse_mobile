import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useExportRequest from "@/services/useExportRequestService";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import usePaperService from "@/services/usePaperService";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { setExportRequestDetail, setScanMappings } from "@/redux/exportRequestDetailSlice";
import { RootState, store } from "@/redux/store";
import { ExportRequestStatus } from "@/types/exportRequest.type";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StyledButton from "@/components/ui/StyledButton";
import StatusBadge from "@/components/StatusBadge";
import { Modal, TextInput as RNTextInput } from "react-native";
import { ExportRequestDetailStatus } from "@/types/exportRequestDetail.type";

interface RouteParams {
  id: string;
}

const ExportRequestScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const route = useRoute();
  const { id } = route.params as RouteParams;
  const dispatch = useDispatch();
  const { updateActualQuantity } = useExportRequestDetail();
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualItemId, setManualItemId] = useState("");
  const [manualInventoryItemId, setManualInventoryItemId] = useState("");
  const [paper, setPaper] = useState<any>(null);
  const [paperLoading, setPaperLoading] = useState(false);
  
  // New state for inventory items modal
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<string[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState("");

  const { getPaperById } = usePaperService();

  const getExportTypeLabel = (type: string | undefined) => {
    switch (type) {
      case "BORROWING":
        return "Mượn";
      case "RETURN":
        return "Trả";
      case "LIQUIDATION":
        return "Thanh lý";
      case "PARTIAL":
        return "Xuất lẻ";
      case "PRODUCTION":
        return "Xuất sản xuất";
      case "SELLING":
        return "Xuất bán";
      default:
        return "Không xác định";
    }
  };

  const {
    loading: loadingRequest,
    exportRequest,
    fetchExportRequestById,
    updateExportRequestStatus,
  } = useExportRequest();

  const { loading: loadingDetails, fetchExportRequestDetails } =
    useExportRequestDetail();

  const scanMappings = useSelector(
    (state: RootState) => state.exportRequestDetail.scanMappings
  );

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        fetchExportRequestById(id);
        fetchExportRequestDetails(id, 1, 100).then((newData) => {
          const refreshedDetails = newData.map((item) => ({
            ...item,
            actualQuantity: item.actualQuantity ?? 0,
            inventoryItemIds: item.inventoryItemIds ?? [],
          }));

          dispatch(setExportRequestDetail(refreshedDetails));

          // 👇 Tạo mapping từ inventoryItemId => exportRequestDetailId
          const mappings = refreshedDetails.flatMap((detail) =>
            (detail.inventoryItemIds ?? []).map((inventoryItemId: string) => ({
              inventoryItemId: inventoryItemId.trim().toLowerCase(),
              exportRequestDetailId: detail.id,
            }))
          );
          dispatch(setScanMappings(mappings));
        });
      }
    }, [id])
  );

  // Fetch paper data when exportRequest has paperId and status is COMPLETED
  useEffect(() => {
    if (exportRequest?.paperId && exportRequest?.status === ExportRequestStatus.COMPLETED) {
      console.log('🔍 Fetching paper with ID:', exportRequest.paperId);
      setPaperLoading(true);
      getPaperById(exportRequest.paperId)
        .then((data: any) => {
          console.log('✅ Paper data received:', data);
          setPaper(data);
        })
        .catch((error) => {
          console.error('❌ Lỗi lấy chứng từ:', error);
          setPaper(null);
        })
        .finally(() => setPaperLoading(false));
    }
  }, [exportRequest?.paperId, exportRequest?.status]);

  const savedExportRequestDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
  );

  useEffect(() => {
    console.log("🟦 [Redux] savedExportRequestDetails:", savedExportRequestDetails);
    console.log("🟩 [Redux] scanMappings:", scanMappings);
  }, [savedExportRequestDetails, scanMappings]);

  if (loadingRequest || loadingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const handleManualUpdate = () => {
    console.log("🔍 manualItemId:", manualItemId);
    console.log("🔍 manualInventoryItemId:", manualInventoryItemId);
    console.log("🔍 savedExportRequestDetails:", savedExportRequestDetails);

    savedExportRequestDetails.forEach((d) => {
      console.log("✅", d.itemId, d.inventoryItemIds);
    });

    const matched = savedExportRequestDetails.find((detail) => {
      const normalizedItemId = detail.itemId?.trim().toLowerCase();
      const normalizedInventoryIds = (detail.inventoryItemIds || []).map(
        (id: string) => id.trim().toLowerCase()
      );

      return (
        normalizedItemId === manualItemId.trim().toLowerCase() &&
        normalizedInventoryIds.includes(
          manualInventoryItemId.trim().toLowerCase()
        )
      );
    });

    if (!matched) {
      alert("❌ Không tìm thấy sản phẩm phù hợp.");
      return;
    }

    if (matched.actualQuantity >= matched.quantity) {
      alert("⚠️ Sản phẩm đã đủ số lượng.");
      return;
    }

    const updated = savedExportRequestDetails.map((d) =>
      d === matched ? { ...d, actualQuantity: d.actualQuantity + 1 } : d
    );

    dispatch(setExportRequestDetail(updated));
    setManualModalVisible(false);
    setManualItemId("");
    setManualInventoryItemId("");
  };

  const handleConfirm = async () => {
    try {
      const statusUpdate = await updateExportRequestStatus(
        id,
        ExportRequestStatus.COUNTED
      );
      if (statusUpdate) {
        console.log("✅ Đã cập nhật status sang COUNTED");
        router.push("/(tabs)/export");
      } else {
        console.warn("⚠️ Cập nhật status thất bại.");
      }
    } catch (error) {
      console.error("❌ Lỗi khi xác nhận:", error);
    }
  };

  // Handle row press to show inventory items
  const handleRowPress = (detail: any) => {
    setSelectedInventoryItems(detail.inventoryItemIds || []);
    setSelectedItemCode(detail.itemId || "");
    setInventoryModalVisible(true);
  };

  const renderInventoryItem = ({ item }: { item: string }) => (
    <View style={styles.inventoryItemRow}>
      <Text style={styles.inventoryItemText}>{item}</Text>
    </View>
  );

  const renderActionButton = () => {
    if (!exportRequest) return null;
    const status = exportRequest.status;

    switch (status) {
      case ExportRequestStatus.IN_PROGRESS:
        return (
          <View>
            <StyledButton
              title="Xác nhận số lượng"
              onPress={handleConfirm}
              style={{ marginTop: 12 }}
            />
          </View>
        );

      case ExportRequestStatus.WAITING_EXPORT:
        return (
          <StyledButton
            title="Xác nhận xuất kho"
            onPress={() => router.push(`/export/sign/warehouse-sign?id=${id}`)}
            style={{ marginTop: 12 }}
          />
        );
      // case ExportRequestStatus.CONFIRMED:
      //   return (
      //     <StyledButton
      //       title="Xem chữ ký chứng từ"
      //       onPress={() => {
      //         router.push(`/import/paper-detail/${exportRequest.paperId}`);
      //       }}
      //       style={{ marginTop: 12 }}
      //     />
      //   );
      case ExportRequestStatus.COMPLETED:
        return null; // Không hiển thị button cho trạng thái COMPLETED
      default:
        return null;
    }
  };

  const renderSignatureSection = () => {
    if (exportRequest?.status !== ExportRequestStatus.COMPLETED || !exportRequest?.paperId) return null;

    return (
      <View style={styles.signatureContainer}>
        {/* <Text style={styles.signatureTitle}>CHỮ KÝ CHỨNG TỪ</Text> */}
        
        <View style={styles.signatureWrapper}>
          <View style={styles.signatureItem}>
            <Text style={styles.signatureLabel}>  Người giao hàng: {paper?.signProviderName || "Chưa rõ"}</Text>
            <View style={styles.signatureImageContainer}>
              {paper?.signProviderUrl ? (
                <Image
                  source={{ uri: paper.signProviderUrl }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noSignature}>
                  <Ionicons name="document-text-outline" size={40} color="#ccc" />
                  <Text style={styles.noSignatureText}>Chưa có chữ ký</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.signatureItem}>
            <Text style={styles.signatureLabel}>Người nhận hàng: {paper?.signReceiverName || "Chưa rõ"}</Text>
            <View style={styles.signatureImageContainer}>
              {paper?.signReceiverUrl ? (
                <Image
                  source={{ uri: paper.signReceiverUrl }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noSignature}>
                  <Ionicons name="document-text-outline" size={40} color="#ccc" />
                  <Text style={styles.noSignatureText}>Chưa có chữ ký</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#28a745" />
          <Text style={styles.completedText}>Đơn hàng đã hoàn thành</Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <View
        style={{
          backgroundColor: "#1677ff",
          paddingTop: insets.top,
          paddingBottom: 16,
          paddingHorizontal: 17,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 12, marginTop: 7 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text
          style={{
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            marginTop: 7,
          }}
        >
          Thông tin phiếu nhập #{id}
        </Text>
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin chi tiết yêu cầu</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã phiếu</Text>
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeText}>
                {" "}
                {exportRequest?.exportRequestId}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày tạo đơn</Text>
            <Text style={styles.value}>
              {" "}
              {exportRequest?.exportDate
                ? new Date(exportRequest?.exportDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày mong muốn xuất</Text>
            <Text style={styles.value}>
              {" "}
              {exportRequest?.exportDate
                ? new Date(exportRequest?.exportDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loại xuất</Text>
            <Text style={styles.value}>
              {getExportTypeLabel(exportRequest?.type)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tình trạng yêu cầu</Text>
            <Text style={styles.valueRed}>
              <StatusBadge status={exportRequest?.status || "UNKNOWN"} flow="export"/>
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cellCode]}>Mã hàng</Text>
            <Text style={[styles.cellAlignRight]}>Cần</Text>
            <Text style={[styles.cellAlignRight]}>Kiểm đếm</Text>
            {[
              ExportRequestStatus.IN_PROGRESS,
              ExportRequestStatus.COUNTED,
            ].includes(exportRequest?.status as ExportRequestStatus) && (
              <Text style={styles.scanHeader}></Text>
            )}
          </View>

          {savedExportRequestDetails.map((detail: any, index: number) => {
            const isDisabled = detail.quantity === detail.actualQuantity;
            const isLastItem = index === savedExportRequestDetails.length - 1;

            return (
              <View key={detail.id}>
                <TouchableOpacity
                  style={styles.tableRow}
                  onPress={() => handleRowPress(detail)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellCode]}>{detail.itemId}</Text>
                  <Text style={[styles.cellAlignRight]}>{detail.quantity}</Text>
                  <Text style={[styles.cellAlignRight]}>
                    {detail.actualQuantity}
                  </Text>

                  {[
                    ExportRequestStatus.IN_PROGRESS,
                    ExportRequestStatus.COUNTED,
                  ].includes(exportRequest?.status as ExportRequestStatus) && (
                    <View style={styles.scanCell}>
                      <TouchableOpacity
                        style={[
                          styles.scanButton,
                          isDisabled && styles.scanButtonDisabled,
                        ]}
                        disabled={isDisabled}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/export/scan-qr?id=${exportRequest?.exportRequestId}`
                          );
                        }}
                      >
                        {isDisabled ? (
                          <Text style={styles.scanText}>Đã đủ</Text>
                        ) : (
                          <Ionicons
                            name="qr-code-outline"
                            size={18}
                            color="white"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* Divider - không hiển thị cho item cuối cùng */}
                {!isLastItem && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <View className="p-5">{renderActionButton()}</View>

        {/* Signature Section - only show when COMPLETED */}
        {renderSignatureSection()}
      </ScrollView>

      {/* Manual Update Modal */}
      <Modal visible={manualModalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              width: "90%",
              backgroundColor: "white",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <Text
              style={{ fontWeight: "bold", fontSize: 16, marginBottom: 12 }}
            >
              Cập nhật số lượng thủ công
            </Text>
            <RNTextInput
              placeholder="Nhập itemId"
              value={manualItemId}
              onChangeText={setManualItemId}
              style={styles.inputs}
            />
            <RNTextInput
              placeholder="Nhập inventoryItemId"
              value={manualInventoryItemId}
              onChangeText={setManualInventoryItemId}
              style={styles.inputs}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <StyledButton
                title="Hủy"
                onPress={() => setManualModalVisible(false)}
                style={{ flex: 1, marginRight: 8, backgroundColor: "#ccc" }}
              />
              <StyledButton
                title="Cập nhật"
                onPress={handleManualUpdate}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Inventory Items Modal */}
      <Modal visible={inventoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Danh sách sản phẩm tồn kho (Mã hàng #{selectedItemCode})
              </Text>
              <TouchableOpacity
                onPress={() => setInventoryModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <RNTextInput
                placeholder="Tìm kiếm theo mã sản phẩm tồn kho"
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.sectionTitle}>Mã sản phẩm tồn kho</Text>

            <FlatList
              data={selectedInventoryItems}
              renderItem={renderInventoryItem}
              keyExtractor={(item, index) => `${item}-${index}`}
              style={styles.inventoryList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
  },
  card: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#333",
  },
  value: {
    fontSize: 14,
    color: "#333",
  },
  badgeBlue: {
    backgroundColor: "#1677ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },
  valueBlue: {
    fontSize: 14,
    color: "#1677ff",
    fontWeight: "bold",
  },
  valueRed: {
    fontSize: 14,
    color: "#e63946",
    fontWeight: "bold",
  },
  table: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 12,
  },
  scanHeader: {
    width: 60,
  },
  cell: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
  },
  cellAlignRight: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
  },
  scanCell: {
    width: 60,
    alignItems: "flex-end",
  },
  cellCode: {
    textAlign: "left",
    flex: 2,
  },
  cellAlignNumber: {
    textAlign: "right",
    paddingRight: 1,
  },
  alignRight: {
    textAlign: "center",
    paddingRight: 10,
  },
  scanButton: {
    backgroundColor: "#1677ff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  scanButtonDisabled: {
    backgroundColor: "#ccc",
  },
  scanText: {
    color: "white",
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    height: 80,
    textAlignVertical: "top",
  },
  inputs: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 0,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  inventoryList: {
    maxHeight: 300,
  },
  inventoryItemRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  inventoryItemText: {
    fontSize: 14,
    color: "#333",
  },
  // Signature Section Styles
  signatureContainer: {
    backgroundColor: "white",
    margin: 16,
   
    padding: 25,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  signatureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#1677ff',
  },
  signatureWrapper: {
    marginBottom: 20,
  },
  signatureItem: {
    marginBottom: 20,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  signatureImageContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  noSignature: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  noSignatureText: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginLeft: 8,
  },
});

export default ExportRequestScreen;