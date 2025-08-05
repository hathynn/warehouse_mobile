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
import { RootState } from "@/redux/store";
import { Button } from "tamagui";
import { updateProduct } from "@/redux/productSlice";
import { Dimensions } from "react-native";
import { Audio } from "expo-audio";
import { useIsFocused } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function ScanQrScreen() {
  const [beepSound, setBeepSound] = useState<Audio.Sound | null>(null);

  const { id } = useLocalSearchParams<{ id: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );
  const [canScan, setCanScan] = useState(true);
  const isFocused = useIsFocused();
  const scanInProgress = useRef(false);
  const alertShowing = useRef(false); // Thêm flag để track Alert

  const importOrderId = useSelector(
    (state: RootState) => state.paper.importOrderId
  );

  const products = useSelector((state: RootState) =>
    state.product.products.filter(
      (p) => String(p.importOrderId) === importOrderId
    )
  );
  const dispatch = useDispatch();
  const productsScanned = products.filter((p) => p.actual > 0).length;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    const loadBeep = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/beep-07a.mp3")
      );
      setBeepSound(sound);
    };

    loadBeep();

    return () => {
      beepSound?.unloadAsync();
    };
  }, []);

  // Reset khi màn hình focus lại
  useEffect(() => {
    if (isFocused) {
      scanInProgress.current = false;
      alertShowing.current = false;
      setCanScan(true);
    }
  }, [isFocused]);

  const playBeep = async () => {
    try {
      if (beepSound) {
        await beepSound.stopAsync();
        await beepSound.setPositionAsync(0);
        await beepSound.playAsync();
      }
    } catch (err) {
      console.warn("Không thể phát âm thanh:", err);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (alertShowing.current) return; // Không show Alert nếu đang có Alert khác
    
    alertShowing.current = true;
    setCanScan(false);
    
    Alert.alert(
      title,
      message,
      [
        {
          text: "OK",
          onPress: () => {
            alertShowing.current = false;
            scanInProgress.current = false;
  
            setTimeout(() => {
              setCanScan(true);
            }, 1000);
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Kiểm tra các điều kiện để ngăn quét liên tục
    if (!isFocused || !canScan || scanInProgress.current || alertShowing.current) {
      return;
    }

    scanInProgress.current = true;
    setCanScan(false);

    try {
      const qrData = JSON.parse(decodeURIComponent(data));
      const foundProduct = products.find(
        (product) => product.id === String(qrData.id)
      );

      if (!foundProduct) {
        showAlert("Sản phẩm không có trong đơn nhập.", "⚠️");
        return;
      }

      await playBeep();

      dispatch(
        updateProduct({
          id: foundProduct.id,
          actual: foundProduct.actual + 1,
        })
      );

      setLastScannedProduct({
        ...foundProduct,
        actual: foundProduct.actual + 1,
      });

      // Reset sau khi quét thành công
      setTimeout(() => {
        setLastScannedProduct(null);
        scanInProgress.current = false;
        setCanScan(true);
      }, 2000);
      
    } catch (error) {
      showAlert("Mã QR không hợp lệ.", "❌");
    }
  };

  const handleScanAgain = () => {
    setError(null);
    setLastScannedProduct(null);
    setIsScanning(true);
    scanInProgress.current = false;
    alertShowing.current = false;
    setCanScan(true);
  };

  const handleManualEntry = () => {
    console.log("importOrderId", importOrderId);
    router.push(`/import/confirm-manual/${importOrderId}`);
  };

  const handleConfirm = () => {
    if (lastScannedProduct?.id) {
      router.push({
        pathname: "/import/detail-product/[id]",
        params: { id: lastScannedProduct.id.toString() },
      });
    } else {
      showAlert("Lỗi", "Không tìm thấy mã sản phẩm.");
    }
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
          onBarcodeScanned={canScan ? handleBarCodeScanned : undefined}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Thông tin sản phẩm vừa quét */}
        {lastScannedProduct && (
          <View style={styles.bottomBox}>
            <View style={styles.productBox}>
              
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle}>
                  {lastScannedProduct.id} - ({lastScannedProduct.actual}/
                  {lastScannedProduct.expect})
                </Text>
                <Text style={styles.productName}>
                  {lastScannedProduct.name}
                </Text>
              </View>

              <View className="flex-row">
                <Button
                  backgroundColor="#1677ff"
                  color="white"
                  fontWeight="500"
                  onPress={handleConfirm}
                  style={[styles.confirmButton, { marginLeft: 10 }]}
                >
                  Xác nhận
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* Hiển thị trạng thái khi không thể quét */}
        {!canScan && !lastScannedProduct && (
          <View style={styles.scanningStatus}>
            <Text style={styles.scanningText}>
              {alertShowing.current ? "Đang xử lý..." : "Chờ quét tiếp..."}
            </Text>
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
    flexDirection: "row",
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
  scanningStatus: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  scanningText: {
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
  },
});