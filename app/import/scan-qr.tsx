// import { useState, useRef, useEffect } from "react";
// import { View, Text, Button, StyleSheet, Alert } from "react-native";
// import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
// import { useDispatch, useSelector } from "react-redux";
// import { addProduct } from "@/redux/productSlice";
// import { useRouter } from "expo-router";
// import { RootState } from "@/redux/store";


// export default function QRScannerScreen() {
//   const [permission, requestPermission] = useCameraPermissions();
//   const [scanned, setScanned] = useState(false); // ✅ Thêm state để kiểm soát quét
//   const cameraRef = useRef(null);
//   const dispatch = useDispatch();
//   const router = useRouter();
//   const products = useSelector((state: RootState) => state.product.products);

//   useEffect(() => {
//     if (!permission?.granted) {
//       requestPermission();
//     }
//   }, [permission]);


//   const scannedRef = useRef(false); // ✅ Dùng useRef để kiểm soát quét

//   const handleBarcodeScanned = (result: BarcodeScanningResult) => {
//     if (scannedRef.current) return; // ✅ Ngăn chặn quét nhiều lần
//     scannedRef.current = true;
  
//     let { data } = result;
  
//     console.log("Mã QR quét được:", data);
  
//     // ✅ Kiểm tra nếu dữ liệu là JSON, nếu không thì để nguyên
//     try {
//       data = JSON.parse(data);
//     } catch (error) {
//       Alert.alert("Dữ liệu không phải JSON hợp lệ:", data);
//     }
  
//     Alert.alert(data);
  
//     // ✅ Kiểm tra xem sản phẩm đã tồn tại chưa
//     // const isDuplicate = products.some((product) => product.id === data.id );
//     // if (isDuplicate) {
//     //   Alert.alert("Cảnh báo", "Sản phẩm này đã có trong danh sách!");
//     //   setTimeout(() => (scannedRef.current = false), 2000);
//     //   return;
//     // }
//     console.log("Mã QR quét được:", data);

//     // const newProduct = {
//     //   id: data.id,
//     //   name: `Sản phẩm ${data.id}`,
//     //   expected: 10,
//     //   actual: 0,
//     //   location: null,
//     // };
  
//     // dispatch(addProduct(newProduct));
  
//   //   Alert.alert("Thành công", `Đã thêm sản phẩm ${data.id}`, [
//   //     {
//   //       text: "OK",
//   //       onPress: () => {
//   //         setTimeout(() => {
//   //           scannedRef.current = false; // ✅ Cho phép quét lại sau khi điều hướng
//   //           router.push("/import/create-import");
//   //         }, 500);
//   //       },
//   //     },
//   //   ]);
//   // };
  


//   if (!permission) {
//     return <Text>Đang kiểm tra quyền camera...</Text>;
//   }

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text>Bạn cần cấp quyền camera để quét mã QR.</Text>
//         <Button title="Cấp quyền" onPress={requestPermission} />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <CameraView
//         ref={cameraRef}
//         style={styles.camera}
//         barcodeScannerSettings={{
//           barcodeTypes: ["qr"],
//         }}
//         onBarcodeScanned={scanned ? undefined : handleBarcodeScanned} // ✅ Chỉ quét khi `scanned` là `false`
//       />
//       <Text style={styles.instructions}>Hãy đưa mã QR vào camera</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   camera: {
//     width: "100%",
//     height: 400,
//   },
//   instructions: {
//     marginTop: 20,
//     fontSize: 16,
//     color: "gray",
//   },
// });
