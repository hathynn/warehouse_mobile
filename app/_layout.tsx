import { Stack, useRouter } from "expo-router";
import { Provider, useSelector } from "react-redux";
import { RootState, store } from "../redux/store";
import { useEffect, useState } from "react";
import "@/global.css"
function AuthHandler() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isLoggedIn);
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

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  return (
    <Provider store={store}>
      <AuthHandler />
    </Provider>
  );
}
