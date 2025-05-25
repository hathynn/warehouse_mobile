import ExportProductListAccordion from "@/components/ui/ExportProductList";
import SimpleProductList from "@/components/ui/ProductList";
import { setPaperData } from "@/redux/paperSlice";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import { ExportRequestDetailType } from "@/types/exportRequestDetail.type";
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
      <View style={{ padding: 16, height: 415}}>
        <SimpleProductList
          products={exportDetails.map((item) => ({
            id: item.id,
            name: `Sản phẩm #${item.itemId}`,
            actual: item.actualQuantity,
            expect: item.quantity,
          }))}
        />
      </View>

      <ScrollView scrollEnabled={scrollEnabled}>
        <View style={{ padding: 16 }}>
          {/* Danh sách sản phẩm */}

          {/* Tiêu đề chữ ký */}
          <Text style={styles.label}>Ký tên</Text>

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
          <View style={styles.actions}>
            <Button onPress={handleClear} flex={1}>
              Xóa
            </Button>
            <Button
              onPress={() => router.push("/export/sign/receiver-sign")}
              flex={1}
            >
              Tiếp tục
            </Button>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
    marginTop: 24,
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
});

export default SignWarehouseScreen;
