import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { View, Image, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { Button } from "tamagui";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setPaperData } from "@/redux/paperSlice";

const SignReceiveScreen = () => {
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<SignatureViewRef>(null);
  const dispatch = useDispatch();
  const paperData = useSelector((state: RootState) => state.paper); // Lấy dữ liệu từ Redux

  const handleSave = (img: string) => {
    setSignature(img);
    dispatch(setPaperData({ signProviderUrl: img })); // Lưu chữ ký vào Redux
  };

  const handleClear = () => {
    setSignature(null);
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    // console.log("🔹 Dữ liệu Paper trong Redux:", paperData);

    if (paperData.signWarehouseUrl) {
      console.log("🔹 Dữ liệu Paper trong Redux:", paperData);
    } else {
      console.log("❌ Chưa có chữ ký, vui lòng ký trước khi xác nhận.");
    }
  };

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(setPaperData({ signWarehouseUrl: img })); // Cập nhật Redux
    }
  };
  
  useEffect(() => {
    if (paperData.signWarehouseUrl) {
      handleConfirm();
    }
  }, [paperData.signWarehouseUrl]);
  

  return (
    <SafeAreaView className="flex-1 p-2 bg-white">
      <View className="px-3">
        <View className="bg-black mb-2 px-4 py-4 flex-row justify-between items-center rounded-2xl">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">
            Người nhận hàng ký
          </Text>
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
            onOK={(signature) => {
            
              dispatch(setPaperData({ signWarehouseUrl: signature }));
            }}
            onEnd={handleEnd}
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
    </SafeAreaView>
  );
};

export default SignReceiveScreen;
