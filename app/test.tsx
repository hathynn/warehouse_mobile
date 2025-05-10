// import { useLocalSearchParams, useRouter } from "expo-router";
// import {
//   Text,
//   View,
//   FlatList,
//   TouchableOpacity,
//   ActivityIndicator,
//   StatusBar,
//   RefreshControl,
//   Image,
//   Modal,
// } from "react-native";
// import { ReactNode, useEffect, useState, useCallback } from "react";
// import { Ionicons, MaterialIcons } from "@expo/vector-icons";
// import useImportOrder from "@/services/useImportOrderService";
// import { Button, Input, XStack } from "tamagui";
// import { useDispatch, useSelector } from "react-redux";
// import { setPaperData } from "@/redux/paperSlice";
// import useImportOrderDetail from "@/services/useImportOrderDetailService";
// import { setProducts } from "@/redux/productSlice";
// import { RootState } from "@/redux/store";
// import usePaperService from "@/services/usePaperService";
// import { ImportOrderStatus } from "@/types/importOrder.type";
// import StatusBadge from "@/components/StatusBadge";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { LinearGradient } from "expo-linear-gradient";

// export default function ReceiptDetail() {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedStatus, setSelectedStatus] = useState<ImportOrderStatus | null>(null);
//   const [filterVisible, setFilterVisible] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);

//   const userId = useSelector((state: RootState) => state.auth.user?.id);
//   const router = useRouter();
//   const dispatch = useDispatch();

//   const { loading, fetchImportOrders } = useImportOrder();
//   const [orders, setOrders] = useState([]);
//   const { getPaperById } = usePaperService();
//   const { fetchImportOrderDetails } = useImportOrderDetail();
//   const insets = useSafeAreaInsets();

//   const statusOptions = [
//     { label: "Chờ kiểm đếm", value: ImportOrderStatus.IN_PROGRESS, color: "#ff9800" },
//     { label: "Hoàn tất", value: ImportOrderStatus.COMPLETED, color: "#4caf50" },
//     { label: "Chờ xác nhận", value: ImportOrderStatus.CONFIRMED, color: "#2196f3" },
//   ];

//   const fetchOrders = useCallback(async () => {
//     if (!userId) return;

//     try {
//       const fetchedOrders = await fetchImportOrders(parseInt(userId));
//       const filteredOrders = fetchedOrders.filter(
//         (order: any) => order.status !== ImportOrderStatus.CANCELLED
//       );
//       setOrders(filteredOrders);
//     } catch (err) {
//       console.error("Lỗi khi lấy đơn nhập:", err);
//     } finally {
//       setRefreshing(false);
//     }
//   }, [userId, fetchImportOrders]);

//   useEffect(() => {
//     fetchOrders();
//   }, [fetchOrders]);

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     fetchOrders();
//   }, [fetchOrders]);

//   const handleCreatePaper = async (order: any) => {
//     try {
//       const response = await fetchImportOrderDetails(order.importOrderId);

//       const products = response?.map((item: any) => ({
//         id: item.itemId,
//         name: item.itemName,
//         expect: item.expectQuantity,
//         actual: item.actualQuantity || 0,
//         importOrderId: order.importOrderId,
//       }));

//       dispatch(setProducts(products));
//       dispatch(
//         setPaperData({
//           importOrderId: order.importOrderId,
//         })
//       );

//       router.push("/import/scan-qr");
//     } catch (error) {
//       console.error("Lỗi khi tạo chứng từ:", error);
//     }
//   };

//   const filteredData = orders.filter((order: any) => {
//     const matchSearch = order.importOrderId
//       ?.toString()
//       .toLowerCase()
//       .includes(searchQuery.toLowerCase());

//     const matchStatus = selectedStatus ? order.status === selectedStatus : true;

//     return matchSearch && matchStatus;
//   });

//   const renderItem = ({ item: order }: { item: any }) => {
//     const statusOption = statusOptions.find((option) => option.value === order.status);

