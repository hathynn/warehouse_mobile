import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { Button } from "tamagui";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setPaperData } from "@/redux/paperSlice";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import usePaperService from "@/services/usePaperService";
import SimpleProductList from "@/components/ui/ProductList";
import { ExportRequestDetailType } from "@/types/exportRequestDetail.type";
import useExportRequest from "@/services/useExportRequestService";
import { useFocusEffect } from "@react-navigation/native";
import useAccountService from "@/services/useAccountService";

const SignReceiveScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
  const signatureRef = useRef<SignatureViewRef>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [exportDetails, setExportDetails] = useState<ExportRequestDetailType[]>([]);
  const [providerName, setProviderName] = useState<string>("");

  const handleProviderNameChange = (text: string) => {
    setProviderName(text);
    dispatch(setPaperData({ signProviderName: text }));
  };

  const { fetchExportRequestDetails, updateActualQuantity } = useExportRequestDetail();
  const { createPaper } = usePaperService();
  const paperData = useSelector((state: RootState) => state.paper);
  const { exportRequest, updateExportRequestStatus, fetchExportRequestById } = useExportRequest();
  const exportRequestId = paperData.exportRequestId;
  const { getAccountByEmail } = useAccountService();

  const authState = useSelector((state: RootState) => state.auth);
  const { user: authUser, isLoggedIn, isLoggingOut } = authState;
  const email = authUser?.email;
  const [user, setUser] = useState({
    name: "",
    email: email || "",
    phone: "",
  });


  useEffect(() => {
    const fetchUser = async () => {
      // Don't fetch user data if logging out or not properly authenticated
      if (!email || !authUser || isLoggingOut || !isLoggedIn) {
        console.log("ExportReceiverSign: Skipping user fetch", {
          hasEmail: !!email,
          hasAuthUser: !!authUser,
          isLoggingOut,
          isLoggedIn
        });
        return;
      }

      try {
        console.log("ExportReceiverSign: Fetching user data for", email);
        const res = await getAccountByEmail(email);
        if (res?.content) {
          setUser((prev) => ({
            ...prev,
            name: res.content.fullName,
            email: res.content.email,
            phone: res.content.phone || "",
          }));
        }
      } catch (error) {
        console.log("ExportReceiverSign: Error fetching user data:", error);
      }
    };
    fetchUser();
  }, [email, authUser, isLoggingOut, isLoggedIn]);

  useEffect(() => {
    if (exportRequestId) {
      fetchExportRequestById(exportRequestId);
    }
  }, [exportRequestId]);

  // Auto-set receiverName from export request
  useEffect(() => {
    if (exportRequest?.receiverName) {
      setProviderName(exportRequest.receiverName);
      dispatch(setPaperData({ signProviderName: exportRequest.receiverName }));
    }
  }, [exportRequest?.receiverName]);

  useEffect(() => {
    const fetchData = async () => {
      if (exportRequestId) {
        const data = await fetchExportRequestDetails(exportRequestId, 1, 100);
        setExportDetails(data);
      }
    };
    fetchData();
  }, [exportRequestId]);

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        fetchExportRequestById(id);
      }
    }, [id])
  );


  const handleClear = () => {
    setSignature(null);
    signatureRef.current?.clearSignature();
    dispatch(setPaperData({ signReceiverUrl: null }));
  };

  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(setPaperData({ signReceiverUrl: img }));
    }
  };

  const handleConfirm = async () => {
    console.log("🔍 Validation check:");
    console.log("- signProviderUrl:", !!paperData.signProviderUrl);
    console.log("- signReceiverUrl:", !!paperData.signReceiverUrl);
    console.log("- exportRequestId:", exportRequestId);
    console.log("- receiverName:", exportRequest?.receiverName);

    if (!paperData.signProviderUrl || !paperData.signReceiverUrl) {
      console.warn("❌ Cần đủ 2 chữ ký trước khi xác nhận.");
      console.log("signProviderUrl:", paperData.signProviderUrl);
      console.log("signReceiverUrl:", paperData.signReceiverUrl);
      alert("Cần đủ 2 chữ ký trước khi xác nhận.");
      return;
    }

    if (!exportRequestId) {
      console.warn("❌ Thiếu exportRequestId");
      alert("Lỗi: Không tìm thấy mã export request.");
      return;
    }

    // Validation for receiver name (should be auto-loaded from export request)
    if (!exportRequest?.receiverName) {
      console.warn("❌ Không tìm thấy thông tin người nhận hàng.");
      alert("Lỗi: Không tìm thấy thông tin người nhận hàng.");
      return;
    }

    try {
      setIsLoading(true);

      const paperPayload = {
        description: paperData.description,
        exportRequestId: paperData.exportRequestId, // Only export ID for export operation
        signProviderName: user.name || "",
        signReceiverName: exportRequest.receiverName,
        signProviderUrl: paperData.signProviderUrl,
        signReceiverUrl: paperData.signReceiverUrl,
        // Explicitly exclude importOrderId and stockCheckRequestId
      };
      
      console.log("📋 Paper payload detailed:", {
        description: paperPayload.description,
        exportRequestId: paperPayload.exportRequestId,
        signProviderName: paperPayload.signProviderName,
        signReceiverName: paperPayload.signReceiverName,
        signProviderUrl: paperPayload.signProviderUrl ? `[Base64: ${paperPayload.signProviderUrl.substring(0, 50)}...]` : null,
        signReceiverUrl: paperPayload.signReceiverUrl ? `[Base64: ${paperPayload.signReceiverUrl.substring(0, 50)}...]` : null,
      });
      console.log("📋 Export Request ID:", exportRequest?.exportRequestId);
      console.log("📋 User details:", {
        name: user.name,
        email: user.email,
        phone: user.phone
      });
      console.log("📋 Checking required fields:");
      console.log("  - exportRequestId:", !!paperPayload.exportRequestId);
      console.log("  - signProviderName:", !!paperPayload.signProviderName);
      console.log("  - signReceiverName:", !!paperPayload.signReceiverName);
      console.log("  - signProviderUrl:", !!paperPayload.signProviderUrl);
      console.log("  - signReceiverUrl:", !!paperPayload.signReceiverUrl);

      const response = await createPaper(paperPayload);
      
      console.log("📋 Create paper response:", response);
      if (response) {
        console.log("✅ Tạo phiếu thành công");

        const statusUpdated = await updateExportRequestStatus(
          exportRequestId,
          "COMPLETED"
        );
        console.log("2", statusUpdated);
        if (statusUpdated) {
          console.log("✅ Đã cập nhật trạng thái COMPLETED");
        } else {
          console.warn("⚠️ Không thể cập nhật trạng thái");
        }

        router.push("/(tabs)/export");
      } else {
        console.log("❌ CreatePaper returned null - check API logs for error details");
        alert("Lỗi: Không thể tạo phiếu. Vui lòng kiểm tra kết nối mạng và thử lại.");
      }
    } catch (err) {
      console.log("❌ Exception in handleConfirm:", err);
      alert(`Lỗi: ${err.message || "Không thể tạo phiếu"}`);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
            Người nhận hàng ký
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" scrollEnabled={scrollEnabled}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <SimpleProductList
              products={exportDetails.map((item) => ({
                id: item.id,
                name: `Sản phẩm #${item.itemId}`,
                actual: item.actualQuantity,
                expect: item.quantity,
              }))}
            />
          </View>

          <View style={{ padding: 16 }}>
            {/* Ký tên */}
            <Text style={styles.label1}>
              Người nhận hàng kiểm tra thông tin và ký tên tại đây
            </Text>

            <View style={styles.signatureBox}>
              <Signature
                ref={signatureRef}
                onBegin={() => setScrollEnabled(false)}
                onOK={(img) => dispatch(setPaperData({ signReceiverUrl: img }))}
                onEnd={() => {
                  setScrollEnabled(true);
                  handleEnd();
                }}
                descriptionText="Ký tên tại đây"
                imageType="image/png"
                webStyle={`
                    .m-signature-pad { height: 100% !important; }
                    .m-signature-pad--body { height: 100% !important; }
                    .m-signature-pad--footer { display: none; }
                    body, html { height: 100%; margin: 0; padding: 0; }
                  `}
                style={{ flex: 1, height: 300 }}
              />
            </View>

            {/* Display receiver name from export request */}
            <View style={{ marginTop: 15 }}>
              <View style={styles.receiverInfoContainer}>
                <Text style={styles.receiverLabel}>Người nhận hàng:</Text>
                <Text style={styles.receiverName}>
                  {exportRequest?.receiverName || "Đang tải..."}
                </Text>
                {exportRequest?.receiverPhone && (
                  <Text style={styles.receiverPhone}>
                    Số điện thoại: {exportRequest.receiverPhone}
                  </Text>
                )}
                {/* {exportRequest?.receiverAddress && (
                  <Text style={styles.receiverAddress}>
                    Địa chỉ: {exportRequest.receiverAddress}
                  </Text>
                )} */}
              </View>
            </View>

            {paperData.signReceiverUrl && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginVertical: 20,
                }}
              >
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
                  <Text style={{ color: "black" }}>Xóa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: isLoading ? "#a0c4ff" : "#1677ff",
                    borderRadius: 8,
                    marginLeft: 5,
                    alignItems: "center",
                    opacity: isLoading ? 0.6 : 1,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: "white" }}>Xác nhận</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
  signatureBox: {
    height: 300,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "white",
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
    color: "#333",
  },
  // New styles for receiver info display
  receiverInfoContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#1677ff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  receiverLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  receiverName: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    marginBottom: 8,
  },
  receiverPhone: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  receiverAddress: {
    fontSize: 14,
    color: "#555",
  },
  // Keep existing styles
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
});

export default SignReceiveScreen;