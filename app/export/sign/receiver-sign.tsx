import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { Button } from "tamagui";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setPaperData } from "@/redux/paperSlice";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import usePaperService from "@/services/usePaperService";
import SimpleProductList from "@/components/ui/ProductList";
import { ExportRequestDetailType } from "@/types/exportRequestDetail.type";
import useExportRequest from "@/services/useExportRequestService";
import StatusBadge from "@/components/StatusBadge";
import { useFocusEffect } from "@react-navigation/native";

const SignReceiveScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
  const signatureRef = useRef<SignatureViewRef>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [exportDetails, setExportDetails] = useState<ExportRequestDetailType[]>(
    []
  );

  const { fetchExportRequestDetails, updateActualQuantity } =
    useExportRequestDetail();
  const { createPaper } = usePaperService();
  const paperData = useSelector((state: RootState) => state.paper);
  const { exportRequest, updateExportRequestStatus, fetchExportRequestById } =
    useExportRequest();
  const exportRequestId = paperData.exportRequestId;

  // useEffect(() => {
  //   console.log("EXPORT ID ", exportRequestId);
  // }, [exportRequestId]);

  useEffect(() => {
    if (exportRequestId) {
      fetchExportRequestById(exportRequestId);
    }
  }, [exportRequestId]);

  useEffect(() => {
    const fetchData = async () => {
      if (exportRequestId) {
        const data = await fetchExportRequestDetails(exportRequestId, 1, 100);
        setExportDetails(data);
      }
    };
    fetchData();
  }, [exportRequestId]);

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        fetchExportRequestById(id);
      }
    }, [id])
  );

  const handleClear = () => {
    setSignature(null);
    signatureRef.current?.clearSignature();
    dispatch(setPaperData({ signWarehouseUrl: null }));
  };

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(setPaperData({ signWarehouseUrl: img }));
    }
  };

  const handleConfirm = async () => {
    if (!paperData.signProviderUrl || !paperData.signWarehouseUrl) {
      console.warn("Cần đủ 2 chữ ký trước khi xác nhận.");
      return;
    }

    if (!exportRequestId) {
      console.warn("Thiếu exportRequestId");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Dataaaaaaa:", paperData);
      const response = await createPaper(paperData);
      console.log("Responseeeeee", response);
      if (response) {
        console.log("✅ Tạo phiếu thành công");

        const statusUpdated = await updateExportRequestStatus(
          exportRequestId,
          "COMPLETED"
        );
        console.log("2", statusUpdated);
        if (statusUpdated) {
          console.log("✅ Đã cập nhật trạng thái CONFIRMED");
        } else {
          console.warn("⚠️ Không thể cập nhật trạng thái");
        }

        router.push("/(tabs)/export");
      }
    } catch (err) {
      console.error("Lỗi khi tạo phiếu:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const mappedProducts = exportDetails.map((item) => ({
    id: item.id,
    name: `Sản phẩm #${item.itemId}`,
    actual: item.actualQuantity ?? 0,
    expect: item.quantity ?? 0,
  }));

  const getExportTypeLabel = (type: string | undefined) => {
    switch (type) {
      case "BORROWING":
        return "Mượn";
      case "RETURN":
        return "Trả";
      case "LIQUIDATION":
        return "Thanh lý";
      case "SELLING":
        return "Xuất bán";
      case "PRODUCTION":
        return "Xuất sản xuất";
      default:
        return "Không xác định";
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
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
          style={{ marginTop: 7 }}
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
          Người nhận hàng ký
        </Text>
      </View>
      {/* <View style={styles.card}>
        <Text style={styles.cardTitle}>Thông tin chi tiết yêu cầu</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Mã phiếu xuất</Text>
            <Text style={styles.valueBlue}>
              {exportRequest?.exportRequestId}
            </Text>
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
          <Text style={styles.label}>Người nhận hàng</Text>
          <Text style={styles.value}>{exportRequest?.receiverName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>SĐT người nhận hàng</Text>
          <Text style={styles.value}>{exportRequest?.receiverPhone}</Text>
        </View>

        <View style={styles.row}>
            <Text style={styles.label}>Tình trạng yêu cầu</Text>
            <Text style={styles.valueRed}>
              <StatusBadge status={exportRequest?.status || "UNKNOWN"} />
            </Text>
          </View>
      </View> */}
      <View style={{ paddingHorizontal: 16, paddingTop:16 }}>
        <SimpleProductList
          products={exportDetails.map((item) => ({
            id: item.id,
            name: `Sản phẩm #${item.itemId}`,
            actual: item.actualQuantity,
            expect: item.quantity,
          }))}
        />
      </View>

      <View style={{ padding: 16 }}>
        {/* Danh sách sản phẩm */}

        {/* Chữ ký người giao hàng
          {paperData.signProviderUrl && (
            <>
              <Text style={[styles.label, { marginTop: 24 }]}>
                Chữ ký người giao hàng
              </Text>
              <View
                style={{
                  backgroundColor: "#fff",
                  padding: 12,
                  borderRadius: 10,
                }}
              >
                <Image
                  source={{ uri: paperData.signProviderUrl }}
                  style={{
                    width: "100%",
                    height: 220,
                    borderRadius: 10,
                  }}
                  resizeMode="contain"
                />
              </View>
            </>
          )} */}

        {/* Ký tên */}
        <Text style={styles.label1}>
          Người nhận hàng kiểm tra thông tin và ký tên tại đây
        </Text>

        <View style={styles.signatureBox}>
          <Signature
            ref={signatureRef}
            onBegin={() => setScrollEnabled(false)}
            onOK={(img) => dispatch(setPaperData({ signWarehouseUrl: img }))}
            onEnd={() => {
              setScrollEnabled(true);
              handleEnd();
            }}
            descriptionText="Ký tên tại đây"
            imageType="image/png"
            webStyle={`
                .m-signature-pad { height: 100% !important; }
                .m-signature-pad--body { height: 100% !important; }
                .m-signature-pad--footer { display: none; }
                body, html { height: 100%; margin: 0; padding: 0; }
              `}
            style={{ flex: 1, height: 300 }}
          />
        </View>

        {paperData.signWarehouseUrl && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginVertical: 20,
            }}
          >
            <TouchableOpacity
              onPress={handleClear}
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: "#DDDDDD",
                borderRadius: 8,
                marginRight: 5,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "black",
                }}
              >
                Xóa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: isLoading ? "#a0c4ff" : "#1677ff", // màu nhạt khi loading
                borderRadius: 8,
                marginLeft: 5,
                alignItems: "center",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: "white" }}>Xác nhận</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label1: {
    fontWeight: "300",
    fontStyle: "italic",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  signatureBox: {
    height: 300,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "white",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
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
});

export default SignReceiveScreen;
