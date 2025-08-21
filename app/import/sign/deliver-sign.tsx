import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setPaperData } from "@/redux/paperSlice";
import { router } from "expo-router";
import { createSelector } from "reselect";
import ProductListAccordion from "@/components/ui/ProductList";
import { Button } from "tamagui";
import * as ImageManipulator from "expo-image-manipulator";
import useImportOrder from "@/services/useImportOrderService";
import useDepartment from "@/services/useDepartmentService";
import useImportRequest from "@/services/useImportRequestService";
import { ImportOrderStatus, ImportType } from "@/types/importOrder.type";

const SignDeliverScreen = () => {
  const insets = useSafeAreaInsets();
  const signatureRef = useRef<SignatureViewRef>(null);
  const dispatch = useDispatch();
  const [signMethod, setSignMethod] = useState<"draw" | "camera">("draw");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string>("");
  const [departmentInfo, setDepartmentInfo] = useState<{ responsiblePerson: string; departmentName: string } | null>(null);
  const [departmentAccounts, setDepartmentAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  
  const selectProducts = (state: RootState) => state.product.products;
  const selectImportOrderId = (state: RootState) => state.paper.importOrderId;
  const selectProductsByImportOrderId = createSelector(
    [selectProducts, selectImportOrderId],
    (products, importOrderId) =>
      products.filter((p) => String(p.importOrderId) === importOrderId)
  );
  const products = useSelector(selectProductsByImportOrderId);

  const {
    loading: loadingOrder,
    importOrder,
    fetchImportOrderById,
  } = useImportOrder();

  const { fetchDepartmentById, fetchAccountsByDepartment } = useDepartment();
  const { fetchImportRequestById } = useImportRequest();

  const importOrderId = useSelector(
    (state: RootState) => state.paper.importOrderId
  );

  useEffect(() => {
    const loadOrder = async () => {
      if (!importOrderId) return;
      const order = await fetchImportOrderById(importOrderId);

      if (order) {
        console.log("🧾 Import Order:", order);
        
        // If import type is RETURN, fetch accounts from department for selection
        if (order.importType === "RETURN" && order.importRequestId) {
          try {
            // Fetch import request to get department ID
            const importRequest = await fetchImportRequestById(order.importRequestId);
            
            // Check for departmentId in content
            const departmentId = importRequest?.content?.departmentId || importRequest?.departmentId;
            if (departmentId) {
              // Fetch accounts from department for picker selection
              const accounts = await fetchAccountsByDepartment(departmentId);
              console.log('🏢 Fetched accounts for department:', departmentId, accounts);
              setDepartmentAccounts(accounts);
              
              // Also fetch department info for display
              const department = await fetchDepartmentById(departmentId);
              if (department) {
                setDepartmentInfo({
                  responsiblePerson: department.departmentResponsible,
                  departmentName: department.departmentName
                });
              }
            }
          } catch (error) {
            console.log("Lỗi khi lấy danh sách nhân viên phòng ban:", error);
          }
        }
      } else {
        console.warn("⚠️ Không tìm thấy đơn nhập");
      }
    };

    loadOrder();
  }, [importOrderId, fetchImportOrderById, fetchImportRequestById, fetchDepartmentById, dispatch]);

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1, // chụp full trước
    });

    if (!result.canceled && result.assets.length > 0) {
      const originalUri = result.assets[0].uri;

      // ✅ NÉN ảnh lại
      const manipulated = await ImageManipulator.manipulateAsync(
        originalUri,
        [], // không resize
        {
          compress: 0.3, // từ 0 - 1, càng nhỏ thì càng nén nhiều
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      setCapturedImage(manipulated.uri);
      dispatch(setPaperData({ signProviderUrl: manipulated.uri }));
    }
  };

  const handleClear = () => {
    if (signMethod === "camera") {
      setCapturedImage(null);
      dispatch(setPaperData({ signProviderUrl: null }));
    } else {
      setSignature(null);
      signatureRef.current?.clearSignature();
      dispatch(setPaperData({ signProviderUrl: null }));
    }
  };

  const handleEnd = () => {
    signatureRef.current?.readSignature();
  };

  const handleProviderNameChange = (text: string) => {
    setProviderName(text);
    dispatch(setPaperData({ signProviderName: text }));
  };

  const handleAccountSelection = (account: any) => {
    console.log('🎯 Account selected:', account);
    
    setSelectedAccountId(account.id.toString());
    setProviderName(account.fullName);
    dispatch(setPaperData({ signProviderName: account.fullName }));
    setShowAccountModal(false);
    console.log('✅ Set provider name:', account.fullName);
  };

  const clearSelection = () => {
    setSelectedAccountId("");
    setProviderName("");
    dispatch(setPaperData({ signProviderName: "" }));
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={{ flex: 1 }}>
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
            Người giao hàng ký
          </Text>
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          keyboardShouldPersistTaps="handled" 
          scrollEnabled={scrollEnabled}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <ProductListAccordion 
              products={products} 
              isReturnType={importOrder?.importType === ImportType.RETURN}
            />
          </View>

          <View style={{ padding: 16 }}>
            {/* Chọn phương thức ký */}
            <View style={{ alignItems: "center", marginBottom: 13 }}>
              <Text style={styles.label1}>
                Người giao hàng kiểm tra thông tin và ký tên tại đây
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginVertical: 5,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setSignMethod("draw");
                    setCapturedImage(null);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: signMethod === "draw" ? "#1677ff" : "#eee",
                    borderRadius: 8,
                    marginRight: 5,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: signMethod === "draw" ? "white" : "black",
                    }}
                  >
                    Ký trực tiếp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    setSignMethod("camera");
                    await takePhoto();
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: signMethod === "camera" ? "#1677ff" : "#eee",
                    borderRadius: 8,
                    marginLeft: 5,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: signMethod === "camera" ? "white" : "black",
                    }}
                  >
                    Chụp ảnh chữ ký
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Khu vực ký */}
            {signMethod === "draw" ? (
              <View style={styles.signatureBox}>
                <Signature
                  ref={signatureRef}
                  onBegin={() => setScrollEnabled(false)}
                  onOK={(img) => {
                    setSignature(img);
                    dispatch(setPaperData({ signProviderUrl: img }));
                  }}
                  onEnd={() => {
                    setScrollEnabled(true); // Bật lại scroll sau khi ký
                    handleEnd(); // Xử lý ảnh
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
            ) : (
              <View style={{ alignItems: "center" }}>
                <Button onPress={takePhoto}>Chụp lại 📷</Button>
                {capturedImage && (
                  <Image
                    source={{ uri: capturedImage }}
                    style={{
                      width: "100%",
                      height: 400,
                      marginTop: 16,
                      borderRadius: 12,
                    }}
                    resizeMode="contain"
                  />
                )}
              </View>
            )}

            {/* RETURN type: picker to select person, ORDER type: input to enter name */}
            {importOrder?.importType === ImportType.RETURN && departmentAccounts.length > 0 ? (
              <View style={styles.selectionContainer}>
                <View style={styles.selectionHeader}>
                  <Text style={styles.selectionTitle}>Chọn người giao hàng</Text>
                  {departmentInfo?.departmentName && (
                    <Text style={styles.departmentSubtitle}>
                      {departmentInfo.departmentName}
                    </Text>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={styles.selectorButton}
                  onPress={() => setShowAccountModal(true)}
                >
                  <Text style={styles.selectorButtonText}>
                    {providerName || "-- Chọn người giao hàng --"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                
                {/* {selectedAccountId && providerName && (
                  <View style={styles.selectedPersonContainer}>
                    <Text style={styles.selectedPersonLabel}>Người được chọn:</Text>
                    <Text style={styles.selectedPersonName}>{providerName}</Text>
                  </View>
                )} */}
              </View>
            ) : importOrder?.importType === ImportType.RETURN ? (
              <View style={{ marginTop: 15 }}>
                <View style={styles.departmentInfoContainer}>
                  <Text style={styles.departmentLabel}>Người giao hàng:</Text>
                  <Text style={styles.departmentResponsible}>
                    {departmentInfo?.responsiblePerson || "Đang tải..."}
                  </Text>
                  {departmentInfo?.departmentName && (
                    <Text style={styles.departmentName}>
                      Phòng ban: {departmentInfo.departmentName}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 15}}>
                <TextInput
                  style={styles.textInput}
                  value={providerName}
                  onChangeText={handleProviderNameChange}
                  placeholder="Nhập tên người giao hàng"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                />
              </View>
            )}
            
            {/* Hành động */}
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
                  marginRight: (providerName.trim() && ((signMethod === "draw" && signature) || (signMethod === "camera" && capturedImage))) ? 5 : 0,
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

              {providerName.trim() && ((signMethod === "draw" && signature) || (signMethod === "camera" && capturedImage)) && (
                <TouchableOpacity
                  onPress={() => router.push("/import/sign/receive-sign")}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: "#1677ff",
                    borderRadius: 8,
                    marginLeft: 5,
                    alignItems: "center",
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
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Modal for account selection */}
      <Modal
        visible={showAccountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn người giao hàng</Text>
              <TouchableOpacity 
                onPress={() => setShowAccountModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={departmentAccounts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.accountItem,
                    selectedAccountId === item.id.toString() && styles.selectedAccountItem
                  ]}
                  onPress={() => handleAccountSelection(item)}
                >
                  <Text style={[
                    styles.accountItemText,
                    selectedAccountId === item.id.toString() && styles.selectedAccountItemText
                  ]}>
                    {item.fullName}
                  </Text>
                  {selectedAccountId === item.id.toString() && (
                    <Ionicons name="checkmark" size={20} color="#1677ff" />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
            
            {selectedAccountId && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearSelection}
              >
                <Text style={styles.clearButtonText}>Bỏ chọn</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
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
  },
  captureBtn: {
    backgroundColor: "#1677ff",
    padding: 12,
    borderRadius: 10,
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
    alignItems: "center",
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
  valueRed: {
    fontSize: 14,
    color: "#e63946",
    fontWeight: "bold",
  },
  // Department info display styles
  departmentInfoContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    borderLeftWidth: 4,
    borderLeftColor: "#1677ff",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  departmentLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  departmentResponsible: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    marginBottom: 8,
  },
  departmentName: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  // Enhanced selection styles
  selectionContainer: {
    marginTop: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e1e5e9",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectionHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 12,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  departmentSubtitle: {
    fontSize: 14,
    color: "#1677ff",
    fontWeight: "500",
  },
  // Selector button styles
  selectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  selectorButtonText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalCloseButton: {
    padding: 4,
  },
  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  selectedAccountItem: {
    backgroundColor: "#f0f9ff",
  },
  accountItemText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  selectedAccountItemText: {
    color: "#1677ff",
    fontWeight: "600",
  },
  clearButton: {
    margin: 20,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  selectedPersonContainer: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#1677ff",
    marginTop: 8,
  },
  selectedPersonLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  selectedPersonName: {
    fontSize: 16,
    color: "#1677ff",
    fontWeight: "600",
  },
});

export default SignDeliverScreen;