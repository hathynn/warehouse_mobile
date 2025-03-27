import { setProductLocation } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import useStoredLocation from "@/services/useLocationStored";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";


const WarehouseLocationSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { storedLocations, fetchStoredLocations } = useStoredLocation();

  const [warehouse, setWarehouse] = useState<string | null>(null);
  const [floor, setFloor] = useState<string | null>(null);
  const [row, setRow] = useState<string | null>(null);
  const [lot, setLot] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [openWarehouse, setOpenWarehouse] = useState(false);
  const [openFloor, setOpenFloor] = useState(false);
  const [openRow, setOpenRow] = useState(false);
  const [openLot, setOpenLot] = useState(false);
  const [openProducts, setOpenProducts] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();

  const products = useSelector((state: RootState) => state.product.products);

  useEffect(() => {
    fetchStoredLocations();
  }, []);

  const warehouseItems = Array.from(new Set(storedLocations.map((l) => l.zone))).map(zone => ({
    label: `Kho ${zone}`,
    value: zone
  }));
  
  const floorItems = Array.from(new Set(storedLocations.map((l) => l.floor))).map(floor => ({
    label: `Tầng ${floor}`,
    value: floor
  }));
  
  const rowItems = Array.from(new Set(storedLocations.map((l) => l.row))).map(row => ({
    label: `Dãy ${row}`,
    value: row
  }));
  
  const lotItems = Array.from(new Set(storedLocations.map((l) => l.batch))).map(batch => ({
    label: `Lô ${batch}`,
    value: batch
  }));
  

  const productItems = products.map((product) => ({
    label: product.id,
    value: product.id,
  }));

  const handleConfirmLocation = () => {
    if (!warehouse || !floor || !row || !lot || selectedProducts.length === 0) {
      alert("Vui lòng chọn đầy đủ thông tin");
      return;
    }
  
    const location = {
      zone: warehouse,
      floor: floor,
      row: row,
      batch: lot,
    };
  
    selectedProducts.forEach((productId) => {
      dispatch(setProductLocation({ productId, location }));
    });
  
    // Quay về trang chi tiết đơn nhập
    router.replace(`/(tabs)/location`);
  };
  

  return (
    <SafeAreaView className="flex-1 bg-gray-100 p-5">
      <View className="flex-1 bg-gray-100">
        {/* Header */}
        <View className="bg-black px-4 py-4 flex-row justify-between items-center rounded-2xl mb-5">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">
            Chọn vị trí lưu kho cho {id}
          </Text>
        </View>

        {/* Chọn Kho */}
        <DropDownPicker
          open={openWarehouse}
          value={warehouse}
          items={warehouseItems}
          setOpen={setOpenWarehouse}
          setValue={setWarehouse}
          placeholder="Chọn Kho"
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
            marginBottom:10
          }}
          dropDownContainerStyle={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
          }}
          zIndex={5000}
          zIndexInverse={1000}
        />

        {/* Chọn Tầng */}
        <DropDownPicker
          open={openFloor}
          value={floor}
          items={floorItems}
          setOpen={setOpenFloor}
          setValue={setFloor}
          placeholder="Chọn Tầng"
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
            marginBottom:10
          }}
          dropDownContainerStyle={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
          }}
          zIndex={4000}
          zIndexInverse={2000}
        />

        {/* Chọn Dãy */}
        <DropDownPicker
          open={openRow}
          value={row}
          items={rowItems}
          setOpen={setOpenRow}
          setValue={setRow}
          placeholder="Chọn Dãy"
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
            marginBottom:10
          }}
          dropDownContainerStyle={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
          }}
          zIndex={3000}
          zIndexInverse={3000}
        />

        {/* Chọn Lô */}
        <DropDownPicker
          open={openLot}
          value={lot}
          items={lotItems}
          setOpen={setOpenLot}
          setValue={setLot}
          placeholder="Chọn Lô"
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
            marginBottom:10
          }}
          dropDownContainerStyle={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
          }}
          zIndex={2000}
          zIndexInverse={4000}
        />

        {/* Chọn Sản phẩm */}
        <DropDownPicker
          open={openProducts}
          value={selectedProducts}
          items={productItems}
          setOpen={setOpenProducts}
          setValue={setSelectedProducts}
          multiple={true}
          placeholder="Chọn Sản phẩm"
          mode="BADGE"
          style={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
          }}
          dropDownContainerStyle={{
            backgroundColor: "#fff",
            borderRadius: 10,
            borderColor: "white",
          }}
          zIndex={1000}
          zIndexInverse={5000}
        />
      </View>

      {/* Nút Xác Nhận */}
      <View className="flex-row mt-2">
        <TouchableOpacity onPress={handleConfirmLocation} className="bg-black px-5 py-4 rounded-full flex-1 mr-2">
          <Text className="text-white font-semibold text-sm text-center">
            Xác nhận vị trí
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WarehouseLocationSelector;