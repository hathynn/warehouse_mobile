import { useToast } from "@/hooks/useToast";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import ConfettiCannon from 'react-native-confetti-cannon';

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
import { addProduct } from "@/redux/productSlice";
import { useDispatch } from "react-redux";

export default function SuccessPage() {
  const { qrData } = useLocalSearchParams();
  const parsedQrData = qrData ? JSON.parse(qrData as string) : null;
  const dispatch = useDispatch();
  const { showToast, ToastComponent } = useToast();
  
  const [status, setStatus] = useState<"off" | "submitting" | "submitted">("off");
  const [quantity, setQuantity] = useState("1");

  React.useEffect(() => {
    if (status === "submitting") {
      const timer = setTimeout(() => setStatus("off"), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = () => {
    dispatch(
      addProduct({
        id: parsedQrData?.id,
        name: parsedQrData?.name,
        quantity: Number(quantity),
        location: null,
      })
    );
    setStatus("submitting");
    router.push("/import/create-import");
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
       <ConfettiCannon count={200} origin={{x: -10, y: 0}} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}
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
              <Card elevate size="$4" bordered padding="$5" marginTop={15} width={"90%"}>
                <YStack gap="$2">
                  <XStack>
                    <Label fontWeight="500" fontSize="$4" width={110} htmlFor="id">
                      Mã hàng hóa
                    </Label>
                    <Input disabled flex={1} id="id" value={parsedQrData?.id} />
                  </XStack>
                  <XStack>
                    <Label fontWeight="500" fontSize="$4" width={110} htmlFor="name">
                      Tên sản phẩm
                    </Label>
                    <Input disabled flex={1} id="name" value={parsedQrData?.name} />
                  </XStack>
                  <Separator marginVertical="$3" />

                  {/* Form nhập số lượng */}
                  <Form alignItems="center" minWidth={300} gap="$5" onSubmit={handleSubmit}>
                    <XStack>
                      <Label fontWeight="500" fontSize="$4" width={110} htmlFor="quantity">
                        Số lượng
                      </Label>
                      <Input
                        flex={1}
                        id="quantity"
                        keyboardType="numeric"
                        placeholder="Nhập số lượng"
                        value={quantity}
                        onChangeText={setQuantity}
                      />
                    </XStack>

                    <Form.Trigger asChild disabled={status !== "off"}>
                      <Button icon={status === "submitting" ? () => <Spinner /> : undefined}>
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
