import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useImportOrder from "@/services/useImportOrderService";
import { ImportOrderStatus } from "@/types/importOrder.type";
import StatusBadge from "@/components/StatusBadge";
import useImportOrderDetailService from "@/services/useImportOrderDetailService";
import useInventoryService from "@/services/useInventoryService";
import ImportOrderDetailsTable from "@/components/ui/ImportOrderDetailsTable";
import { useDispatch } from "react-redux";
import { setProducts } from "@/redux/productSlice";
import { setPaperData } from "@/redux/paperSlice";
import usePaperService from "@/services/usePaperService";

interface RouteParams {
  id: string;
}

const ImportOrderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { id } = route.params as RouteParams;
  const dispatch = useDispatch();
  const { fetchImportOrderDetailById, fetchImportOrderDetails } =
    useImportOrderDetailService();
  const { updateImportOrderToStored } = useImportOrder();
  const [importOrderDetails, setImportOrderDetails] = useState<any[]>([]);
  const { resetPaperById } = usePaperService();

  const { fetchInventoryItemsByImportOrderDetailId } = useInventoryService();

  const {
    loading: loadingOrder,
    importOrder,
    fetchImportOrderById,
  } = useImportOrder();

  const parseStoredLocation = (storedLocationName: string) => {
    const parts = storedLocationName.split(",");
    const getPart = (label: string) =>
      parts
        .find((p) => p.includes(label))
        ?.split(":")[1]
        ?.trim() || "--";

    return {
      zone: getPart("Zone"),
      floor: getPart("Floor"),
      row: getPart("Row"),
      line: getPart("Line"),
    };
  };

  const loadData = async () => {
    if (!id) return;
    const orderId = id;

    // 1. Lấy thông tin đơn nhập
    const order = await fetchImportOrderById(orderId);

    if (!order || !order.importOrderDetails) return;
    // 2. Lấy thông tin chi tiết và inventory theo từng ID
    const enrichedDetails = await Promise.all(
      order.importOrderDetails.map(async (detail: any) => {
        const detailData = await fetchImportOrderDetailById(
          detail.importOrderDetailId
        );
        if (!detailData) return null;

        const inventoryItems = await fetchInventoryItemsByImportOrderDetailId(
          detail.importOrderDetailId
        );

        return {
          id: detailData.importOrderDetailId.toString(),
          productName: detailData.itemName,
          sku: `Mã sản phẩm ${detailData.itemId}`,
          expectedQuantity: detailData.expectQuantity,
          countedQuantity: detailData.actualQuantity,
          status: order.status,
          products: inventoryItems.map((inv: any) => ({
            id: inv.id,
            serialNumber: inv.itemCode || `Chưa có code`,
            location: inv.storedLocationName
              ? parseStoredLocation(inv.storedLocationName)
              : {
                  zone: "Không rõ vị trí",
                  floor: "Không rõ vị trí",
                  row: "Không rõ vị trí",
                  line: "Không rõ vị trí",
                },
          })),
        };
      })
    );

    // 3. Bỏ null nếu có dòng lỗi
    setImportOrderDetails(enrichedDetails.filter(Boolean));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Handler cho việc hoàn thành quy trình nhập kho
  const handleStorageComplete = async () => {
    try {
      await updateImportOrderToStored(importOrder.importOrderId);
      await fetchImportOrderById(importOrder.importOrderId);

      // Gọi lại loadData để refresh table ngay lập tức
      await loadData();

      // Có thể thêm thông báo thành công ở đây
    } catch (error) {
      console.error("Cập nhật trạng thái thất bại:", error);
      // Có thể thêm thông báo lỗi ở đây
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      const orderId = id;

      // 1. Lấy thông tin đơn nhập
      const order = await fetchImportOrderById(orderId);

      if (!order || !order.importOrderDetails) return;
      // 2. Lấy thông tin chi tiết và inventory theo từng ID
      const enrichedDetails = await Promise.all(
        order.importOrderDetails.map(async (detail: any) => {
          const detailData = await fetchImportOrderDetailById(
            detail.importOrderDetailId
          );
          if (!detailData) return null;

          const inventoryItems = await fetchInventoryItemsByImportOrderDetailId(
            detail.importOrderDetailId
          );

          return {
            id: detailData.importOrderDetailId.toString(),
            productName: detailData.itemName,
            sku: `Mã sản phẩm ${detailData.itemId}`,
            expectedQuantity: detailData.expectQuantity,
            countedQuantity: detailData.actualQuantity,
            status: order.status,
            products: inventoryItems.map((inv: any) => ({
              id: inv.id, // Sửa lại để trùng với interface
              serialNumber: inv.itemCode || `Chưa có code`,
              location: inv.storedLocationName
                ? parseStoredLocation(inv.storedLocationName)
                : {
                    zone: "Không rõ vị trí",
                    floor: "Không rõ vị trí",
                    row: "Không rõ vị trí",
                    line: "Không rõ vị trí",
                  },
            })),
          };
        })
      );

      // 3. Bỏ null nếu có dòng lỗi
      setImportOrderDetails(enrichedDetails.filter(Boolean));
    };

    loadData();
  }, [id]);

  if (loadingOrder) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: "#1677ff",
          paddingTop: insets.top,
          paddingBottom: 16,
          paddingHorizontal: 17,
          flexDirection: "row",
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
            flex: 1,
            textAlign: "center",
          }}
        >
          {id}
        </Text>
      </View>

      <ScrollView style={styles.container}>
        {/* Thông tin đơn nhập */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin chi tiết đơn nhập</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã đơn nhập</Text>
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeText}>{importOrder?.importOrderId}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Mã phiếu nhập</Text>
            <Text style={styles.value}>{importOrder?.importRequestId}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày dự nhập</Text>
            <Text style={styles.value}>
              {importOrder?.dateReceived
                ? new Date(importOrder.dateReceived).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Giờ dự nhập</Text>
            <Text style={styles.value}>{importOrder?.timeReceived}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tình trạng</Text>
            <View>
              {importOrder?.status && (
                <StatusBadge status={importOrder.status} flow="import" />
              )}
            </View>
          </View>
        </View>

        {/* Các button action dựa theo status */}
        {importOrder?.status === ImportOrderStatus.IN_PROGRESS ||
        importOrder?.status === ImportOrderStatus.NOT_STARTED ? (
          <TouchableOpacity
            style={styles.tamaButton}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                const response = await fetchImportOrderDetails(
                  importOrder.importOrderId
                );

                const products = response.map((item: any) => ({
                  id: item.itemId,
                  name: item.itemName,
                  expect: item.expectQuantity,
                  actual: item.actualQuantity || 0,
                  importOrderId: importOrder.importOrderId,
                }));

                dispatch(setProducts(products));
                dispatch(
                  setPaperData({ importOrderId: importOrder.importOrderId })
                );

                router.push("/import/scan-qr");
              } catch (error) {
                console.error("Lỗi khi tạo chứng từ:", error);
              }
            }}
          >
            <Text style={styles.tamaButtonText}>Kiểm đếm đơn nhập</Text>
          </TouchableOpacity>
        ) : importOrder?.status === ImportOrderStatus.COMPLETED &&
          importOrder?.paperIds ? (
          <TouchableOpacity
            style={[
              styles.tamaButton,
              { backgroundColor: "#1a88ff", marginTop: 10 },
            ]}
            activeOpacity={0.8}
            onPress={() => {
              router.push(`/import/paper-detail/${importOrder.paperIds}`);
            }}
          >
            <Text style={styles.tamaButtonText}>Xem chữ ký chứng từ</Text>
          </TouchableOpacity>
        ) : importOrder?.status === ImportOrderStatus.COUNT_AGAIN_REQUESTED &&
          importOrder?.paperIds ? (
          <TouchableOpacity
            style={[
              styles.tamaButton,
              { backgroundColor: "#1a88ff", marginTop: 10 },
            ]}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                if (!importOrder.paperIds) {
                  throw new Error("Không tìm thấy paperId để reset");
                }

                await resetPaperById(importOrder.paperIds);

                const response = await fetchImportOrderDetails(
                  importOrder.importOrderId
                );

                const products = response.map((item: any) => ({
                  id: item.itemId,
                  name: item.itemName,
                  expect: item.expectQuantity,
                  actual: item.actualQuantity || 0,
                  importOrderId: importOrder.importOrderId,
                }));

                dispatch(setProducts(products));
                dispatch(
                  setPaperData({ importOrderId: importOrder.importOrderId })
                );

                router.push(`/import/confirm/${importOrder.importOrderId}`);
              } catch (error) {
                console.error("❌ Lỗi khi reset và kiểm đếm lại:", error);
              }
            }}
          >
            <Text style={styles.tamaButtonText}>Kiểm đếm lại số lượng</Text>
          </TouchableOpacity>
        ) : null}

        {/* Component ImportOrderDetailsTable với checkbox và quy trình nhập kho */}
        <ImportOrderDetailsTable
          importOrderDetails={importOrderDetails}
          onStorageComplete={handleStorageComplete}
        />
      </ScrollView>
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
    alignItems: "center",
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
  tamaButton: {
    backgroundColor: "#1677ff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 16,
  },
  tamaButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ImportOrderScreen;
