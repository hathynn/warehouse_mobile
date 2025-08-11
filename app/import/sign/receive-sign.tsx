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
        console.error("ImportReceiveSign: Error fetching user data:", error);
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
    if (isLoading) {
      console.log("⏳ Already processing, ignoring duplicate call");
      return;
    }
    
    if (!paperData.signProviderUrl || !paperData.signReceiverUrl) {
      console.log("❌ Chưa có đủ chữ ký, vui lòng ký trước khi xác nhận.");
      return;
    }

    if (!importOrderId) {
      console.log("❌ Thiếu importOrderId.");
      return;
    }

    setIsLoading(true);

    try {
      // Debug: Log importOrder để kiểm tra importType
      console.log("🔍 DEBUG importOrder:", {
        importOrder: importOrder,
        importType: importOrder?.importType,
        isReturn: importOrder?.importType === "RETURN",
        shouldSkipQuantityUpdate: importOrder?.importType === "RETURN"
      });
      
      // Bước 1: Cập nhật actualQuantity cho tất cả products trước (chỉ khi không phải RETURN)
      if (importOrder?.importType !== "RETURN") {
        console.log("🔄 Updating actualQuantity for all products (non-RETURN type)");
        const updatePayload = products.map((p) => ({
          itemId: p.id,
          actualQuantity: p.actual ?? 0,
        }));

        const updateResponse = await updateImportOrderDetailsByOrderId(
          importOrderId,
          updatePayload
        );

        if (!updateResponse) {
          console.log("❌ Không thể cập nhật actualQuantity.");
          alert("Lỗi: Không thể cập nhật số lượng sản phẩm. Vui lòng thử lại.");
          return;
        }
        
        console.log("✅ Cập nhật số lượng thành công");
      } else {
        console.log("ℹ️ Skip actualQuantity update for RETURN type");
      }

      // Bước 2: Kiểm tra và cập nhật measurement values cho inventory items (nếu có)
      const inventoryProducts = products.filter(p => 
        p.inventoryItemId && p.actualMeasurementValue !== undefined && p.actualMeasurementValue > 0
      );

      // Chỉ gọi API update measurement khi có inventory items
      if (inventoryProducts.length > 0) {
        console.log("🔄 Updating measurements for inventory items:", inventoryProducts.length);
        
        // SEQUENTIAL processing để tránh race condition
        const measurementResults = [];
        
        for (let i = 0; i < inventoryProducts.length; i++) {
          const product = inventoryProducts[i];
          
          if (!product.inventoryItemId || !product.importOrderDetailId) {
            console.warn("Missing data for product:", product);
            measurementResults.push({ success: false, productId: product.id });
            continue;
          }

          try {
            console.log(`📊 Processing measurement ${i + 1}/${inventoryProducts.length} for product ${product.id}`);
            
            // Fetch inventory item to get the correct itemId
            const inventoryItem = await fetchInventoryItemById(product.inventoryItemId);
            const correctItemId = inventoryItem?.item?.id || product.id; // Fallback to product.id if fetch fails
            
            console.log(`🔍 ItemId correction - Product.id: ${product.id}, Inventory.item.id: ${inventoryItem?.item?.id}, Using: ${correctItemId}`);
            
            // Debug inventory item structure if item.id is undefined
            if (!inventoryItem?.item?.id && inventoryItem) {
              console.log(`🔍 InventoryItem structure:`, Object.keys(inventoryItem));
              console.log(`🔍 InventoryItem.item:`, inventoryItem.item);
            }
            
            // Payload with correct itemId from inventory item
            // Format to match successful Swagger request exactly
            const requestData = {
              itemId: correctItemId,
              actualQuantity: importOrder?.importType === "RETURN" ? (product.actual ?? 0) : null,
              actualMeasurement: Number(product.actualMeasurementValue || 0),
              inventoryItemId: product.inventoryItemId,
            };
            
            console.log(`🔍 DEBUG actualQuantity logic:`, {
              importType: importOrder?.importType,
              isReturn: importOrder?.importType === "RETURN",
              productActual: product.actual,
              resultingActualQuantity: requestData.actualQuantity
            });
            
            console.log(`📡 Calling updateImportOrderDetailMeasurement (simplified):`, {
              importOrderDetailId: product.importOrderDetailId,
              requestData,
              product: {
                id: product.id,
                name: product.name,
                inventoryItemId: product.inventoryItemId,
                actualMeasurementValue: product.actualMeasurementValue,
                importOrderDetailId: product.importOrderDetailId
              }
            });
            
            // Debug: Verify importOrderDetailId and data types
            const importOrderDetailIdNum = Number(product.importOrderDetailId);
            console.log(`🔍 ImportOrderDetailId validation:`, {
              original: product.importOrderDetailId,
              type: typeof product.importOrderDetailId,
              converted: importOrderDetailIdNum,
              isNaN: isNaN(importOrderDetailIdNum),
              isValid: !isNaN(importOrderDetailIdNum) && importOrderDetailIdNum > 0
            });
            
            console.log(`🔍 DEBUGGING - ImportOrderDetailId: ${importOrderDetailIdNum}, ItemId being sent: ${correctItemId}, InventoryItemId: ${product.inventoryItemId}`);
            
            if (isNaN(importOrderDetailIdNum) || importOrderDetailIdNum <= 0) {
              throw new Error(`Invalid importOrderDetailId: ${product.importOrderDetailId}`);
            }
            
            const result = await updateImportOrderDetailMeasurement(
              importOrderDetailIdNum,
              requestData
            );
            
            console.log(`✅ API response for product ${product.id}:`, result);
            measurementResults.push({ success: !!result, productId: product.id });
            
            // Thêm delay nhỏ giữa các calls để tránh race condition
            if (i < inventoryProducts.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
            }
            
          } catch (error) {
            console.error(`❌ Error updating measurement for product ${product.id}:`, error);
            console.error(`❌ Error details:`, {
              message: error?.message,
              response: error?.response?.data,
              status: error?.response?.status,
              stack: error?.stack
            });
            measurementResults.push({ success: false, productId: product.id });
          }
        }
        const successfulMeasurements = measurementResults.filter(r => r.success).length;
        const failedMeasurements = measurementResults.filter(r => !r.success);
        
        console.log(`📊 Measurement update results: ${successfulMeasurements}/${inventoryProducts.length} successful`);
        
        // Nếu có inventory items, tất cả phải update thành công mới được tiếp tục
        if (failedMeasurements.length > 0) {
          // console.error("❌ Không thể cập nhật measurement cho tất cả inventory items:", failedMeasurements);
          alert(`Lỗi: Không thể cập nhật measurement cho ${failedMeasurements.length} inventory items. Vui lòng thử lại.`);
          return;
        }
        
        console.log("✅ Tất cả inventory item measurements đã được cập nhật thành công");
      } else {
        console.log("ℹ️ Không có inventory items nào cần cập nhật measurement");
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
      console.error("❌ Lỗi khi xác nhận:", error);
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
          <ProductListAccordion products={products} />
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
