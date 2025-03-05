import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { login } from "@/redux/authSlice";
import { useRouter } from "expo-router";

const LoginScreen = () => {
  // const [selectedTab, setSelectedTab] = useState("phone");
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogin = () => {
    dispatch(login());
    router.replace("/tabs" as any);
  };
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex justify-center  flex-1 bg-white px-6 pt-16">
        <Text className="text-2xl font-bold text-center">
          Chào mừng quay trở lại!
        </Text>
        <Text className="text-gray-500 text-center mt-1">
          Đăng nhập để truy cập vào tài khoản
        </Text>

        {/* Tabs */}
        {/* <View className="flex-row bg-gray-100 p-1 rounded-full mt-6">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-full ${selectedTab === "phone" ? "bg-green-300" : ""}`}
          onPress={() => setSelectedTab("phone")}
        >
          <Text className="text-center text-lg font-medium">Phone Number</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-full ${selectedTab === "email" ? "bg-green-300" : ""}`}
          onPress={() => setSelectedTab("email")}
        >
          <Text className="text-center text-lg font-medium">Email</Text>
        </TouchableOpacity>
      </View> */}

        <View className="mt-6">
          <TextInput
            className=" p-5 rounded-2xl bg-gray-100"
            placeholder="Email"
            keyboardType="email-address"
          />
          {/* <TextInput
          className=" p-3 rounded-2xl bg-gray-100"
          placeholder={selectedTab === "phone" ? "Phone Number" : "Email"}
          keyboardType={selectedTab === "phone" ? "phone-pad" : "email-address"}
        /> */}
          <View className="relative mt-4">
            <TextInput
              className=" p-5 rounded-2xl bg-gray-100"
              placeholder="Password"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              className="absolute right-3 top-3"
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye" : "eye-off"}
                size={24}
                color="gray"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", marginTop: 16 }}>
          <TouchableOpacity>
            <Text style={{ color: "#D1D5DB" }}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          className="bg-black py-3 rounded-2xl mt-6"
        >
          <Text className="text-center text-white text-lg font-bold">
            Đăng nhập
          </Text>
        </TouchableOpacity>

        {/* Social Login */}
        <Text className="text-center text-gray-500 mt-6">Hoặc</Text>
        <View className=" flex items-center  mt-4 ">
          <TouchableOpacity className="bg-gray-100  flex-row  items-center p-3 rounded-2xl  gap-2">
            <Image
              source={{
                uri: "https://img.icons8.com/color/48/google-logo.png",
              }}
              className="w-6 h-6"
            />
            <Text>Đăng nhập với Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default LoginScreen;
