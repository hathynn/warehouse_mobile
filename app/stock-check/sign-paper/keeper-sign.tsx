import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setPaperData } from "@/redux/paperSlice";
import SimpleProductList from "@/components/ui/ProductList";
import { useFocusEffect } from "@react-navigation/native";
import useAccountService from "@/services/useAccountService";
import useStockCheckDetail from "@/services/useStockCheckDetailService";
import useStockCheck from "@/services/useStockCheckService";
import { StockCheckDetailType } from "@/types/stockCheckDetail.type";
import StatusBadge from "@/components/StatusBadge";

const KeeperSignScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stockCheckId = id;

  // Redux state
  const { user } = useSelector((state: RootState) => state.auth);
  const { signProviderUrl } = useSelector((state: RootState) => state.paper);

  // Services
  const { fetchStockCheckDetails } = useStockCheckDetail();
  const { fetchStockCheckById } = useStockCheck();
  const { getAccountByEmail } = useAccountService();

  // State
  const signatureRef = useRef<SignatureViewRef>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [stockCheckDetails, setStockCheckDetails] = useState<
    StockCheckDetailType[]
  >([]);
  const [stockCheck, setStockCheck] = useState<any>(null);
  const [keeperFullName, setKeeperFullName] = useState<string>("");

  // Fetch keeper's full name from API
  useEffect(() => {
    const fetchKeeperInfo = async () => {
      if (user?.email) {
        try {
          console.log("📞 Fetching keeper account info for:", user.email);
          const accountResponse = await getAccountByEmail(user.email);
          if (accountResponse?.content?.fullName) {
            setKeeperFullName(accountResponse.content.fullName);
            console.log(
              "Keeper full name retrieved:",
              accountResponse.content.fullName
            );
          }
        } catch (error) {
          console.error("❌ Error fetching keeper account info:", error);
        }
      }
    };

    fetchKeeperInfo();
  }, [user?.email, getAccountByEmail]);

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

  // Keeper name
  const keeperName = keeperFullName || user?.email || "Thủ kho";

  const handleClear = () => {
    setSignature(null);
    signatureRef.current?.clearSignature();
    dispatch(setPaperData({ signProviderUrl: null }));
  };

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(
        setPaperData({ signProviderUrl: img, signProviderName: keeperName })
      );
    }
  };

  const handleNext = () => {
    if (!signature && !signProviderUrl) {
      Alert.alert("Lỗi", "Vui lòng ký tên trước khi tiếp tục");
      return;
    }

    // Navigate to manager sign screen
    router.push(`/stock-check/sign-paper/warehouse-sign?id=${stockCheckId}`);
  };

  const mappedProducts = stockCheckDetails.map((item) => ({
    id: item.id.toString(),
    name: `Sản phẩm ${item.itemId}`,
    actual: item.actualQuantity ?? 0,
    expect: item.quantity ?? 0,
  }));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
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
            Thủ kho ký tên
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} scrollEnabled={scrollEnabled}>
          {/* Stock Check Details */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <SimpleProductList products={mappedProducts} />
          </View>

          {/* Signature Section */}
          <View style={{ padding: 16 }}>
            <Text style={styles.label1}>
              Thủ kho kiểm tra thông tin và ký tên tại đây
            </Text>
            

            <View style={styles.signatureBox}>
              <Signature
                ref={signatureRef}
                onBegin={() => setScrollEnabled(false)}
                onOK={(img) => dispatch(setPaperData({ signProviderUrl: img }))}
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

            <Text style={styles.signerName}>{keeperName}</Text>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleClear}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: "#DDDDDD",
                  borderRadius: 8,
                  marginRight: 5,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "black",
                  }}
                >
                  Xóa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNext}
                disabled={!signature && !signProviderUrl}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: (signature || signProviderUrl) ? "#1677ff" : "#ccc",
                  borderRadius: 8,
                  marginLeft: 5,
                  alignItems: "center",
                  opacity: (signature || signProviderUrl) ? 1 : 0.6,
                }}
              >
                <Text
                  style={{
                    color: "white",
                  }}
                >
                  Tiếp tục
                </Text>
              </TouchableOpacity>
            </View>

            {/* Signature Status */}
            {/* {(signature || signProviderUrl) && (
              <View style={styles.signatureStatus}>
                <Text style={styles.signatureStatusText}>✅ Đã ký</Text>
              </View>
            )} */}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    marginTop: 8,
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
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
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

export default KeeperSignScreen;
