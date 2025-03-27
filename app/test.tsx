// import { RootState } from "@/redux/store";
// import { Ionicons } from "@expo/vector-icons";
// import { ChevronDown } from "@tamagui/lucide-icons";
// import { router } from "expo-router";
// import React, { useRef, useState } from "react";
// import { Text, View, ScrollView, Image, TouchableOpacity } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import Signature from "react-native-signature-canvas";
// import { useSelector } from "react-redux";
// import {
//   Accordion,
//   Button,
//   H3,
//   H4,
//   Input,
//   Label,
//   Paragraph,
//   Square,
//   TextArea,
//   XStack,
// } from "tamagui";

// const Sign = () => {
//   const [scrollEnabled, setScrollEnabled] = useState(true);
//   const [signature, setSignature] = useState<string | null>(null);
//   const [signature2, setSignature2] = useState<string | null>(null);
//   const signatureRef = useRef<Signature>(null);
//   const signatureRef2 = useRef<Signature>(null);

//   const products = useSelector((state: RootState) => state.product.products);

//   // Hàm lưu chữ ký
//   const handleSave = (img: string) => {
//     if (img) {
//       setSignature(img);
//     }
//   };

//   const handleSave2 = (img: string) => {
//     if (img) setSignature2(img);
//   };

//   // Hàm xóa chữ ký
//   const handleClear = () => {
//     setSignature(null);
//     signatureRef.current?.clearSignature();
//   };

//   const handleClear2 = () => {
//     setSignature2(null);
//     signatureRef2.current?.clearSignature();
//   };

//   // Gọi lưu chữ ký từ ref khi bấm nút "Lưu"
//   const saveSignature = () => {
//     signatureRef.current?.readSignature();
//   };

//   const saveSignature2 = () => {
//     signatureRef2.current?.readSignature();
//   };

//   return (
//     <SafeAreaView>
//       <ScrollView scrollEnabled={scrollEnabled}>
//         <View className="px-5">
//           <View className="bg-black px-4 py-4 flex-row justify-between items-center rounded-2xl">
//             <TouchableOpacity onPress={() => router.back()} className="p-2">
//               <Ionicons name="arrow-back" size={24} color="white" />
//             </TouchableOpacity>
//             <Text className="text-white font-bold text-lg">
//               Xác nhận đơn nhập số <Text className="text-blue-200">#136</Text>
//             </Text>
//           </View>
//           <Label width="100%" textAlign="center" fontWeight={500}>
//             Thông tin sản phẩm
//           </Label>

//           <Accordion
//             overflow="hidden"
//             width="100%"
//             type="multiple"
//             marginBottom="$3"
//             borderRadius="$6"
//           >
//             {products.map((product, index) => (
//               <Accordion.Item key={product?.id} value={product-${index}}>
//                 <Accordion.Trigger
//                   flexDirection="row"
//                   justifyContent="space-between"
//                 >
//                   {({ open }: { open: boolean }) => (
//                     <>
//                       <Paragraph fontWeight="500">{product?.id}</Paragraph>
//                       <Square
//                         animation="quick"
//                         rotate={open ? "180deg" : "0deg"}
//                       >
//                         <ChevronDown size="$1" />
//                       </Square>
//                     </>
//                   )}
//                 </Accordion.Trigger>
//                 <Accordion.HeightAnimator animation="medium">
//                   <Accordion.Content
//                     animation="medium"
//                     exitStyle={{ opacity: 0 }}
//                   >
//                     <Paragraph>Số lượng: {product?.actual}</Paragraph>
//                     <Paragraph>
//                       Vị trí:{" "}
//                       {product?.location
//                         ? Kho: ${product.location.zone}, Tầng: ${product.location.floor}, Dãy: ${product.location.row}, Lô: ${product.location.batch}
//                         : "Không có thông tin vị trí"}
//                     </Paragraph>
//                   </Accordion.Content>
//                 </Accordion.HeightAnimator>
//               </Accordion.Item>
//             ))}
//           </Accordion>
//           <Label width={"100%"} textAlign="center" fontWeight={500}>
//             Ký xác nhận
//           </Label>
//           <Text className="flex-row text-center font-extralight">
//             (Vui lòng đọc kĩ thông tin trên và kí xác nhận bên dưới)
//           </Text>

