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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
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
import { DepartmentType } from "@/types/department.type";
import useDepartment from "@/services/useDepartmentService";

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
  
  // ✅ New states for department selection
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentType | null>(null);
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [departmentSearchText, setDepartmentSearchText] = useState("");

  const handleProviderNameChange = (text: string) => {
    setProviderName(text);
    dispatch(setPaperData({ signProviderName: text }));
  };

  const { fetchExportRequestDetails, updateActualQuantity } = useExportRequestDetail();
  const { createPaper } = usePaperService();
  const { fetchDepartments, departments, loading: departmentLoading } = useDepartment();
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

  // ✅ Load departments when component mounts (only for non-SELLING exports)
  useEffect(() => {
    if (exportRequest?.type && exportRequest.type !== "SELLING") {
      fetchDepartments(1, 100);
    }
  }, [exportRequest?.type]);

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
        console.error("ExportReceiverSign: Error fetching user data:", error);
      }
    };
    fetchUser();
  }, [email, authUser, isLoggingOut, isLoggedIn]);

  useEffect(() => {
    if (exportRequestId) {
      fetchExportRequestById(exportRequestId);
    }
  }, [exportRequestId]);

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

  // ✅ Handle department selection
  const handleDepartmentSelect = (department: DepartmentType) => {
    setSelectedDepartment(department);
    setProviderName(department.departmentResponsible);
    dispatch(setPaperData({ signProviderName: department.departmentResponsible }));
    setDepartmentModalVisible(false);
    setDepartmentSearchText("");
  };

  // ✅ Filter departments based on search text
  const filteredDepartments = departments.filter((dept) =>
    dept.departmentName.toLowerCase().includes(departmentSearchText.toLowerCase()) ||
    dept.departmentResponsible.toLowerCase().includes(departmentSearchText.toLowerCase())
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
    if (!paperData.signProviderUrl || !paperData.signReceiverUrl) {
      console.warn("Cần đủ 2 chữ ký trước khi xác nhận.");
      return;
    }

    if (!exportRequestId) {
      console.warn("Thiếu exportRequestId");
      return;
    }

    // ✅ Validation for provider name
    if (!providerName.trim()) {
      console.warn("Cần nhập tên người giao hàng.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await createPaper({
        ...paperData,
        signProviderName: user.name || "",
        signReceiverName: providerName.trim(),
      });
      
      console.log("Responseeeeee", response);
      if (response) {
        console.log("✅ Tạo phiếu thành công");

        const statusUpdated = await updateExportRequestStatus(
          exportRequestId,
          "COMPLETED"
        );
        console.log("2", statusUpdated);
        if (statusUpdated) {
          console.log("✅ Đã cập nhật trạng thái CONFIRMED");
        } else {
          console.warn("⚠️ Không thể cập nhật trạng thái");
        }

        router.push("/(tabs)/export");
      }
    } catch (err) {
      console.error("Lỗi khi tạo phiếu:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const mappedProducts = exportDetails.map((item) => ({
    id: item.id,
    name: `Sản phẩm #${item.itemId}`,
    actual: item.actualQuantity ?? 0,
    expect: item.quantity ?? 0,
  }));

  const getExportTypeLabel = (type: string | undefined) => {
    switch (type) {
      case "BORROWING":
        return "Mượn";
      case "RETURN":
        return "Trả";
      case "LIQUIDATION":
        return "Thanh lý";
      case "SELLING":
        return "Xuất bán";
      case "INTERNAL":
        return "Xuất nội bộ";
      default:
        return "Không xác định";
    }
  };

  // ✅ Render department item for modal
  const renderDepartmentItem = ({ item }: { item: DepartmentType }) => (
    <TouchableOpacity
      style={styles.departmentItem}
      onPress={() => handleDepartmentSelect(item)}
    >
      <View style={styles.departmentContent}>
        <Text style={styles.departmentName}>{item.departmentName}</Text>
        <Text style={styles.departmentResponsible}>
          Người đại diện: {item.departmentResponsible}
        </Text>
        <Text style={styles.departmentLocation}>Vị trí: {item.location}</Text>
      </View>
    </TouchableOpacity>
  );

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

            {/* ✅ Conditional input based on export type */}
            <View style={{ marginTop: 15 }}>
              {exportRequest?.type === "SELLING" ? (
                // SELLING: Manual text input
                <TextInput
                  style={styles.textInput}
                  value={providerName}
                  onChangeText={handleProviderNameChange}
                  placeholder="Nhập tên người nhận hàng"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                />
              ) : (
                // Other types: Department selection
                <View>
                  <TouchableOpacity
                    style={styles.departmentSelector}
                    onPress={() => setDepartmentModalVisible(true)}
                  >
                    <Text style={[
                      styles.departmentSelectorText,
                      !selectedDepartment && styles.placeholderText
                    ]}>
                      {selectedDepartment 
                        ? selectedDepartment.departmentName 
                        : "Chọn phòng ban nhận hàng"
                      }
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  
                  {/* Display selected department representative */}
                  {selectedDepartment && (
                    <View style={styles.selectedDepartmentInfo}>
                      <Text style={styles.representativeLabel}>Người đại diện:</Text>
                      <Text style={styles.representativeName}>
                        {selectedDepartment.departmentResponsible}
                      </Text>
                    </View>
                  )}
                </View>
              )}
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
                  disabled={isLoading || !providerName.trim()}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: (isLoading || !providerName.trim()) ? "#a0c4ff" : "#1677ff",
                    borderRadius: 8,
                    marginLeft: 5,
                    alignItems: "center",
                    opacity: (isLoading || !providerName.trim()) ? 0.6 : 1,
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

        {/* ✅ Department Selection Modal */}
        <Modal
          visible={departmentModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDepartmentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn phòng ban</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDepartmentModalVisible(false);
                    setDepartmentSearchText("");
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Search bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={departmentSearchText}
                  onChangeText={setDepartmentSearchText}
                  placeholder="Tìm kiếm phòng ban hoặc người đại diện..."
                  placeholderTextColor="#999"
                  returnKeyType="search"
                />
              </View>

              {departmentLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1677ff" />
                  <Text style={styles.loadingText}>Đang tải danh sách phòng ban...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredDepartments}
                  renderItem={renderDepartmentItem}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.departmentList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="business-outline" size={48} color="#ccc" />
                      <Text style={styles.emptyText}>
                        {departmentSearchText 
                          ? "Không tìm thấy phòng ban phù hợp" 
                          : "Không có phòng ban nào"
                        }
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
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
  // ✅ New styles for department selection
  departmentSelector: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  departmentSelectorText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  placeholderText: {
    color: "#999",
  },
  selectedDepartmentInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#1677ff",
  },
  representativeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  representativeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    height: "70%",
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 5,
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  departmentList: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  departmentItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "white",
  },
  departmentContent: {
    flex: 1,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  departmentResponsible: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  departmentLocation: {
    fontSize: 12,
    color: "#999",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
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