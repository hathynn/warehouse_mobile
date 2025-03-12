import React, { useRef, useState } from "react";
import { Text, View, ScrollView, Button, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Signature from "react-native-signature-canvas";

const Sign = () => {
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<Signature>(null);

  // Hàm lưu chữ ký
  const handleSave = (img: string) => {
    if (img) {
      setSignature(img);
    }
  };

  // Hàm xóa chữ ký
  const handleClear = () => {
    setSignature(null);
    signatureRef.current?.clearSignature();
  };

  // Gọi lưu chữ ký từ ref khi bấm nút "Lưu"
  const saveSignature = () => {
    signatureRef.current?.readSignature();
  };

  return (
    <SafeAreaView>
      <ScrollView scrollEnabled={scrollEnabled}>
        <View style={{ height: 300 }}>
          <Signature
            ref={signatureRef}
            onOK={handleSave} // Khi người dùng nhấn "Lưu" trên canvas, nó sẽ gọi handleSave
            onBegin={() => setScrollEnabled(false)}
            onEnd={() => setScrollEnabled(true)}
            descriptionText="Ký tên tại đây"
            clearText="Xóa"
            confirmText="Lưu"
            imageType="image/png"
          />
        </View>

        {/* Nút Xóa & Lưu */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
          <Button title="Xóa" onPress={handleClear} />
          <View style={{ width: 20 }} />
          <Button title="Lưu" onPress={saveSignature} /> 
        </View>

        {/* Hiển thị ảnh chữ ký đã lưu */}
        {signature && (
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <Text>Chữ ký đã lưu:</Text>
            <Image
              source={{ uri: signature }}
              style={{ width: 300, height: 150, borderWidth: 1, borderColor: "#000" }}
              resizeMode="contain"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Sign;
