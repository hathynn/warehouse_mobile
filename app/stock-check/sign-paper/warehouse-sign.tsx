import StatusBadge from "@/components/StatusBadge";
import SimpleProductList from "@/components/ui/ProductList";
import { setPaperData } from "@/redux/paperSlice";
import useStockCheckDetail from "@/services/useStockCheckDetailService";
import useStockCheck from "@/services/useStockCheckService";
import usePaperService from "@/services/usePaperService";
import useAccountService from "@/services/useAccountService";
import { StockCheckDetailType } from "@/types/stockCheckDetail.type";
import { StockCheckStatus } from "@/types/stockCheck.type";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "tamagui";

const ManagerSignScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stockCheckId = id;

  // Redux state
  const { signProviderName, signProviderUrl, signReceiverUrl } = useSelector(
    (state: RootState) => state.paper
  );

  // Services
  const { fetchStockCheckDetails } = useStockCheckDetail();
  const { fetchStockCheckById, updateStockCheckStatus } = useStockCheck();
  const { createPaper } = usePaperService();

  // State
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [stockCheckDetails, setStockCheckDetails] = useState<
    StockCheckDetailType[]
  >([]);
  const [stockCheck, setStockCheck] = useState<any>(null);

  // Signature ref
  const signatureRef = useRef<SignatureViewRef>(null);

  // Manager name
  const managerName = "Quản lý"; // Hard-coded for now
  const keeperName = signProviderName || "Thủ kho";

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        // Fetch stock check info
        fetchStockCheckById(id).then(setStockCheck);

        // Fetch stock check details
        fetchStockCheckDetails(id).then(setStockCheckDetails);
      }
    }, [id])
  );

  const handleSignature = (signatureData: string) => {
    setSignature(signatureData);
    dispatch(
      setPaperData({
        signReceiverUrl: signatureData,
        signReceiverName: managerName,
      })
    );
    console.log("✅ Manager signature captured");
  };

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(
        setPaperData({ signReceiverUrl: img, signReceiverName: managerName })
      );
    }
  };

  const handleClearSignature = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
    dispatch(setPaperData({ signReceiverUrl: null }));
  };

  const handleSubmit = async () => {
    if (!signProviderUrl || (!signature && !signReceiverUrl)) {
      Alert.alert("Lỗi", "Cần có cả chữ ký thủ kho và quản lý");
      return;
    }

    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn hoàn thành việc ký chứng từ?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            setIsLoading(true);
            try {
              // Create paper
              const paperData = {
                stockCheckRequestId: stockCheckId,
                description: `Giấy tờ kiểm kho cho yêu cầu ${stockCheckId}`,
                signProviderName: keeperName,
                signReceiverName: managerName,
                signProviderUrl: signProviderUrl,
                signReceiverUrl: signature || signReceiverUrl,
              };

              console.log("📄 Creating paper for stock check:", paperData);
              const paperResult = await createPaper(paperData);

              if (!paperResult) {
                throw new Error("Không thể tạo giấy tờ");
              }

              console.log("✅ Paper created successfully");

              // Update stock check status to COUNTED
              const statusResult = await updateStockCheckStatus(
                stockCheckId!,
                StockCheckStatus.CONFIRMED
              );
              if (!statusResult) {
                throw new Error("Không thể cập nhật trạng thái kiểm kho");
              }

              console.log("✅ Stock check status updated to CONFIRMED");

              Alert.alert(
                "Thành công",
                "Đã hoàn thành việc ký chứng từ và xác nhận kiểm đếm!",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      router.replace(`/(tabs)/stock-check`);
                    },
                  },
                ]
              );
            } catch (error) {
              console.error("❌ Error in signing process:", error);
              Alert.alert(
                "Lỗi",
                "Không thể hoàn thành việc ký chứng từ. Vui lòng thử lại!"
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
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
          style={{ marginTop: 7 }}
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
          Quản lý ký
        </Text>
      </View>

      {/* Stock Check Details */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <SimpleProductList
          products={stockCheckDetails.map((item) => ({
            id: item.id.toString(),
            name: `Sản phẩm ${item.itemId}`,
            actual: item.actualQuantity,
            expect: item.quantity,
          }))}
        />
      </View>

      {/* Signature Section */}
      <View style={{ padding: 16 }}>
        {/* Tiêu đề chữ ký */}
        <Text style={styles.label1}>
          Quản lý kiểm tra thông tin và ký tên tại đây
        </Text>
      

        {/* Vùng ký */}
        <View style={styles.signatureBox}>
          <Signature
            ref={signatureRef}
            onBegin={() => setScrollEnabled(false)}
            onOK={handleSignature}
            onEnd={() => {
              setScrollEnabled(true);
              handleEnd();
            }}
            descriptionText="Ký tên tại đây"
            imageType="image/png"
            webStyle={`
              .m-signature-pad { height: 120% !important; }
              .m-signature-pad--body { height: 100% !important; }
              .m-signature-pad--footer { display: none; }
              body, html { height: 100%; margin: 0; padding: 0; }
            `}
            style={{ flex: 1, height: 300 }}
          />
        </View>

          <Text style={styles.signerName}>{managerName}</Text>

        {/* Action Buttons */}
        {signReceiverUrl && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginVertical: 20,
            }}
          >
            <TouchableOpacity
              onPress={handleClearSignature}
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: "#DDDDDD",
                borderRadius: 8,
                marginRight: 5,
                alignItems: "center",
              }}
            >
              <Text style={[styles.navButtonText, { color: "black" }]}>
                Xóa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor:
                  isLoading || !managerName.trim() ? "#a0c4ff" : "#1677ff",
                borderRadius: 8,
                marginLeft: 5,
                alignItems: "center",
                opacity: isLoading || !managerName.trim() ? 0.6 : 1,
              }}
              onPress={handleSubmit}
              disabled={
                isLoading ||
                !signProviderUrl ||
                (!signature && !signReceiverUrl)
              }
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.navButtonText}>Hoàn thành</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Signature Status */}
        {/* {(signature || signReceiverUrl) && (
          <View style={styles.signatureStatus}>
            <Text style={styles.signatureStatusText}>✅ Đã ký</Text>
          </View>
        )} */}
      </View>
    </View>
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
  signerName: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "500",
    marginTop:18,
  },
  signatureBox: {
    height: 300,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "white",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
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
  valueBlue: {
    fontSize: 14,
    color: "#1677ff",
    fontWeight: "bold",
  },
  valueRed: {
    fontSize: 14,
    color: "#e63946",
    fontWeight: "bold",
  },
  // Progress styles
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    marginTop: 16,
  },
  progressStep: {
    alignItems: "center",
  },
  progressDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: "#007bff",
  },
  progressDotCompleted: {
    backgroundColor: "#28a745",
  },
  progressDotText: {
    color: "white",
    fontWeight: "600",
  },
  progressLabel: {
    fontSize: 14,
    color: "#666",
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 16,
  },
  // Navigation styles
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    gap: 10,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#1677ff",
  },
  nextButton: {
    backgroundColor: "#007bff",
  },
  submitButton: {
    backgroundColor: "#28a745",
  },
  navButtonText: {
    color: "white",
    fontWeight: "600",
  },
  signatureStatus: {
    alignItems: "center",
    marginTop: 16,
  },
  signatureStatusText: {
    color: "#28a745",
    fontWeight: "500",
    fontSize: 16,
  },
});

export default ManagerSignScreen;
