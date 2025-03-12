import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ImportDetailScreen() {
  const { id } = useLocalSearchParams(); // Lấy ID từ URL
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      {/* Header
      <View className="flex-row items-center mb-5">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <FontAwesome name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold ml-4">Chi tiết Import #{id}</Text>
      </View>

      <View className="bg-gray-100 p-5 rounded-lg shadow">
        <Text className="text-gray-700 text-lg">
          Mã Import: <Text className="font-bold">{id}</Text>
        </Text>
        <Text className="text-gray-700 text-lg mt-2">
          Trạng thái: <Text className="font-bold">Hoàn thành</Text>
        </Text>
      </View> */}
      <View className="flex-1 bg-white">
        <View className="px-5">
          <View className="bg-black px-4 py-4 flex-row justify-between items-center rounded-2xl">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-bold">
              Phiếu nhập <Text className="text-blue-200">#{id}</Text>
            </Text>
    
          </View>
        </View>

        {/* <View className="flex-row border-b border-gray-300">
        <TouchableOpacity className="flex-1 p-3 border-b-2 border-gray-400">
          <Text className="text-center font-semibold">Giao hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 p-3">
          <Text className="text-center text-gray-500">Hàng hoá</Text>
        </TouchableOpacity>
      </View> */}

        {/* Form */}
        <ScrollView className="px-5 mt-4">
          <View className="flex-row justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-black">Loại phương tiện</Text>
              <TextInput
                className="border border-gray-300 rounded-2xl p-3 mt-1"
                value="Container"
                
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-black">Nhà cung cấp</Text>
              <TextInput
                className="border border-gray-300 rounded-2xl p-3 mt-1"
                value="Mr A"
              />
            </View>
          </View>

          <View className="flex-row justify-between mt-3">
            <View className="flex-1 mr-2">
              <Text className="text-black">Thời gian giao hàng</Text>
              <TextInput
                className="border border-gray-300 rounded-2xl p-3 mt-1"
                value="10:00"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-black">Ngày giao hàng</Text>
              <TextInput
                className="border border-gray-300 rounded-2xl p-3 mt-1"
                value="20/10/2024"
              />
            </View>
          </View>

          <View className="flex-row justify-between mt-3">
            <View className="flex-1 mr-2">
              <Text className="text-black">Chủ xe</Text>
              <TextInput
                className="border border-gray-300 rounded-2xl p-3 mt-1"
                value="Nguyễn Văn A"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-black">Số điện thoại</Text>
              <TextInput
                className="border border-gray-300 rounded-2xl p-3 mt-1"
                value="0903228811"
              />
            </View>
          </View>

          <View className="mt-3">
            <Text className="text-black">Nhân viên nhận hàng</Text>
            <TextInput
              className="border border-gray-300 rounded-2xl p-3 mt-1"
              value="A Năm "
            />
          </View>

          {/* Các phiếu chứng từ */}
          <Text className="text-black mt-4">Các phiếu chứng từ</Text>
          <View className="border border-gray-300 rounded-2xl mt-2">
            {[1, 2].map((item, index) => (
              <TouchableOpacity
                key={index}
                className="flex-row justify-between p-3 border-b border-gray-300"
              >
                <Text>Phiếu ngày 20/10/2024</Text>
                <Ionicons name="chevron-forward" size={20} color="black" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity
      onPress={() => router.push("/import/create-import")}
      className="bg-black rounded-full py-3 mt-5 flex-row justify-center items-center"
    >
      <Text className="text-white font-bold">Tạo chứng từ</Text>
      <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
    </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
