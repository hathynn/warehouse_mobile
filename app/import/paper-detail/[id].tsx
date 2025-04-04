import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { usePaperService } from "@/services/usePaperService";

export default function PaperDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPaperById } = usePaperService();
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getPaperById(id)
        .then((data) => setPaper(data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#1677ff" />
      </SafeAreaView>
    );
  }

  if (!paper) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <Text className="text-gray-500">Không tìm thấy chứng từ #{id}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="py-4 px-5">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1677ff" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-[#1677ff]">
            Chi tiết chứng từ #{paper.id}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View className="bg-gray-100 p-4 rounded-xl mb-4">
          <InfoRow title="Mã chứng từ" value={paper.id} />
          <InfoRow
            title="Lý do nhập"
            value={paper.description || "Không có mô tả"}
          />
          {/* <InfoRow
            title="Người tạo"
            value={paper.createdBy || "Không xác định"}
          />
          <InfoRow
            title="Ngày tạo"
            value={new Date(paper.createdDate).toLocaleString("vi-VN")}
          /> */}
        </View>

        <View className="space-y-4 pt-1">
          <View>
          <Text className="mb-1 text-gray-600 text-center  pb-3">
      Chữ ký người giao
    </Text>
            <Image
              source={{ uri: paper.signProviderUrl }}
              style={{ width: "100%", height: 300 }}
              resizeMode="contain"
              className="border rounded-xl border-gray-300"
            />
          </View>
          <View>
            <Text className="mb-1 text-gray-600 text-center pt-5 pb-3">Chữ ký người nhận</Text>
            <Image
              source={{ uri: paper.signWarehouseUrl }}
              style={{ width: "100%", height: 300 }}
              resizeMode="contain"
              className="border rounded-xl border-gray-300"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) => (
  <View className="flex-row justify-between py-1">
    <Text className="text-gray-600 w-1/2">{title}</Text>
    <Text className="text-black w-1/2 text-right">{value}</Text>
  </View>
);
