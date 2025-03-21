// app/receipt/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from "react-native";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import useImportOrder from "@/services/useImportOrderService";

export default function ReceiptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const {
    importOrders,
    loading,
    fetchImportOrders,
  } = useImportOrder();

  useEffect(() => {
    fetchImportOrders();
  }, []);

  const filteredOrders = importOrders.filter(
    (order:any) => order.import_request_id === id
  );

  return (
    <SafeAreaView>
    <ScrollView className="p-4">
      <View className="px-5">
        <View className="bg-black px-4 py-4 flex-row justify-between items-center rounded-2xl">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          {filteredOrders.length > 0 && (
            <Text className="text-white font-bold text-lg">
              Đơn nhập số <Text className="text-blue-200">#{filteredOrders[0].id}</Text>
            </Text>
          )}
        </View>

        <Text className="text-xl font-bold mb-4 mt-4">
         Phiếu nhập của mã đơn: {id}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : filteredOrders.length === 0 ? (
          <Text>No matching import orders found.</Text>
        ) : (
          filteredOrders.map((order:any) => (
            <TouchableOpacity  onPress={() => router.push(`/import/create-import/${order.id}`)}>
            <View  key={order.id} className="mb-4 p-4 bg-white rounded shadow">
              <Text>ID: {order.id}</Text>
              <Text>Warehouse Keeper: {order.warehouse_keeper_assigned}</Text>
              <Text>Status: {order.status}</Text>
              <Text>Created Date: {order.created_date}</Text>
              {/* <Text>Time Arrived: {order.time_arrived}</Text> */}
            </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
