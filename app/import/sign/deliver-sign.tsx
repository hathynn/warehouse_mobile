import { setPaperData } from "@/redux/paperSlice";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { View, Image, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { useDispatch } from "react-redux";
import { Button, Label } from "tamagui";

const SignDeliverScreen = () => {
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<SignatureViewRef>(null);
  const dispatch = useDispatch();

  const handleContinue = (img : string) => {
    console.log("🔹 Chữ ký nhận được:", img); // Debug chữ ký trước khi dispatch

    if (signature) {
      console.log("🔹 Lưu chữ ký:", signature);
      dispatch(setPaperData({ signProviderUrl: signature }));
      router.push("/import/sign/receive-sign");
    } else {
      alert("Vui lòng ký trước khi tiếp tục.");
    }
  };

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
    }
  };
  

  const handleClear = () => {
    setSignature(null);
    signatureRef.current?.clearSignature();
  };

  return (
    <SafeAreaView className="flex-1 p-2 bg-white">
      <View className="px-3">
        <View className="bg-black mb-2 px-4 py-4 flex-row justify-between items-center rounded-2xl">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">Người giao hàng ký</Text>
        </View>

        {/* View chứa Signature - Đặt chiều cao chính xác */}
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
              
              dispatch(setPaperData({ signProviderUrl: signature })); // Lưu vào Redux
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
            style={{ flex: 1, height: 710 }}
          />
        </View>

        <View className="flex-row justify-center mt-4">
          <Button onPress={handleClear}>Xóa</Button>
          <View style={{ width: 20 }} />
          <Button onPress={() => router.push("/import/sign/receive-sign")}>Tiếp tục</Button>
        </View>

        {signature && (
          <>
            <View>
              <Text>Xem lại chữ ký</Text>
            </View>
            <Image
              source={{ uri: signature }}
              style={{
                width: "100%",
                height: 150,
                marginTop: 10,
                borderWidth: 1,
              }}
              resizeMode="contain"
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SignDeliverScreen;
