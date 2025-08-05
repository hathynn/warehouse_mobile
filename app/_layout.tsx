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
        console.log("🔄 Trying to restore authentication state from AsyncStorage...");

        const [accessToken, refreshToken] = await Promise.all([
          AsyncStorage.getItem("access_token"),
          AsyncStorage.getItem("refresh_token")
        ]);

        if (accessToken && refreshToken) {
          console.log("✅ Found token in AsyncStorage, restoring authentication state");
          dispatch(restoreAuthState({
            access_token: accessToken,
            refresh_token: refreshToken
          }));
        } else {
          console.log("🔄 Not logged in, redirecting to login page");
        }
      } catch (error) {
        console.error("❌ Error restoring auth state:", error);
        // Clear any corrupted tokens
        await AsyncStorage.removeItem("access_token");
        await AsyncStorage.removeItem("refresh_token");
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuthFromStorage();
  }, [dispatch]);

  useEffect(() => {
    if (!isLoading) {
      if (isLoggingOut) {
        console.log("⏸️ Logout in progress, skipping navigation");
        return;
      }

      if (!isLoggedIn || !user) {
        console.log("🔄 Not logged in, redirecting to login");
        router.replace("/login");
      } else {
        // Only navigate to tabs if user is properly loaded and has all required properties
        if (user && typeof user === 'object' && user.id && user.email && user.role) {
          console.log("✅ User authenticated, navigating to tabs");
          router.replace("/(tabs)/import");
        } else {
          console.warn("⚠️ User object incomplete, redirecting to login", { user });
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
