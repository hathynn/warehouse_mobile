import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store"; // update path nếu khác
import { Button } from "tamagui";
import { updateProduct } from "@/redux/productSlice";
import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default function ScanQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scanCooldownRef = useRef(false);
  const [scannedProducts, setScannedProducts] = useState<any[]>([]); // Lưu các sản phẩm đã quét
  const [error, setError] = useState<string | null>(null);
  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );

  // Lấy danh sách sản phẩm từ Redux
  const importOrderId = useSelector((state: RootState) => state.paper.importOrderId);

  const products = useSelector((state: RootState) =>
    state.product.products.filter(p => p.importOrderId === importOrderId)
  );
  const dispatch = useDispatch();
  const productsScanned = products.filter((p) => p.actual > 0).length;

  // Tính số sản phẩm cần quét
  const totalProductsToScan = products.length;

  // Số sản phẩm chưa quét
  const remainingProducts = products.length - productsScanned;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanCooldownRef.current) return;
    scanCooldownRef.current = true; // Đặt cooldown
  
    try {
      const qrData = JSON.parse(decodeURIComponent(data));
      const foundProduct = products.find((product) => product.id === qrData.id);
  
      if (foundProduct) {
        if (foundProduct.actual === 0) {
          setLastScannedProduct(foundProduct);
          dispatch(updateProduct({ id: foundProduct.id, actual: foundProduct.expect }));
          setTimeout(() => {
            scanCooldownRef.current = false;
          }, 1000);
        } else {
          Alert.alert(" Sản phẩm này đã được quét.", "", [
            {
              text: "OK",
              onPress: () => {
                scanCooldownRef.current = false;
              },
            },
          ]);
          setTimeout(() => {
            scanCooldownRef.current = false;
          }, 2500);
        }
      } else {
        Alert.alert("⚠️ Sản phẩm không có trong đơn nhập.", "", [
          {
            text: "OK",
            onPress: () => {
              scanCooldownRef.current = false;
            },
          },
        ]);
        setTimeout(() => {
          scanCooldownRef.current = false;
        }, 2500);
      }
    } catch (error) {
      Alert.alert("❌ Mã QR không hợp lệ.", "", [
        {
          text: "OK",
          onPress: () => {
            scanCooldownRef.current = false;
          },
        },
      ]);
      setTimeout(() => {
        scanCooldownRef.current = false;
      }, 2500);
    }
  };
  
  

  const handleScanAgain = () => {
    setError(null); // Reset lỗi
    setLastScannedProduct(null); // Ẩn sản phẩm đã quét
  };

  const handleManualEntry = () => {
    router.push(`/import/confirm-manual/${importOrderId}`);
  };

  const handleConfirm = () => {
    router.push(`/import/confirm/${importOrderId}`);
  };
  
  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View className="flex-row items-center">
          <Button onPress={() => router.back()}>←</Button>
          <Text style={styles.headerTitle}>Quét QR</Text>
        </View>
        <Button onPress={handleManualEntry}>Nhập thủ công</Button>
      </View>

      {/* Camera full màn dưới header */}
      <View style={styles.cameraWrapper}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "code128"],
          }}
          onBarcodeScanned={handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Thanh trạng thái quét */}
        <View
          style={[
            styles.scanStatus,
            {
              backgroundColor: remainingProducts === 0 ? "#2ECC71" : "#E74C3C",
            },
          ]}
        >
          <Text style={styles.scanStatusText}>
            Đã quét: {productsScanned}/{totalProductsToScan}
          </Text>
        </View>

        {/* Thông tin sản phẩm vừa quét */}
        {lastScannedProduct && (
          <View style={styles.bottomBox}>
            <View style={styles.productBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>
                  #{lastScannedProduct.id}
                </Text>
                <Text style={styles.productName}>
                  {lastScannedProduct.name}
                </Text>
              </View>

              {remainingProducts > 0 && (
                <Button
                  onPress={handleScanAgain}
                  style={[styles.confirmButton, { marginLeft: 10 }]}
                  backgroundColor="#f0f0f0"
                >
                  →
                </Button>
              )}

              {remainingProducts === 0 && (
                <Button
                  backgroundColor="#1677ff"
                  color="white"
                  fontWeight="500"
                  onPress={handleConfirm}
                  style={[styles.confirmButton, { marginLeft: 10 }]}
                >
                  Xác nhận
                </Button>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#eee",
    zIndex: 20,
  },
  headerTitle: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "bold",
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
  },
  scanStatus: {
    top: 16,
    paddingVertical: 13,
    marginHorizontal: 20,
    borderRadius: 5,
    zIndex: 10,
    position: "absolute",

    width: width - 40,
    alignItems: "center",
  },
  scanStatusText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  bottomBox: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 10,
  },

  productBox: {
    flexDirection: "row", // <-- Hiển thị theo hàng ngang
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 5,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  productTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  productName: {
    fontSize: 14,
    color: "#555",
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
