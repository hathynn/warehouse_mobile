import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { Button, Label } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setPaperData } from "@/redux/paperSlice";
import ProductListAccordion from "@/components/ui/ProductList";
import { router } from "expo-router";
import { UploadCloud } from "@tamagui/lucide-icons";
import { createSelector } from "reselect";
import useImportOrderDetail from "@/services/useImportOrderDetailService";
import usePaperService from "@/services/usePaperService";
import * as ImageManipulator from "expo-image-manipulator";
import useImportOrder from "@/services/useImportOrderService";
import StatusBadge from "@/components/StatusBadge";

const SignReceiveScreen = () => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const signatureRef = useRef<SignatureViewRef>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [signMethod, setSignMethod] = useState<"draw" | "camera">("draw");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const dispatch = useDispatch();
  const { createPaper } = usePaperService();
  const { updateImportOrderDetailsByOrderId } = useImportOrderDetail();

  const selectProducts = (state: RootState) => state.product.products;
  const selectImportOrderId = (state: RootState) => state.paper.importOrderId;

  const selectProductsByImportOrderId = createSelector(
    [selectProducts, selectImportOrderId],
    (products, importOrderId) =>
      products.filter((p) => String(p.importOrderId) === importOrderId)
  );

  const importOrderId = useSelector(selectImportOrderId);
  const products = useSelector(selectProductsByImportOrderId);
  const paperData = useSelector((state: RootState) => state.paper);
const {
    loading: loadingOrder,
    importOrder,
    fetchImportOrderById,
  } = useImportOrder();

  
  useEffect(() => {
    const loadOrder = async () => {
      if (!importOrderId) return;
      const order = await fetchImportOrderById(importOrderId);
  
      if (order) {
        console.log("🧾 Import Order:", order);
      } else {
        console.warn("⚠️ Không tìm thấy đơn nhập");
      }
    };
  
    loadOrder();
  }, [importOrderId]);

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      dispatch(setPaperData({ signWarehouseUrl: img }));
    }
  };

  const handleClear = () => {
    dispatch(setPaperData({ signWarehouseUrl: null }));
    signatureRef.current?.clearSignature();
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.3, // bạn có thể để 1, ta sẽ nén sau
    });

    if (!result.canceled && result.assets.length > 0) {
      const originalUri = result.assets[0].uri;

      // NÉN ảnh lại
      const manipulated = await ImageManipulator.manipulateAsync(
        originalUri,
        [], // không resize
        {
          compress: 0.3, // giá trị từ 0 - 1
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setCapturedImage(manipulated.uri);
      dispatch(setPaperData({ signWarehouseUrl: manipulated.uri }));
    }
  };

  const handleConfirm = async () => {
    if (!paperData.signProviderUrl || !paperData.signWarehouseUrl) {
      console.log("❌ Chưa có đủ chữ ký, vui lòng ký trước khi xác nhận.");
      return;
    }

    if (!importOrderId) {
      console.log("❌ Thiếu importOrderId.");
      return;
    }

    setIsLoading(true);

    const updatePayload = products.map((p) => ({
      itemId: p.id,
      actualQuantity: p.actual ?? 0,
    }));

    try {
      const updateResponse = await updateImportOrderDetailsByOrderId(
        importOrderId,
        updatePayload
      );
      console.log("Cập nhật số lượng thành công");
      if (updateResponse) {
        // console.log("🔍 paperData gửi lên:", paperData);
        const paperResponse = await createPaper(paperData);
        if (paperResponse) {
          console.log("✅ Tạo paper thành công");
          router.push("/(tabs)/import");
        }
      } else {
        console.log("❌ Không thể cập nhật actualQuantity.");
      }
    } catch (error) {
      console.error("❌ Lỗi khi xác nhận:", error);
    } finally {
      setIsLoading(false);
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
          Người nhận hàng ký
        </Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >

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
            {importOrder?.status && <StatusBadge status={importOrder.status} />}
          </View>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* <Label>Xác nhận thông tin sản phẩm</Label> */}
        <ProductListAccordion products={products} />
      </View>
      
        <View style={{ padding: 16 }}>
    

          {/* Chọn phương thức ký */}
          <View style={{ alignItems: "center" }}>
            <Text style={styles.label1}>Người nhận hàng kiểm tra thông tin và ký tên tại đây</Text>
        
          </View>

          {signMethod === "draw" ? (
            <View style={styles.signatureBox}>
              <Signature
                ref={signatureRef}
                onBegin={() => setScrollEnabled(false)}
                onOK={(signature) => {
                  dispatch(setPaperData({ signWarehouseUrl: signature }));
                }}
                onEnd={() => {
                  setScrollEnabled(true);
                  handleEnd();
                }}
                descriptionText="Ký tên tại đây"
                imageType="image/png"
                webStyle={`
                  .m-signature-pad { height: 100% !important; }
                  .m-signature-pad--body { height: 100% !important; }
                  .m-signature---fopadoter { display: none; }
                  body, html { height: 100%; margin: 0; padding: 0; }
                `}
                style={{ flex: 1, height: 400 }}
              />
            </View>
          ) : (
            <View style={{ alignItems: "center" }}>
              <Button onPress={takePhoto}>Chụp lại 📷</Button>
              {capturedImage && (
                <Image
                  source={{ uri: capturedImage }}
                  style={{
                    width: "100%",
                    height: 400,
                    marginTop: 16,
                    borderRadius: 12,
                  }}
                  resizeMode="contain"
                />
              )}
            </View>
          )}

          {/* Hiển thị chữ ký */}
          {/* {paperData.signWarehouseUrl && (
            <View>
              <View className="w-full bg-white p-3 rounded-2xl mt-4 items-center">
                <Image
                  source={{ uri: paperData.signWarehouseUrl }}
                  className="w-full h-64 rounded-md"
                  resizeMode="contain"
                />
              </View>
            </View>
          )} */}

          {/* Nút thao tác */}
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
 label1: {
    fontWeight: "300",
    fontStyle: "italic",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },

  signatureBox: {
    height: 400,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "white",
  },
  captureBtn: {
    backgroundColor: "#1677ff",
    padding: 12,
    borderRadius: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
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
});

export default SignReceiveScreen;
