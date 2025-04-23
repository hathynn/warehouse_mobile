import React, { useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

const SignReceiveScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [signMethod, setSignMethod] = useState<"draw" | "upload">("draw");
  const signatureRef = useRef<SignatureViewRef>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const dispatch = useDispatch();
  const { createPaper } = usePaperService();
  const { updateImportOrderDetailsByOrderId } = useImportOrderDetail();

  const selectProducts = (state: RootState) => state.product.products;
  const selectImportOrderId = (state: RootState) => state.paper.importOrderId;

  const selectProductsByImportOrderId = createSelector(
    [selectProducts, selectImportOrderId],
    (products, importOrderId) =>
      products.filter((p) => p.importOrderId === importOrderId)
  );

  const importOrderId = useSelector(selectImportOrderId);
  const products = useSelector(selectProductsByImportOrderId);
  const paperData = useSelector((state: RootState) => state.paper);

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

  const pickSignatureImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: false,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      dispatch(setPaperData({ signWarehouseUrl: imageUri }));
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

      if (updateResponse) {
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
    <SafeAreaView className="flex-1 p-2">
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <View className="px-3">
          {/* Header */}
          <View className="bg-[#1677ff] mb-2 px-4 py-4 flex-row justify-between items-center rounded-2xl">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">
              Người nhận hàng ký
            </Text>
          </View>

          {/* Danh sách sản phẩm */}
          <View className="items-center">
            <Label>Xác nhận thông tin sản phẩm</Label>
          </View>
          <ProductListAccordion products={products} />

          {/* Chữ ký người giao hàng */}
          {paperData.signProviderUrl && (
            <View className="items-center mt-4">
              <Label>Chữ ký người giao hàng</Label>
              <View className="w-full bg-white p-3 rounded-2xl mt-3 items-center">
                <Image
                  source={{ uri: paperData.signProviderUrl }}
                  className="w-full h-64 rounded-md"
                  resizeMode="contain"
                />
              </View>
            </View>
          )}

          {/* Chọn phương thức ký */}
          <View className="items-center mt-4">
            <Label>Chọn phương thức ký</Label>
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <Button
                theme={signMethod === "draw" ? "active" : "alt1"}
                onPress={() => setSignMethod("draw")}
              >
                Ký trực tiếp
              </Button>
              <View style={{ width: 10 }} />
              <Button
                theme={signMethod === "upload" ? "active" : "alt1"}
                onPress={() => setSignMethod("upload")}
              >
                Tải ảnh
              </Button>
            </View>
          </View>

          {/* Ký tên */}
          <View className="items-center mt-4">
            <Label>Ký tên</Label>
          </View>

          {signMethod === "draw" ? (
            <View
              style={{
                minHeight: 250,
                maxHeight: 400,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 10,
                backgroundColor: "white",
                padding: 5,
              }}
            >
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
                  .m-signature-pad--footer { display: none; }
                  body, html { height: 100%; margin: 0; padding: 0; }
                `}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <View className="items-center mt-3">
              <Button icon={UploadCloud} onPress={pickSignatureImage}>
                Chọn ảnh chữ ký
              </Button>
            </View>
          )}

          {/* Hiển thị chữ ký */}
          {paperData.signWarehouseUrl && (
            <View>
              <View className="w-full bg-white p-3 rounded-2xl mt-4 items-center">
                <Image
                  source={{ uri: paperData.signWarehouseUrl }}
                  className="w-full h-64 rounded-md"
                  resizeMode="contain"
                />
              </View>
            </View>
          )}

          {/* Nút thao tác */}
          {paperData.signWarehouseUrl && (
            <View className="flex-row justify-center mt-5">
              <Button onPress={handleClear}>Xóa</Button>
              <View style={{ width: 20 }} />
              <Button onPress={handleConfirm} disabled={isLoading}>
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
    </SafeAreaView>
  );
};

export default SignReceiveScreen;
