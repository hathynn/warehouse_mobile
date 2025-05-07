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
import { RootState, store } from "@/redux/store";
import { ExportRequestStatus } from "@/types/exportRequest.type";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface RouteParams {
  id: string;
}

const ExportRequestScreen: React.FC = () => {
  const insets = useSafeAreaInsets();


  const route = useRoute();
  const { id } = route.params as RouteParams;
  const dispatch = useDispatch();
  const { updateActualQuantity, confirmCountedExportRequest } =
    useExportRequestDetail();

  const {
    loading: loadingRequest,
    exportRequest,
    fetchExportRequestById,
  } = useExportRequest();

  const { loading: loadingDetails, fetchExportRequestDetails } =
    useExportRequestDetail();
  const isCounted = exportRequest?.status === ExportRequestStatus.COUNTED;

  useEffect(() => {
    if (id) {
      const requestId = Number(id);

      // GỌI LẤY THÔNG TIN EXPORT REQUEST
      fetchExportRequestById(requestId); // <<--- dòng này bị thiếu

      fetchExportRequestDetails(requestId, 1, 10).then((newData) => {
        const oldDetails = store.getState().exportRequestDetail.details;

        const mergedDetails = newData.map((newItem) => {
          const oldItem = oldDetails.find((o) => o.id === newItem.id);
          return {
            ...newItem,
            actualQuantity: oldItem?.actualQuantity ?? 0,
          };
        });
        console.log("🧾 exportRequest:", exportRequest);
        dispatch(setExportRequestDetail(mergedDetails));
      });
    }
  }, [id]);

  const savedExportRequestDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
  );

  // console.log("🧠 Redux exportRequestDetail:", savedExportRequestDetails);

  if (loadingRequest || loadingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const handleConfirm = async () => {
    try {
      // 1. Cập nhật actualQuantity từng dòng
      for (const p of savedExportRequestDetails) {
        const success = await updateActualQuantity(p.id, p.actualQuantity ?? 0);
        if (!success) {
          console.warn(`⚠️ Không thể cập nhật item ID: ${p.id}`);
        }
      }

      console.log("✅ Cập nhật actualQuantity thành công");

      // 2. Gọi API xác nhận đã kiểm đếm
      const confirmSuccess = await confirmCountedExportRequest(Number(id));
      if (confirmSuccess) {
        console.log("✅ Đã xác nhận kiểm đếm thành công");
        router.push("/(tabs)/export");
      } else {
        console.error("❌ Xác nhận kiểm đếm thất bại");
      }
    } catch (error) {
      console.error("❌ Lỗi khi xác nhận tổng thể:", error);
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
            <Text style={styles.value}>
              {exportRequest?.expectedReturnDate}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loại xuất</Text>
            <Text style={styles.value}>{exportRequest?.type}</Text>
          </View>
        </View>

        {/* Danh sách mặt hàng */}
        <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
  <Text style={[styles.cellCode]}>Mã hàng</Text>
  <Text style={[styles.cellAlignRight]}>Cần</Text>
  <Text style={[styles.cellAlignRight]}>Tồn</Text>
  {!isCounted && <Text style={styles.scanHeader}></Text>}
</View>


          {savedExportRequestDetails.map((detail: any) => {
  const isDisabled = detail.quantity === detail.actualQuantity;

  return (
    <View key={detail.id} style={styles.tableRow}>
    <Text style={[styles.cellCode]}>#{detail.itemId}</Text>
    <Text style={[styles.cellAlignRight]}>{detail.quantity}</Text>
    <Text style={[styles.cellAlignRight]}>{detail.actualQuantity}</Text>
  
    {!isCounted && (
      <View style={styles.scanCell}>
        <TouchableOpacity
          style={[
            styles.scanButton,
            isDisabled && styles.scanButtonDisabled,
          ]}
          disabled={isDisabled}
          onPress={() => {
            router.push(`/export/scan-qr?id=${exportRequest?.exportRequestId}`);
          }}
        >
          <Text style={styles.scanText}>
            {isDisabled ? "Đã đủ" : "Scan"}
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
  );
})}
        </View>

        {/* Tình trạng tồn kho */}
        {/* <View style={styles.card}>
          <Text style={styles.inputLabel}>Tình trạng tồn kho</Text>
          <TextInput
            placeholder="Nhập tình trạng"
            style={styles.input}
            multiline
          />
        </View> */}

        {exportRequest?.status !== "COUNTED" && (
          <View className="p-5">
            <TouchableOpacity
              onPress={handleConfirm}
              className="bg-[#0d1925] px-5 py-4 rounded-full"
            >
              <Text className="text-white font-semibold text-sm text-center">
                Xác nhận số lượng
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingRight: 1, // canh đều cho đẹp mắt
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
});

export default ExportRequestScreen;
