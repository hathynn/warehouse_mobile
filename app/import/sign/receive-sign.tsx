import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { View, Image, TouchableOpacity, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { Button, Label } from "tamagui";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setPaperData } from "@/redux/paperSlice";
import { usePaperService } from "@/services/usePaperService";
import ProductListAccordion from "@/components/ui/ProductList";
import useImportOrderDetail from "@/services/useImportOrderDetailService";

const SignReceiveScreen = () => {
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<SignatureViewRef>(null);
  const dispatch = useDispatch();
  const paperData = useSelector((state: RootState) => state.paper); // Lấy dữ liệu từ Redux
  const importOrderId = useSelector(
    (state: RootState) => state.paper.importOrderId
  );
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const products = useSelector((state: RootState) =>
    state.product.products.filter((p) => p.importOrderId === importOrderId)
  );

  const { updateImportOrderDetailsByOrderId } = useImportOrderDetail();

  const handleSave = (img: string) => {
    setSignature(img);
    dispatch(setPaperData({ signProviderUrl: img })); 
  };
  // const base64ToBlob = (base64: string) => {
  //   const byteCharacters = atob(base64.split(",")[1]); // Bỏ "data:image/png;base64,"
  //   const byteNumbers = new Array(byteCharacters.length)
  //     .fill(0)
  //     .map((_, i) => byteCharacters.charCodeAt(i));
  //   const byteArray = new Uint8Array(byteNumbers);
  //   return new Blob([byteArray], { type: "image/png" });
  // };

  const handleClear = () => {
    setSignature(null);
    signatureRef.current?.clearSignature();
  };

  const { createPaper } = usePaperService();

  // const handleConfirm = async () => {
  //   if (!paperData.signProviderUrl || !paperData.signWarehouseUrl) {
  //     console.log("❌ Chưa có đủ chữ ký, vui lòng ký trước khi xác nhận.");
  //     return;
  //   }

  //   // Trực tiếp gọi API và truyền paperData
  //   try {
  //     const response = await createPaper(paperData);
  //     if (response) {
  //       console.log("✅ Tạo paper thành công:", response);
  //       router.push("/(tabs)/import");
  //     }
  //   } catch (error) {
  //     console.error("❌ Lỗi khi tạo paper:", error);
  //   }
  // };

  const handleConfirm = async () => {
    if (!paperData.signProviderUrl || !paperData.signWarehouseUrl) {
      console.log("Chưa có đủ chữ ký, vui lòng ký trước khi xác nhận.");
      return;
    }

    if (!importOrderId) {
      console.log("Thiếu importOrderId.");
      return;
    }
  
    const updatePayload = products.map((p) => ({
      itemId: p.id,
      quantity: p.expect,
      actualQuantity: p.actual ?? 0, 
    }));
  
    try {
      const updateResponse = await updateImportOrderDetailsByOrderId(
        importOrderId,
        updatePayload
      );
  
      if (updateResponse) {
        console.log("✅ Cập nhật actualQuantity thành công");
  
        //API paper
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
    }
  };
  

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(setPaperData({ signWarehouseUrl: img })); // Cập nhật Redux
    }
  };

  // useEffect(() => {
  //   if (paperData.signWarehouseUrl) {
  //     handleConfirm();
  //   }
  // }, [paperData.signWarehouseUrl]);

  // useEffect(() => {
  //   console.log("📦 Dữ liệu paper từ Redux:", paperData.signWarehouseUrl);
  // }, [paperData]);

  return (
    <SafeAreaView className="flex-1 p-2">
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <View className="px-3">
          <View className="bg-[#1677ff] mb-2 px-4 py-4 flex-row justify-between items-center rounded-2xl">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">
              Người nhận hàng ký
            </Text>
          </View>
          <View className="items-center">
            <Label>Xác nhận thông tin sản phẩm</Label>
          </View>
          <ProductListAccordion products={products} />
          <View className="items-center">
        
            {paperData.signProviderUrl && (
              <>
                <View className=" items-center">
                  <Label>Chữ ký người giao hàng</Label>
                </View>
                <View className="w-full bg-white p-3 rounded-2xl mt-3 items-center">
                  <Image
                    source={{ uri: paperData.signProviderUrl }}
                    className="w-full h-64  rounded-md"
                    resizeMode="contain"
                  />
                </View>
              </>
            )}
          </View>
          <View className="items-center">
            <Label>Ký tên</Label>
          </View>
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
              onOK={(signature) => {
                dispatch(setPaperData({ signWarehouseUrl: signature }));
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

          <View className="flex-row justify-center mt-4">
            <Button onPress={handleClear}>Xóa</Button>
            <View style={{ width: 20 }} />
            <Button onPress={handleConfirm}>Xác nhận</Button>
          </View>

          {signature && (
            <Image
              source={{ uri: signature }}
              className="w-full h-32 mt-4 border"
              resizeMode="contain"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignReceiveScreen;