//           <ScrollView scrollEnabled={scrollEnabled}>
//             <View
//               style={{
//                 position: "relative",
//                 height: 300,
//                 borderWidth: 2,
//                 borderColor: "#ccc",
//                 borderRadius: 10,
//                 backgroundColor: "white",
//                 overflow: "hidden",
//                 marginTop: 10,
//                 justifyContent: "center", // Canh giữa nội dung
//                 alignItems: "center",
//               }}
//             >
//               <Label
//                 position="absolute"
//                 top="$1"
//                 left="15%"
//                 transform="translateX(-50%)"
//                 fontSize="$3"
//                 zIndex={1}
//               >
//                 Chữ ký của người giao hàng
//               </Label>
//               <Signature
//                 ref={signatureRef}
//                 onOK={handleSave} // Khi người dùng nhấn "Lưu" trên canvas, nó sẽ gọi handleSave
//                 onBegin={() => setScrollEnabled(false)}
//                 onEnd={() => setScrollEnabled(true)}
//                 descriptionText="Ký tên tại đây"
//                 imageType="image/png"
//               />
//             </View>

//             <Input
//               flex={1}
//               id="name"
//               marginTop="$4"
//               defaultValue="Nhập họ và tên"
//               backgroundColor={"white"}
//             />

//             {/* Nút Xóa & Lưu */}
//             <View
//               style={{
//                 flexDirection: "row",
//                 justifyContent: "center",
//                 marginTop: 20,
//               }}
//             >
//               <Button onPress={handleClear}>Xóa</Button>
//               <View style={{ width: 20 }} />
//               <Button onPress={saveSignature}>Lưu</Button>
//             </View>

//             {/* Hiển thị ảnh chữ ký đã lưu */}
//             {signature && (
//               <View style={{ alignItems: "center", marginTop: 20 }}>
//                 <Text>Chữ ký đã lưu:</Text>
//                 <Image
//                   source={{ uri: signature }}
//                   style={{
//                     width: 300,
//                     height: 150,
//                     borderWidth: 1,
//                     borderColor: "#000",
//                   }}
//                   resizeMode="contain"
//                 />
//               </View>
//             )}
//             <View style={{ marginTop: 10 }}>
//               <View
//                 style={{
//                   position: "relative",
//                   height: 300,
//                   borderWidth: 2,
//                   borderColor: "#ccc",
//                   borderRadius: 10,
//                   backgroundColor: "white",
//                   overflow: "hidden",
//                   marginTop: 10,
//                   justifyContent: "center", // Canh giữa nội dung
//                   alignItems: "center",
//                 }}
//               >
//                 <Label
//                   position="absolute"
//                   top="$1"
//                   left="15%"
//                   transform="translateX(-50%)"
//                   fontSize="$3"
//                   zIndex={1}
//                 >
//                   Chữ ký của người nhận hàng
//                 </Label>
//                 <Signature
//                   ref={signatureRef2}
//                   onOK={handleSave2}
//                   onBegin={() => setScrollEnabled(false)}
//                   onEnd={() => setScrollEnabled(true)}
//                   descriptionText="Ký tên tại đây"
//                   clearText="Xóa"
//                   confirmText="Lưu"
//                   imageType="image/png"
//                   webStyle={.m-signature-pad--footer { display: none; }}
//                 />
//               </View>
//               <Input
//                 flex={1}
//                 id="name"
//                 marginTop="$4"
//                 defaultValue="Nhập họ và tên"
//                 backgroundColor={"white"}
//               />
//               <View
//                 style={{
//                   flexDirection: "row",
//                   justifyContent: "center",
//                   marginTop: 10,
//                 }}
//               >
//                 <Button onPress={handleClear2}>Xóa</Button>
//                 <View style={{ width: 20 }} />
//                 <Button onPress={saveSignature2}>Lưu</Button>
//               </View>

//               {signature2 && (
//                 <Image
//                   source={{ uri: signature2 }}
//                   style={{
//                     width: 300,
//                     height: 100,
//                     borderWidth: 1,
//                     borderColor: "#000",
//                     alignSelf: "center",
//                     marginTop: 10,
//                   }}
//                   resizeMode="contain"
//                 />
//               )}
//             </View>
//             <Button
//               width={"100%"}
//               marginTop="20"
//               marginBottom="20"
//               backgroundColor="black"
//               color="white"
//             >
//               Xác nhận thông tin
//             </Button>
//           </ScrollView>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// export default Sign; 