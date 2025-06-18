import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setPaperData } from "@/redux/paperSlice";
import { router } from "expo-router";
import { createSelector } from "reselect";
import ProductListAccordion from "@/components/ui/ProductList";
import { Button } from "tamagui";
import * as ImageManipulator from "expo-image-manipulator";
import useImportOrder from "@/services/useImportOrderService";
import StatusBadge from "@/components/StatusBadge";

const SignDeliverScreen = () => {
  const insets = useSafeAreaInsets();
  const signatureRef = useRef<SignatureViewRef>(null);
  const dispatch = useDispatch();
  const [signMethod, setSignMethod] = useState<"draw" | "camera">("draw");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const selectProducts = (state: RootState) => state.product.products;
  const selectImportOrderId = (state: RootState) => state.paper.importOrderId;
  const selectProductsByImportOrderId = createSelector(
    [selectProducts, selectImportOrderId],
    (products, importOrderId) =>
      products.filter((p) => String(p.importOrderId) === importOrderId)
  );
  const products = useSelector(selectProductsByImportOrderId);
  
  const {
    loading: loadingOrder,
    importOrder,
    fetchImportOrderById,
  } = useImportOrder();

  



const importOrderId = useSelector((state: RootState) => state.paper.importOrderId);

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


  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1, // chụp full trước
    });

    if (!result.canceled && result.assets.length > 0) {
      const originalUri = result.assets[0].uri;

      // ✅ NÉN ảnh lại
      const manipulated = await ImageManipulator.manipulateAsync(
        originalUri,
        [], // không resize
        {
          compress: 0.3, // từ 0 - 1, càng nhỏ thì càng nén nhiều
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setCapturedImage(manipulated.uri);
      dispatch(setPaperData({ signProviderUrl: manipulated.uri }));
    }
  };

  const handleClear = () => {
    if (signMethod === "camera") {
      setCapturedImage(null);
      dispatch(setPaperData({ signProviderUrl: null }));
    } else {
      signatureRef.current?.clearSignature();
      dispatch(setPaperData({ signProviderUrl: null }));
    }
  };

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(setPaperData({ signProviderUrl: img }));
    }
  };

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
          Người giao hàng ký
        </Text>
      </View>
   <ScrollView scrollEnabled={scrollEnabled}>
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
        <ProductListAccordion products={products} />
      </View>
   
        <View style={{ padding: 16 }}>
          {/* Chọn phương thức ký */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={styles.label1}>Người giao hàng kiểm tra thông tin và ký tên tại đây</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginVertical: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setSignMethod("draw");
                  setCapturedImage(null);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: signMethod === "draw" ? "#1677ff" : "#eee",
                  borderRadius: 8,
                  marginRight: 5,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: signMethod === "draw" ? "white" : "black",
                  }}
                >
                  Ký trực tiếp
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setSignMethod("camera");
                  await takePhoto();
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: signMethod === "camera" ? "#1677ff" : "#eee",
                  borderRadius: 8,
                  marginLeft: 5,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: signMethod === "camera" ? "white" : "black",
                  }}
                >
                  Chụp ảnh chữ ký
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Khu vực ký */}
          {signMethod === "draw" ? (
            <View style={styles.signatureBox}>
              <Signature
                ref={signatureRef}
                onBegin={() => setScrollEnabled(false)}
                onOK={(img) => {
                  dispatch(setPaperData({ signProviderUrl: img }));
                }}
                onEnd={() => {
                  setScrollEnabled(true); // Bật lại scroll sau khi ký
                  handleEnd(); // Xử lý ảnh
                }}
                descriptionText="Ký tên tại đây"
                imageType="image/png"
                webStyle={`
                  .m-signature-pad { height: 120% !important; }
                  .m-signature-pad--body { height: 100% !important; }
                  .m-signature-pad--footer { display: none; }
                  body, html { height: 100%; margin: 0; padding: 0; }
                `}
                style={{ flex: 1, height: 300 }}
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

          {/* Hành động */}
          <View style={styles.actions}>
            <Button onPress={handleClear} flex={1}>
              Xóa
            </Button>
            <Button
              onPress={() => router.push("/import/sign/receive-sign")}
              flex={1}
            >
              Tiếp tục
            </Button>
          </View>
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

export default SignDeliverScreen;
