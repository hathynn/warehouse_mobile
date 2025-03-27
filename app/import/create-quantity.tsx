import { useToast } from "@/hooks/useToast";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import ConfettiCannon from "react-native-confetti-cannon";

import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Button,
  Card,
  Form,
  H4,
  Input,
  Label,
  Separator,
  Spinner,
  XStack,
  YStack,
} from "tamagui";
import { CheckCircle } from "@tamagui/lucide-icons";
import { addProduct, updateProductActual } from "@/redux/productSlice";
import { useDispatch } from "react-redux";
import { store } from "@/redux/store";

export default function SuccessPage() {
  const { qrData } = useLocalSearchParams();
  let parsedQrData = null;
  try {
    parsedQrData = qrData ? JSON.parse(decodeURIComponent(qrData as string)) : null;
  } catch (error) {
    console.error("Error parsing QR data:", error);
  }
  const itemId =  Number(parsedQrData.itemId);


  const dispatch = useDispatch();
  const { showToast, ToastComponent } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>(); // Lấy id từ URL
  const [status, setStatus] = useState<"off" | "submitting" | "submitted">(
    "off"
  );
  const [quantity, setQuantity] = useState("1");


  // useEffect(() => {
  //   console.log("QR Data Received:", qrData);
  //   console.log("Parsed QR Data:", parsedQrData);
  //   console.log("Final itemId:", itemId); // Kiểm tra kết quả

  // }, []);

  React.useEffect(() => {
    if (status === "submitting") {
      const timer = setTimeout(() => setStatus("off"), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = () => {
    console.log("Actual Quantity:", Number(quantity));



    dispatch(
      updateProductActual({
        productId: itemId,
        actual: Number(quantity),
      })
    );
    console.log("Updated Redux State:", store.getState().product.products);

    setStatus("submitting");
    router.push(`/import/create-import/${id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} /> */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 20,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center" }}>
              {/* Biểu tượng thành công */}
              <CheckCircle size={60} color="green" />

              {/* Tiêu đề */}
              <H4 fontSize={22} fontWeight="bold" marginVertical={10}>
                Scan hàng thành công!
              </H4>
              <Text>Thông tin sản phẩm đã được thêm vào hệ thống.</Text>

              {/* Thẻ chứa thông tin sản phẩm */}
              <Card
                elevate
                size="$4"
                bordered
                padding="$5"
                marginTop={15}
                width={"90%"}
              >
                <YStack gap="$2">
                  <XStack>
                    <Label
                      fontWeight="500"
                      fontSize="$4"
                      width={110}
                      htmlFor="id"
                    >
                      Mã hàng hóa
                    </Label>
                    <Label
                      fontWeight="500"
                      fontSize="$4"
                      width={110}
                      htmlFor="id"
                    >
                      {itemId}
                    </Label>
                  </XStack>

                  <Separator marginVertical="$3" />

                  {/* Form nhập số lượng */}
                  <Form
                    alignItems="center"
                    minWidth={300}
                    gap="$5"
                    onSubmit={handleSubmit}
                  >
                    <XStack>
                      <Label fontWeight="500" fontSize="$4" width={110}>
                        Số lượng
                      </Label>
                      <Input
                        flex={1}
                        keyboardType="numeric"
                        placeholder="Nhập số lượng"
                        value={quantity}
                        onChangeText={setQuantity}
                      />
                    </XStack>

                    <Form.Trigger asChild disabled={status !== "off"}>
                      <Button
                        icon={
                          status === "submitting"
                            ? () => <Spinner />
                            : undefined
                        }
                      >
                        Xác nhận thông tin
                      </Button>
                    </Form.Trigger>
                  </Form>
                </YStack>
              </Card>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
