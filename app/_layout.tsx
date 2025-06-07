import { Stack, useRouter } from "expo-router";
import { Provider, useSelector } from "react-redux";
import { RootState, store } from "../redux/store";
import { useEffect, useState } from "react";
import "@/global.css";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "@/tamagui.config";
import { PusherProvider } from "@/contexts/pusher/PusherProvider";
import NotificationPopup from "@/components/NotificationPopup";
import React from "react";

function AuthHandler() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isLoggedIn
  );
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Giả lập quá trình tải dữ liệu từ Redux (có thể thay bằng AsyncStorage)
    setTimeout(() => {
      setIsLoading(false);
    }, 500); // Giả lập 0.5 giây delay
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else {
        router.replace("/(tabs)/import");
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) return null; // Hiển thị màn hình trắng trong lúc load

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <NotificationPopup />
    </>
  );
}

export default function Layout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <Provider store={store}>
        <PusherProvider>
          <AuthHandler />
        </PusherProvider>
      </Provider>
    </TamaguiProvider>
  );
}
