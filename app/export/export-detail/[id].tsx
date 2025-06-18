import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useExportRequest from "@/services/useExportRequestService";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { setExportRequestDetail } from "@/redux/exportRequestDetailSlice";
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
        });
      }
    }, [id])
  );

  const savedExportRequestDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
  );

  if (loadingRequest || loadingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }
  // const updateAllActualQuantities = async (): Promise<boolean> => {
  //   let allSuccess = true;

  //   for (const p of savedExportRequestDetails) {
  //     const success = await updateActualQuantity(p.id, p.actualQuantity ?? 0);
  //     if (!success) {
  //       console.warn(`⚠️ Không thể cập nhật item ID: ${p.id}`);
  //       allSuccess = false;
  //       break;
  //     }
  //   }

  //   return allSuccess;
  // };

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

  // const handleSaveDraft = async () => {
  //   try {
  //     const success = await updateAllActualQuantities();

  //     if (success) {
  //       alert("Lưu nháp thành công")
  //       console.log("✅ Lưu nháp thành công (chưa cập nhật trạng thái)");
  //     } else {
  //       console.warn("❌ Lưu nháp thất bại ở một số dòng.");
  //     }
  //   } catch (error) {
  //     console.error("❌ Lỗi khi lưu nháp:", error);
  //   }
  // };

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

  const renderActionButton = () => {
    if (!exportRequest) return null;
    const status = exportRequest.status;

    switch (status) {
      case ExportRequestStatus.IN_PROGRESS:
        return (
          <View>
            {/* <StyledButton
              title="Cập nhật thủ công"
              onPress={() => setManualModalVisible(true)}
              style={{ backgroundColor: "#e0e0e0" }}
            /> */}
            {/* <StyledButton
              title="Lưu nháp"
              onPress={handleSaveDraft}
              style={{ marginTop: 12, backgroundColor: "#ccc" }}
            /> */}

            <StyledButton
              title="Xác nhận số lượng"
              onPress={handleConfirm}
              style={{ marginTop: 12 }}
            />
          </View>
        );

      // case ExportRequestStatus.COUNTED:
      //   return (
      //     <View>
      //       <StyledButton
      //         title="Cập nhật thủ công"
      //         onPress={() => setManualModalVisible(true)}
      //         style={{ backgroundColor: "#e0e0e0" }}
      //       />
      //       <StyledButton
      //         title="Lưu nháp"
      //         onPress={handleSaveDraft}
      //         style={{ marginTop: 12, backgroundColor: "#ccc" }}
      //       />

      //       <StyledButton
      //         title="Xác nhận số lượng"
      //         onPress={handleConfirm}
      //         style={{ marginTop: 12 }}
      //       />
      //     </View>
      //   );

      case ExportRequestStatus.WAITING_EXPORT:
        return (
          <StyledButton
            title="Tạo chứng từ"
            onPress={() => router.push(`/export/sign/warehouse-sign?id=${id}`)}
            style={{ marginTop: 12 }}
          />
        );
      case ExportRequestStatus.CONFIRMED:
      case ExportRequestStatus.COMPLETED:
        return (
          <StyledButton
            title="Xem chữ ký chứng từ"
            onPress={() => {
              router.push(`/import/paper-detail/${exportRequest.paperId}`);
            }}
          
            style={{ marginTop: 12 }}
          />
        );
      default:
        return null;
    }
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
            {/* <Text style={styles.label}>Mã phiếu xuất</Text>
            <Text style={styles.valueBlue}>
              {exportRequest?.exportRequestId}
            </Text> */}
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
              <StatusBadge status={exportRequest?.status || "UNKNOWN"} />
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

          {savedExportRequestDetails.map((detail: any) => {
            const isDisabled = detail.quantity === detail.actualQuantity;

            return (
              <View key={detail.id} style={styles.tableRow}>
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
                      onPress={() => {
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
              </View>
            );
          })}
        </View>

        <View className="p-5">{renderActionButton()}</View>
      </ScrollView>

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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
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
});

export default ExportRequestScreen;
