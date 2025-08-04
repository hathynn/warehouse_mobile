import { Stack, useRouter } from "expo-router";
import { Provider, useSelector, useDispatch } from "react-redux";
import { RootState, store } from "../redux/store";
import { useEffect, useState } from "react";
import "@/global.css";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "@/tamagui.config";
import { PusherProvider } from "@/contexts/pusher/PusherProvider";
import NotificationPopup from "@/components/NotificationPopup";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { restoreAuthState } from "@/redux/authSlice";
import { useAppStateRestore } from "@/hooks/useAppStateRestore";
import React from "react";

function AuthHandler() {
  const authState = useSelector((state: RootState) => state.auth);
  const { isLoggedIn, user, isLoggingOut } = authState;
  const router = useRouter();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  // Hook to handle app state changes and restore auth state
  useAppStateRestore();

  useEffect(() => {
    const restoreAuthFromStorage = async () => {
      try {
        console.log("🔄 Attempting to restore auth state from AsyncStorage...");

        const [accessToken, refreshToken] = await Promise.all([
          AsyncStorage.getItem("access_token"),
          AsyncStorage.getItem("refresh_token")
        ]);

        if (accessToken && refreshToken) {
          console.log("✅ Tokens found in AsyncStorage, restoring auth state");
          dispatch(restoreAuthState({
            access_token: accessToken,
            refresh_token: refreshToken
          }));
        } else {
          console.log("ℹ️ No tokens found in AsyncStorage");
        }
      } catch (error) {
        console.error("❌ Error restoring auth state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuthFromStorage();
  }, [dispatch]);

  useEffect(() => {
    if (!isLoading && !isLoggingOut) {
      if (!isLoggedIn || !user) {
        console.log("🔄 Not logged in, redirecting to login");
        router.replace("/login");
      } else {
        // Only navigate to tabs if user is properly loaded
        if (user.id && user.email && user.role) {
          console.log("✅ User authenticated, navigating to tabs");
          router.replace("/(tabs)/import");
        } else {
          console.warn("⚠️ User object incomplete, redirecting to login");
          router.replace("/login");
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
