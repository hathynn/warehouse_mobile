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
import { Button } from "tamagui";
import { useDispatch } from "react-redux";
import { setProducts } from "@/redux/productSlice";
import { setPaperData } from "@/redux/paperSlice";

interface RouteParams {
  id: string;
}

const ImportOrderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { id } = route.params as RouteParams;
  const dispatch = useDispatch();
  const { fetchImportOrderDetailById, fetchImportOrderDetails } = useImportOrderDetailService();
  const [importOrderDetails, setImportOrderDetails] = useState<any[]>([]);
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
      batch: getPart("Batch"),
    };
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      const orderId = Number(id);

      // 1. Lấy thông tin đơn nhập
      const order = await fetchImportOrderById(orderId);
      if (!order || !order.importOrderDetailIds) return;

      // 2. Lấy thông tin chi tiết và inventory theo từng ID
      const enrichedDetails = await Promise.all(
        order.importOrderDetailIds.map(async (detailId: number) => {
          const detail = await fetchImportOrderDetailById(detailId);
          if (!detail) return null;

          const inventoryItems = await fetchInventoryItemsByImportOrderDetailId(
            detailId
          );

          return {
            id: `item_id ${detailId}`,
            productName: detail.itemName,
            sku: `Sản phẩm số ${detail.itemId}`,
            expectedQuantity: detail.expectQuantity,
            countedQuantity: detail.actualQuantity,
            products: inventoryItems.map((inv: any) => ({
              id: `ID ${inv.id}`,
            //   serialNumber: inv.itemCode || `Chưa có code`,
              location: parseStoredLocation(inv.storedLocationName),
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
          Thông tin đơn nhập #{id}
        </Text>
      </View>

      <ScrollView style={styles.container}>
        {/* Thông tin đơn nhập */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin chi tiết đơn nhập</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã phiếu</Text>
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
                <StatusBadge status={importOrder.status} />
              )}
            </View>
          </View>
        </View>

        {importOrder?.status === ImportOrderStatus.IN_PROGRESS ||
        importOrder?.status === ImportOrderStatus.NOT_STARTED ? (
            <TouchableOpacity
            style={styles.tamaButton}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                const response = await fetchImportOrderDetails(importOrder.importOrderId);
          
                const products = response.map((item: any) => ({
                    id: item.itemId,
                    name: item.itemName,
                    expect: item.expectQuantity,
                    actual: item.actualQuantity || 0,
                    importOrderId: importOrder.importOrderId,
                  }));
                  
                dispatch(setProducts(products));
                dispatch(setPaperData({ importOrderId: importOrder.importOrderId }));
          
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
            style={[styles.tamaButton, { backgroundColor: "#1a88ff", marginTop: 10 }]}
            activeOpacity={0.8}
            onPress={() => {
              router.push(`/import/paper-detail/${importOrder.paperIds}`);
            }}
          >
            <Text style={styles.tamaButtonText}>Xem chữ ký chứng từ</Text>
          </TouchableOpacity>
          
        ) : null}

        {/* Danh sách chi tiết đơn nhập - Sử dụng component mới */}
        <ImportOrderDetailsTable importOrderDetails={importOrderDetails} />
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
  valueRed: {
    fontSize: 14,
    color: "#e63946",
    fontWeight: "bold",
  },
  tamaButton: {
    backgroundColor: "#1677ff", // màu giống theme="active" của Tamagui
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