//     return (
//       <TouchableOpacity
//         className="mb-4 bg-white rounded-2xl overflow-hidden shadow"
//         onPress={() =>
//           router.push({
//             pathname: "/import/detail/[id]",
//             params: { id: order.importOrderId.toString() },
//           })
//         }
//       >
//         <LinearGradient
//           colors={[statusOption?.color || "#1677ff", statusOption?.color + "50" || "#1677ff50"]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 0 }}
//           className="px-3 py-2"
//         >
//           <XStack justifyContent="space-between" alignItems="center">
//             <Text className="text-white font-bold text-lg">#{order.importOrderId}</Text>
//             <StatusBadge status={order.status} />
//           </XStack>
//         </LinearGradient>

//         <View className="p-4">
//           <XStack justifyContent="space-between" marginBottom="$2">
//             <View>
//               <Text className="text-gray-500 text-sm">Mã phiếu nhập</Text>
//               <Text className="font-semibold">{order.importRequestId}</Text>
//             </View>
//             <View>
//               <Text className="text-gray-500 text-sm text-right">Ngày dự nhập</Text>
//               <Text className="font-semibold">
//                 {new Date(order.dateReceived).toLocaleDateString("vi-VN")}
//               </Text>
//             </View>
//           </XStack>

//           <XStack justifyContent="space-between" marginBottom="$2">
//             <View>
//               <Text className="text-gray-500 text-sm">Giờ dự nhập</Text>
//               <Text className="font-semibold">{order.timeReceived}</Text>
//             </View>
//             <View>
//               <Text className="text-gray-500 text-sm text-right">Ngày tạo</Text>
//               <Text className="font-semibold">
//                 {new Date(order.createdDate).toLocaleDateString("vi-VN")}
//               </Text>
//             </View>
//           </XStack>

//           {order.note && (
//             <View className="bg-gray-100 p-2 rounded-lg mb-3">
//               <Text className="text-gray-500 text-sm">Ghi chú</Text>
//               <Text>{order.note}</Text>
//             </View>
//           )}

//           {(order.status === ImportOrderStatus.IN_PROGRESS ||
//             order.status === ImportOrderStatus.NOT_STARTED) && (
//             <Button
//               size="$4"
//               backgroundColor={statusOption?.color}
//               color="white"
//               borderRadius="$4"
//               marginTop="$2"
//               icon={<Ionicons name="document-text-outline" size={18} color="white" />}
//               onPress={() => handleCreatePaper(order)}
//             >
//               Kiểm đếm đơn nhập
//             </Button>
//           )}

//           {order.status === ImportOrderStatus.COMPLETED && order.paperIds && (
//             <Button
//               size="$4"
//               variant="outlined"
//               borderColor={statusOption?.color}
//               color={statusOption?.color}
//               borderRadius="$4"
//               marginTop="$2"
//               icon={<Ionicons name="eye-outline" size={18} color={statusOption?.color} />}
//               onPress={() =>
//                 router.push({
//                   pathname: "/import/detail/[id]",
//                   params: { id: order.importOrderId.toString() },
//                 })
//               }
//             >
//               Xem chi tiết đơn nhập
//             </Button>
//           )}
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <View className="flex-1 bg-gray-100">
//       <StatusBar barStyle="light-content" />

//       {/* Header */}
//       <LinearGradient
//         colors={["#1677ff", "#0056d6"]}
//         style={{
//           paddingTop: insets.top,
//           paddingBottom: 16,
//         }}
//       >
//         <View className="px-4 pt-2 pb-4">
//           <Text className="text-white text-xl font-bold text-center mb-2">
//             Danh sách đơn nhập
//           </Text>

