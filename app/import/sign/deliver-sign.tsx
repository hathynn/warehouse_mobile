import React, { useRef, useState } from "react";
import { View, Image, TouchableOpacity, Text, ScrollView } from "react-native";
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

const SignDeliverScreen = () => {
  const [signature, setSignature] = useState<string | null>(null);
  const [signMethod, setSignMethod] = useState<"draw" | "upload">("draw");
  const signatureRef = useRef<SignatureViewRef>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const dispatch = useDispatch();
  // const importOrderId = useSelector(
  //   (state: RootState) => state.paper.importOrderId
  // );

  const selectProducts = (state: RootState) => state.product.products;
  const selectImportOrderId = (state: RootState) => state.paper.importOrderId;
  const signProviderUrl = useSelector(
    (state: RootState) => state.paper.signProviderUrl
  );
  const selectProductsByImportOrderId = createSelector(
    [selectProducts, selectImportOrderId],
    (products, importOrderId) =>
      products.filter((p) => p.importOrderId === importOrderId)
  );

  const products = useSelector(selectProductsByImportOrderId);

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(setPaperData({ signProviderUrl: img }));
    }
  };

  const handleClear = () => {
    setSignature(null);
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
      setSignature(imageUri);
      dispatch(setPaperData({ signProviderUrl: imageUri }));
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
              Người giao hàng ký
            </Text>
          </View>

          {/* Danh sách sản phẩm */}
          <View className="items-center">
            <Label>Xác nhận thông tin sản phẩm</Label>
          </View>
          <ProductListAccordion products={products} />

          {/* Chọn phương thức ký */}
          <View className="items-center">
            <Label>Chọn phương thức ký</Label>
            <View style={{ flexDirection: "row" }}>
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
                Tải ảnh chữ ký
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
                height: 710,
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
          .m-signature-pad { height: 100% !important; }
          .m-signature-pad--body { height: 100% !important; }
          .m-signature-pad--footer { display: none; }
          body, html { height: 100%; margin: 0; padding: 0; }
        `}
                style={{ flex: 1, height: 710 }} // Đảm bảo WebView Signature có đúng chiều cao
              />
            </View>
          ) : (
            <View className="items-center mt-3">
              <Button icon={UploadCloud} onPress={pickSignatureImage}>
                Chọn ảnh chữ ký
              </Button>
            </View>
          )}

          {/* Button thao tác */}

          {/* Xem lại chữ ký */}
          
  <View>
    <View className="w-full bg-white p-3 rounded-2xl mt-3 items-center">
      <Image
        source={{ uri: signProviderUrl }}
        className="w-full h-64 rounded-md"
        resizeMode="contain"
      />
    </View>
    <View className="flex-row justify-center mt-4">
      <Button onPress={handleClear}>Xóa</Button>
      <View style={{ width: 20 }} />
      <Button onPress={() => router.push("/import/sign/receive-sign")}>
        Tiếp tục
      </Button>
    </View>
  </View>


        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignDeliverScreen;
