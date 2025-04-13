import React, { useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useExportRequest from "@/services/useExportRequestService";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { setExportRequestDetail } from "@/redux/exportRequestDetailSlice";
import { RootState } from "@/redux/store";

interface RouteParams {
  id: string;
}

const ExportRequestScreen: React.FC = () => {
  const route = useRoute();
  const { id } = route.params as RouteParams;
  const dispatch = useDispatch();

  const {
    loading: loadingRequest,
    exportRequest,
    fetchExportRequestById,
  } = useExportRequest();

  const {
    loading: loadingDetails,
    fetchExportRequestDetails,
  } = useExportRequestDetail();

  useEffect(() => {
    if (id) {
      const requestId = Number(id);
      fetchExportRequestById(requestId);
      fetchExportRequestDetails(requestId, 1, 10).then((data) => {
        console.log("📤 Lưu vào Redux:", data);
        dispatch(setExportRequestDetail(data)); // save vào Redux
      });
    }
  }, [id]);

  const savedExportRequestDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
  );

  console.log("🧠 Redux exportRequestDetail:", savedExportRequestDetails);

  if (loadingRequest || loadingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <ScrollView style={styles.container}>
        {/* Header */}
        <View className="px-5">
          <View className="bg-[#1677ff] px-4 py-3 flex-row justify-between items-center rounded-2xl">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">
              Xác nhận đơn nhập số <Text className="text-blue-200">#{id}</Text>
            </Text>
          </View>
        </View>

        {/* Thông tin yêu cầu */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin chi tiết yêu cầu</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã đơn hàng</Text>
            <Text style={styles.valueBlue}>
              #{exportRequest?.exportRequestId}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tình trạng yêu cầu</Text>
            <Text style={styles.valueRed}>{exportRequest?.status}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày tạo đơn</Text>
            <Text style={styles.value}>{exportRequest?.exportDate}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày mong muốn xuất</Text>
            <Text style={styles.value}>{exportRequest?.expectedReturnDate}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loại xuất</Text>
            <Text style={styles.value}>{exportRequest?.type}</Text>
          </View>
        </View>

        {/* Danh sách mặt hàng */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.cellCode]}>Mã hàng</Text>
            <Text style={styles.cell}>Cần</Text>
            <Text style={styles.cell}>Tồn</Text>
            <Text style={[styles.cell, { textAlign: "right" }]}></Text>
          </View>

          {Array.isArray(savedExportRequestDetails) &&
            savedExportRequestDetails.map((detail: any) => (
              <View key={detail.id} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellCode]}>#{detail.itemId}</Text>
                <Text style={styles.cell}>{detail.quantity}</Text>
                <Text style={styles.cell}>{detail.actualQuantity}</Text>
                <TouchableOpacity style={styles.scanButton} onPress={() => { router.push(`/export/scan-qr`) }}>
                  <Text style={styles.scanText}>Scan</Text>
                </TouchableOpacity>
              </View>
            ))}

        </View>

        {/* Tình trạng tồn kho */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Tình trạng tồn kho</Text>
          <TextInput
            placeholder="Nhập tình trạng"
            style={styles.input}
            multiline
          />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  cell: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
  },
  cellCode: {
    textAlign: "left",
    flex: 2,
  },
  scanButton: {
    backgroundColor: "#1677ff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
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
});

export default ExportRequestScreen;
