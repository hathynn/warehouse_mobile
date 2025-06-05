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
  const { updateExportRequestStatus } = useExportRequest();
  const exportRequestId = paperData.exportRequestId;

  // useEffect(() => {
  //   console.log("EXPORT ID ", exportRequestId);
  // }, [exportRequestId]);

  useEffect(() => {
    const fetchData = async () => {
      if (exportRequestId) {
        const data = await fetchExportRequestDetails(exportRequestId, 1, 100);
        setExportDetails(data);
      }
    };
    fetchData();
  }, [exportRequestId]);

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
console.log("Dataaaaaaa:", paperData)
      const response = await createPaper(paperData);
      console.log("Responseeeeee",response)
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

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#1677ff",
          paddingTop: insets.top,
          paddingBottom: 16,

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

      <View style={{ padding: 16, height: 415 }}>
        <SimpleProductList
          products={exportDetails.map((item) => ({
            id: item.id,
            name: `Sản phẩm #${item.itemId}`,
            actual: item.actualQuantity,
            expect: item.quantity,
          }))}
        />
      </View>

      <ScrollView scrollEnabled={scrollEnabled}>
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
          <Text style={[styles.label, { marginTop: 24 }]}>
            Người nhận ký tên
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
            <View style={styles.actions}>
              <Button flex={1} onPress={handleClear}>
                Xóa
              </Button>

              <Button flex={1} onPress={handleConfirm} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  "Tạo chứng từ"
                )}
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
    marginTop: 16,
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
});

export default SignReceiveScreen;
