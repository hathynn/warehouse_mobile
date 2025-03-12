import { useToast } from "@/hooks/useToast";
import { addProduct } from "@/redux/productSlice";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, Text, View } from "react-native";
import { useDispatch } from "react-redux";
import {
  Button,
  Form,
  H4,
  Input,
  Label,
  Spinner,
  XStack,
  YStack,
} from "tamagui";

export default function CreateQuantity() {
  const dispatch = useDispatch();
  const { showToast, ToastComponent } = useToast();

  const { qrData } = useLocalSearchParams(); // Nhận dữ liệu QR từ query params
  const [status, setStatus] = React.useState<
    "off" | "submitting" | "submitted"
  >("off");
  const [quantity, setQuantity] = useState("1"); // State để lưu giá trị input

  React.useEffect(() => {
    if (status === "submitting") {
      const timer = setTimeout(() => setStatus("off"), 2000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [status]);

  const handleSubmit = () => {
    let productData;
    try {
      productData = qrData ? JSON.parse(qrData as string) : null;
    } catch (error) {
      console.error("Lỗi khi parse dữ liệu QR:", error);
      productData = null;
    }
  
    dispatch(
      addProduct({
        id: productData.id,
        name: productData.name,
        quantity: Number(quantity),
        location: null,
      })
    );
  
    setStatus("submitting");
  
    // Chuyển trang trước, sau đó hiển thị toast
    router.push("/import/create-import");
  
    // setTimeout(() => {
    //   showToast("Thêm sản phẩm thành công!", "success", 5000);
    // }, 500);
  };
  

  return (
    <SafeAreaView>
      <View className="flex justify-center items-center p-5">
        <Text>Scan thành công!</Text>
        <Text>Dữ liệu sản phẩm {qrData || "Không có dữ liệu"}</Text>
        <Form
          alignItems="center"
          minWidth={300}
          gap="$5"
          onSubmit={handleSubmit}
        >
          <XStack>
            <Label
              fontWeight={"500"}
              fontSize={"$4"}
              width={70}
              htmlFor="quantity"
            >
              Số lượng
            </Label>
            <Input
              flex={1}
              id="quantity"
              defaultValue="1"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
          </XStack>
          <Form.Trigger asChild disabled={status !== "off"}>
            <Button
              icon={status === "submitting" ? () => <Spinner /> : undefined}
            >
              Xác nhận thông tin
            </Button>
          </Form.Trigger>
        </Form>
      </View>
    </SafeAreaView>
  );
}
