import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
import useInventoryService from "@/services/useInventoryService";
import usePaperService from "@/services/usePaperService";
import * as ImageManipulator from "expo-image-manipulator";
import useImportOrder from "@/services/useImportOrderService";
import StatusBadge from "@/components/StatusBadge";
import useAccountService from "@/services/useAccountService";

const SignReceiveScreen = () => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const signatureRef = useRef<SignatureViewRef>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [signMethod, setSignMethod] = useState<"draw" | "camera">("draw");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const dispatch = useDispatch();
  const { createPaper } = usePaperService();
  const { updateImportOrderDetailsByOrderId, updateImportOrderDetailMeasurement } = useImportOrderDetail();
  const { fetchInventoryItemById } = useInventoryService();

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

  const { getAccountByEmail } = useAccountService();

  const authState = useSelector((state: RootState) => state.auth);
  const { user: authUser, isLoggedIn, isLoggingOut } = authState;
  const email = authUser?.email;
  const [user, setUser] = useState({
    name: "",
    email: email || "",
    phone: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      // Don't fetch user data if logging out or not properly authenticated
      if (!email || !authUser || isLoggingOut || !isLoggedIn) {
        console.log("ImportReceiveSign: Skipping user fetch", {
          hasEmail: !!email,
          hasAuthUser: !!authUser,
          isLoggingOut,
          isLoggedIn
        });
        return;
      }

      try {
        console.log("ImportReceiveSign: Fetching user data for", email);
        const res = await getAccountByEmail(email);
        if (res?.content) {
          setUser((prev) => ({
            ...prev,
            name: res.content.fullName,
            email: res.content.email,
            phone: res.content.phone || "",
          }));
        }
      } catch (error) {
        console.log("ImportReceiveSign: Error fetching user data:", error);
      }
    };
    fetchUser();
  }, [email, authUser, isLoggingOut, isLoggedIn]);
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
      dispatch(setPaperData({ signReceiverUrl: img }));
    }
  };

  const handleClear = () => {
    dispatch(setPaperData({ signReceiverUrl: null }));
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
      dispatch(setPaperData({ signReceiverUrl: manipulated.uri }));
    }
  };

  const handleConfirm = async () => {
    // Prevent double execution
    if (isLoading) return;
    
    if (!paperData.signProviderUrl || !paperData.signReceiverUrl) {
      alert("Chưa có đủ chữ ký, vui lòng ký trước khi xác nhận.");
      return;
    }

    if (!importOrderId) {
      alert("Thiếu thông tin đơn nhập.");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Update actualQuantity for ORDER type only
      if (importOrder?.importType !== "RETURN") {
        console.log("🔍 DEBUG - importOrder.importType:", importOrder?.importType);
        console.log("🔍 DEBUG - products data:", products.map(p => ({
          id: p.id,
          name: p.name,
          providerCode: p.providerCode,
          hasProviderCode: !!(p.providerCode && p.providerCode.length > 0)
        })));

        const updatePayload = products.map((p) => {
          // Ưu tiên sử dụng scannedProviderCode (mã QR quét được), nếu không có thì dùng providerCode từ importOrderDetail
          let finalItemId = p.id; // Default: itemId

          console.log(`\n📦 Processing Product ${p.id} (${p.name}):`);
          console.log(`   - scannedProviderCode: ${p.scannedProviderCode || 'null'}`);
          console.log(`   - providerCode from importOrderDetail: ${p.providerCode ? JSON.stringify(p.providerCode) : 'null'}`);
          console.log(`   - itemId: ${p.id}`);
          console.log(`   - actual: ${p.actual}`);

          if (importOrder?.importType === "ORDER") {
            if (p.scannedProviderCode) {
              // Ưu tiên 1: Dùng mã QR quét được
              finalItemId = p.scannedProviderCode;
              console.log(`   ✅ SELECTED: scannedProviderCode = ${finalItemId}`);
            } else if (p.providerCode && p.providerCode.length > 0) {
              // Ưu tiên 2: Dùng providerCode từ importOrderDetail (trường hợp nhập thủ công)
              finalItemId = p.providerCode[0];
              console.log(`   ✅ SELECTED: providerCode[0] = ${finalItemId}`);
            } else {
              console.log(`   ✅ SELECTED: itemId = ${finalItemId}`);
            }
          }

          const payload = {
            itemId: finalItemId,
            actualQuantity: p.actual ?? 0,
          };

          console.log(`   📤 Payload for this product:`, JSON.stringify(payload, null, 2));

          return payload;
        });

        console.log("\n" + "=".repeat(80));
        console.log("🚀 FINAL UPDATE PAYLOAD TO API:");
        console.log(JSON.stringify(updatePayload, null, 2));
        console.log("=".repeat(80) + "\n");

        const updateResponse = await updateImportOrderDetailsByOrderId(
          importOrderId,
          updatePayload
        );

        if (!updateResponse) {
          alert("Lỗi: Không thể cập nhật số lượng sản phẩm. Vui lòng thử lại.");
          return;
        }
      }

      // Step 2: Update measurements for RETURN type inventory items only
      const inventoryProducts = products.filter(p => 
        p.inventoryItemId && 
        p.actualMeasurementValue !== undefined && 
        importOrder?.importType === "RETURN"
      );

      if (inventoryProducts.length > 0) {
        const measurementResults = [];
        
        for (const product of inventoryProducts) {
          if (!product.inventoryItemId || !product.importOrderDetailId) {
            measurementResults.push({ success: false, productId: product.id });
            continue;
          }

          try {
            // Get correct itemId from inventory item
            const inventoryItem = await fetchInventoryItemById(product.inventoryItemId);
            const correctItemId = inventoryItem?.item?.id || product.id;
            
            const measurementValue = Number(product.actualMeasurementValue || 0);
            const requestData = {
              itemId: correctItemId,
              actualQuantity: measurementValue > 0 ? 1 : 0, // RETURN logic: measurement > 0 → actual = 1
              actualMeasurement: measurementValue,
              inventoryItemId: product.inventoryItemId,
            };
            
            const importOrderDetailIdNum = Number(product.importOrderDetailId);
            if (isNaN(importOrderDetailIdNum) || importOrderDetailIdNum <= 0) {
              throw new Error(`Invalid importOrderDetailId: ${product.importOrderDetailId}`);
            }
            
            const result = await updateImportOrderDetailMeasurement(
              importOrderDetailIdNum,
              requestData
            );
            
            measurementResults.push({ success: !!result, productId: product.id });
            
          } catch (error) {
            console.log(`Error updating measurement for product ${product.id}:`, error);
            measurementResults.push({ success: false, productId: product.id });
          }
        }
        
        const failedMeasurements = measurementResults.filter(r => !r.success);
        if (failedMeasurements.length > 0) {
          alert(`Lỗi: Không thể cập nhật measurement cho ${failedMeasurements.length} inventory items. Vui lòng thử lại.`);
          return;
        }
      }

      // Bước 3: Tạo paper
      const paperResponse = await createPaper({
        ...paperData,
        signProviderName: paperData.signProviderName || "",
        signReceiverName: user.name || "",
      });

      if (paperResponse) {
        console.log("✅ Tạo paper thành công");
        router.push("/(tabs)/import");
      } else {
        console.log("❌ Không thể tạo paper.");
        alert("Lỗi: Không thể tạo phiếu. Vui lòng thử lại.");
      }
    } catch (error) {
      console.log("❌ Lỗi khi xác nhận:", error);
      alert("Có lỗi xảy ra khi xác nhận. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
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

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {/* <Label>Xác nhận thông tin sản phẩm</Label> */}
          <ProductListAccordion 
            products={products} 
            isReturnType={importOrder?.importType === "RETURN"}
          />
        </View>

        <View style={{ padding: 16 }}>
          {/* Chọn phương thức ký */}
          <View style={{ alignItems: "center" }}>
            <Text style={styles.label1}>
              Người nhận hàng kiểm tra thông tin và ký tên tại đây
            </Text>
          </View>

          {signMethod === "draw" ? (
            <View style={styles.signatureBox}>
              <Signature
                ref={signatureRef}
                onBegin={() => setScrollEnabled(false)}
                onOK={(signature) => {
                  dispatch(setPaperData({ signReceiverUrl: signature }));
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
          {/* {paperData.signReceiverUrl && (
            <View>
              <View className="w-full bg-white p-3 rounded-2xl mt-4 items-center">
                <Image
                  source={{ uri: paperData.signReceiverUrl }}
                  className="w-full h-64 rounded-md"
                  resizeMode="contain"
                />
              </View>
            </View>
          )} */}

          {/* Nút thao tác */}

          {paperData.signReceiverUrl && (
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
    </KeyboardAvoidingView>
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
