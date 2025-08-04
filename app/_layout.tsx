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
  const authState = useSelector((state: RootState) => state.auth);
  const { isLoggedIn, user, isLoggingOut } = authState;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Giả lập quá trình tải dữ liệu từ Redux (có thể thay bằng AsyncStorage)
    setTimeout(() => {
      setIsLoading(false);
    }, 500); // Giả lập 0.5 giây delay
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoggingOut) {
      if (!isLoggedIn || !user) {
        router.replace("/login");
      } else {
        // Only navigate to tabs if user is properly loaded
        if (user.id && user.email && user.role) {
          router.replace("/(tabs)/import");
        }
      }
    }
  }, [isLoggedIn, user, isLoading, isLoggingOut]);

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
