import { RootState } from "@/redux/store";
import { Ionicons } from "@expo/vector-icons";
import { ChevronDown } from "@tamagui/lucide-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { Text, View, ScrollView, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Confirmature from "react-native-signature-canvas";
import { useSelector } from "react-redux";
import {
  Accordion,
  Button,
  H3,
  H4,
  Input,
  Label,
  Paragraph,
  Square,
  TextArea,
  XStack,
} from "tamagui";

const Confirm = () => {
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const products = useSelector((state: RootState) => state.product.products);
    const { id } = useLocalSearchParams<{ id: string }>();
  
    return (
      <SafeAreaView className="flex-1">
        <View className="flex-1 pt-2" >
          <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={{ flexGrow: 1 }}>
            <View className="px-5">
              <View className="bg-black px-4 py-4 flex-row justify-between items-center rounded-2xl">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg">
                  Xác nhận đơn nhập số <Text className="text-blue-200">#{id}</Text>
                </Text>
              </View>
              <Label
                width="100%"
                textAlign="center"
                fontWeight={600}
                fontSize={15}
                marginTop={10}
              >
                Thông tin sản phẩm
              </Label>
  
              <Accordion
                overflow="hidden"
                width="100%"
                type="multiple"
                marginBottom="$3"
                borderRadius="$6"
              >
                {products.map((product, index) => (
                  <Accordion.Item key={product?.id} value={`product-${index}`}>
                    <Accordion.Trigger
                      flexDirection="row"
                      justifyContent="space-between"
                    >
                      {({ open }: { open: boolean }) => (
                        <>
                          <Paragraph fontWeight="500">{product?.id}</Paragraph>
                          <Square
                            animation="quick"
                            rotate={open ? "180deg" : "0deg"}
                          >
                            <ChevronDown size="$1" />
                          </Square>
                        </>
                      )}
                    </Accordion.Trigger>
                    <Accordion.HeightAnimator animation="medium">
                      <Accordion.Content
                        animation="medium"
                        exitStyle={{ opacity: 0 }}
                      >
                        <Paragraph>Số lượng: {product?.actual}</Paragraph>
                      </Accordion.Content>
                    </Accordion.HeightAnimator>
                  </Accordion.Item>
                ))}
              </Accordion>
            </View>
          </ScrollView>
  
          {/* Nút button nằm dưới cùng */}
          <View className="p-5">
            <TouchableOpacity
              onPress={() => router.push("/import/sign/deliver-sign")}
              className="bg-black px-5 py-4 rounded-full"
            >
              <Text className="text-white font-semibold text-sm text-center">
                Ký xác nhận
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  };
  
  export default Confirm;
  