//           <XStack space="$2" alignItems="center">
//             <View className="flex-1 bg-white/20 rounded-full overflow-hidden flex-row items-center pl-3 pr-1">
//               <Ionicons name="search" size={18} color="white" />
//               <Input
//                 flex={1}
//                 placeholder="Tìm theo mã đơn nhập"
//                 placeholderTextColor="rgba(255,255,255,0.7)"
//                 value={searchQuery}
//                 onChangeText={setSearchQuery}
//                 borderWidth={0}
//                 color="white"
//                 backgroundColor="transparent"
//               />
//               {searchQuery ? (
//                 <TouchableOpacity
//                   className="p-2"
//                   onPress={() => setSearchQuery("")}
//                 >
//                   <Ionicons name="close-circle" size={18} color="white" />
//                 </TouchableOpacity>
//               ) : null}
//             </View>

//             <TouchableOpacity
//               className="bg-white/20 p-2 rounded-full"
//               onPress={() => setFilterVisible(true)}
//             >
//               <Ionicons name="filter" size={22} color="white" />
//             </TouchableOpacity>
//           </XStack>
//         </View>
//       </LinearGradient>

//       {/* Main Content */}
//       {loading && !refreshing ? (
//         <View className="flex-1 justify-center items-center">
//           <ActivityIndicator size="large" color="#1677ff" />
//         </View>
//       ) : filteredData.length === 0 ? (
//         <View className="flex-1 justify-center items-center p-5">
//           <Image
//             source={require("@/assets/images/empty-box.png")}
//             style={{ width: 150, height: 150, opacity: 0.5 }}
//             resizeMode="contain"
//           />
//           <Text className="text-gray-500 text-lg mt-4 text-center">
//             {searchQuery || selectedStatus
//               ? "Không có đơn nhập phù hợp với bộ lọc"
//               : "Chưa có đơn nhập nào"}
//           </Text>
//           <Button
//             size="$3"
//             marginTop="$4"
//             icon={<Ionicons name="refresh" size={16} color="#1677ff" />}
//             variant="outlined"
//             onPress={onRefresh}
//           >
//             Làm mới
//           </Button>
//         </View>
//       ) : (
//         <FlatList
//           data={filteredData}
//           renderItem={renderItem}
//           keyExtractor={(item) => item.importOrderId.toString()}
//           contentContainerStyle={{ padding: 16 }}
//           showsVerticalScrollIndicator={false}
//           refreshControl={
//             <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1677ff"]} />
//           }
//         />
//       )}

//       {/* Status Filter Modal */}
//       <Modal visible={filterVisible} transparent animationType="slide">
//         <View className="flex-1 justify-end bg-black/50">
//           <View className="bg-white rounded-t-3xl p-5">
//             <View className="items-center mb-2">
//               <View className="w-10 h-1 bg-gray-300 rounded-full mb-4" />
//               <Text className="text-xl font-bold mb-4">Lọc theo trạng thái</Text>
//             </View>

//             {statusOptions.map((status) => (
//               <TouchableOpacity
//                 key={status.value}
//                 className={`flex-row items-center p-4 mb-2 rounded-xl ${
//                   selectedStatus === status.value ? "bg-blue-50" : "bg-gray-50"
//                 }`}
//                 onPress={() => {
//                   setSelectedStatus(status.value as ImportOrderStatus);
//                   setFilterVisible(false);
//                 }}
//               >
//                 <View
//                   style={{
//                     width: 16,
//                     height: 16,
//                     borderRadius: 8,
//                     backgroundColor: status.color,
//                     marginRight: 12,
//                   }}
//                 />
//                 <Text className="flex-1 font-medium">{status.label}</Text>
//                 {selectedStatus === status.value && (
//                   <Ionicons name="checkmark-circle" size={22} color="#1677ff" />
//                 )}
//               </TouchableOpacity>
//             ))}

//             <XStack space="$3" marginTop="$4">
//               <Button
//                 flex={1}
//                 size="$4"
//                 variant="outlined"
//                 onPress={() => setFilterVisible(false)}
//               >
//                 Hủy
//               </Button>
//               <Button
//                 flex={1}
//                 size="$4"
//                 backgroundColor="#1677ff"
//                 onPress={() => {
//                   setSelectedStatus(null);
//                   setFilterVisible(false);
//                 }}
//               >
//                 Bỏ lọc
//               </Button>
//             </XStack>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }