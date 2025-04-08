import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet, SafeAreaView, Alert } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store"; // update path nếu khác
import { ScrollView } from "react-native-gesture-handler";
import { Button } from "tamagui";

export default function ScanQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Lấy danh sách sản phẩm từ Redux
  const products = useSelector((state: RootState) => state.product.products);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    setError(null);

    try {
      // Parse dữ liệu JSON từ mã QR
      const qrData = JSON.parse(decodeURIComponent(data));

      // Kiểm tra xem sản phẩm có tồn tại trong danh sách không (so sánh số)
      const foundProduct = products.find(
        (product: any) => product.id === qrData.id // so sánh id là kiểu number
      );

      if (foundProduct) {
        setScannedProduct(foundProduct);
      } else {
        setScannedProduct(null);
        setError("❌ Sản phẩm không có trong đơn nhập.");
      }
    } catch (error) {
      setError("❌ Mã QR không hợp lệ.");
      setScannedProduct(null);
    }
  };

  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Camera view */}
      <View style={{ flex: 3 }}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "code128"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Action/result view */}
      <View style={styles.bottomContainer}>
        {scanned && (
          <Button
            
            onPress={() => {
              setScanned(false);
              setScannedProduct(null);
              setError(null);
            }}
          >
            Quét lại
          </Button>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {scannedProduct && (
          <View style={styles.resultBox}>
            <Text style={styles.label}>✅ Sản phẩm đã quét:</Text>
            <Text>Mã sản phẩm: {scannedProduct.id}</Text>
            <Text>Tên sản phẩm: {scannedProduct.name}</Text>
            <Text>Số lượng dự kiến: {scannedProduct.expect}</Text>
            <Text>Số lượng thực tế: {scannedProduct.actual}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottomContainer: {
    flex: 2,
    backgroundColor: "#fff",
    padding: 16,

    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  resultBox: {
    marginTop: 20,
    backgroundColor: "#e0f7fa",
    padding: 16,
    borderRadius: 10,
  },
  label: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
    color: "#00796b",
  },
  errorText: {
    color: "red",
    marginTop: 16,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});