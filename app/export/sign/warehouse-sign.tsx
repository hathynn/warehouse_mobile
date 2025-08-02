import StatusBadge from "@/components/StatusBadge";
import ExportProductListAccordion from "@/components/ui/ExportProductList";
import SimpleProductList from "@/components/ui/ProductList";
import { setPaperData } from "@/redux/paperSlice";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import useExportRequest from "@/services/useExportRequestService";
import { ExportRequestDetailType } from "@/types/exportRequestDetail.type";
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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Signature, { SignatureViewRef } from "react-native-signature-canvas";
import { useDispatch } from "react-redux";
import { Button } from "tamagui";

const SignWarehouseScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
  const exportRequestId = id;
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<SignatureViewRef>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [exportDetails, setExportDetails] = useState<ExportRequestDetailType[]>(
    []
  );
  const { fetchExportRequestDetails } = useExportRequestDetail();
   const {
    loading: loadingRequest,
    exportRequest,
    fetchExportRequestById,
  } = useExportRequest();

  useEffect(() => {
      dispatch(setPaperData({ exportRequestId }));
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


  const handleEnd = async () => {
    const img = await signatureRef.current?.readSignature();
    if (img) {
      setSignature(img);
      dispatch(setPaperData({ signProviderUrl: img }));
    }
  };

  const handleClear = () => {
    setSignature(null);
    signatureRef.current?.clearSignature();
    dispatch(setPaperData({ signProviderUrl: null }));
  };

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
          Người giao hàng ký
        </Text>
      </View>
  

         {/* <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin chi tiết yêu cầu</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã phiếu xuất</Text>
            <Text style={styles.valueBlue}>
              {exportRequest?.exportRequestId}
            </Text>
            <Text style={styles.label}>Mã phiếu</Text>
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeText}>
                {" "}
                {exportRequest?.exportRequestId}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày tạo đơn</Text>
            <Text style={styles.value}>
              {" "}
              {exportRequest?.exportDate
                ? new Date(exportRequest?.exportDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày mong muốn xuất</Text>
            <Text style={styles.value}>
              {" "}
              {exportRequest?.exportDate
                ? new Date(exportRequest?.exportDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loại xuất</Text>
            <Text style={styles.value}>
              {getExportTypeLabel(exportRequest?.type)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Người nhận hàng</Text>
            <Text style={styles.value}>
              {exportRequest?.receiverName}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>SĐT người nhận hàng</Text>
            <Text style={styles.value}>
              {exportRequest?.receiverPhone}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tình trạng yêu cầu</Text>
            <Text style={styles.valueRed}>
              <StatusBadge status={exportRequest?.status || "UNKNOWN"} />
            </Text>
          </View>
        </View> */}
      <View style={{ paddingHorizontal: 16, paddingTop:16 }}>
        <SimpleProductList
          products={exportDetails.map((item) => ({
            id: item.id,
            name: `Sản phẩm ${item.itemId}`,
            actual: item.actualQuantity,
            expect: item.quantity,
          }))}
        />
      </View>

    
        <View style={{ padding: 16 }}>
          {/* Danh sách sản phẩm */}

          {/* Tiêu đề chữ ký */}
          <Text style={styles.label1}>Người giao hàng kiểm tra thông tin và ký tên tại đây</Text>

          

          {/* Vùng ký */}
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
              webStyle={`.m-signature-pad { height: 120% !important; }
                .m-signature-pad--body { height: 100% !important; }
                .m-signature-pad--footer { display: none; }
                body, html { height: 100%; margin: 0; padding: 0; }`}
              style={{ flex: 1, height: 300 }}
            />
          </View>

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
                      onPress={() => router.push("/export/sign/receiver-sign")}
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
                    </View>

          {/* Hiển thị lại chữ ký */}
          {signature && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>
                Xem lại chữ ký
              </Text>
              <Image
                source={{ uri: signature }}
                style={{
                  width: "100%",
                  height: 180,
                  marginTop: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#ccc",
                }}
                resizeMode="contain"
              />
            </>
          )}
        </View>
 
    </View>
   
  );
};

const styles = StyleSheet.create({
  label1: {
    fontWeight: "300",
    fontStyle:"italic",
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

export default SignWarehouseScreen;
