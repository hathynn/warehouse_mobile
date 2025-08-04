import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  StatusBar,
  Platform,
  Dimensions,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootState } from "@/redux/store";
import { logout, startLogout } from "@/redux/authSlice";
import useAccountService from "@/services/useAccountService";

const { width } = Dimensions.get("window");

const AccountScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { getAccountByEmail } = useAccountService();

  // ✅ Safe access với optional chaining và fallback
  const authUser = useSelector((state: RootState) => state.auth.user);
  const email = authUser?.email || "";
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const isLoggingOut = useSelector((state: RootState) => state.auth.isLoggingOut);

  const [user, setUser] = useState({
    name: "",
    email: email || "",
    phone: "",
    avatar:
      "https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg",
    coverPhoto: "https://via.placeholder.com/500x200/2176FF/FFFFFF",
  });

  // ✅ Redirect nếu không đăng nhập
  useEffect(() => {
    if (!isLoggedIn || !authUser) {
      router.replace("/login");
      return;
    }
  }, [isLoggedIn, authUser]);

  useEffect(() => {
    const fetchUser = async () => {
      if (email && authUser) {
        try {
          const res = await getAccountByEmail(email);
          if (res?.content) {
            setUser(prev => ({
              ...prev,
              name: res.content.fullName || "",
              email: res.content.email || "",
              phone: res.content.phone || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };
    fetchUser();
  }, [email, authUser]);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          // Prevent multiple logout attempts
          if (isLoggingOut) {
            console.warn("Logout already in progress");
            return;
          }

          try {
            // ✅ Mark logout as starting to prevent race conditions
            dispatch(startLogout());

            // ✅ Clear local user state first
            setUser({
              name: "",
              email: "",
              phone: "",
              avatar: "https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg",
              coverPhoto: "https://via.placeholder.com/500x200/2176FF/FFFFFF",
            });

            // ✅ Clear AsyncStorage tokens
            await AsyncStorage.removeItem("access_token");
            await AsyncStorage.removeItem("refresh_token");

            // ✅ Dispatch logout action to clear Redux state
            dispatch(logout());

            // ✅ Navigate immediately after state cleanup
            router.replace("/login");
          } catch (error) {
            console.error("Logout error:", error);
            // ✅ Force logout even if there's an error
            try {
              dispatch(logout());
            } catch (dispatchError) {
              console.error("Error dispatching logout:", dispatchError);
            }
            router.replace("/login");
          }
        },
      },
    ]);
  };

  // ✅ Early return nếu không có user data
  if (!isLoggedIn || !authUser) {
    return null; // hoặc return loading spinner
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
        },
      ]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ImageBackground source={{ uri: user.coverPhoto }} style={styles.coverPhoto}>
        <LinearGradient colors={["#1677ff", "#0056d6"]} style={styles.coverGradient}>
          <View style={[styles.headerBar, { marginTop: insets.top }]} />
        </LinearGradient>
      </ImageBackground>

      <View style={styles.profileContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          </View>
        </View>

        <View style={styles.userInfoCard}>
          <Text style={styles.userName}>{user.name || "Chưa cập nhật"}</Text>

          <View style={styles.infoItem}>
            <Ionicons name="mail" size={18} color="#1677ff" />
            <Text style={styles.infoText}>{user.email || "Chưa cập nhật"}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="call" size={18} color="#1677ff" />
            <Text style={styles.infoText}>{user.phone || "Chưa cập nhật"}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.9}>
          <LinearGradient
            colors={["#FF416C", "#FF4B2B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={22} color="#FFF" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  coverPhoto: {
    height: 180,
    width: "100%",
  },
  coverGradient: {
    flex: 1,
    justifyContent: "flex-start",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  profileContent: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -50,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#5E72E4",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  userInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#32325D",
    textAlign: "center",
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#525F7F",
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#E9ECEF",
    marginVertical: 15,
  },
  editProfileButton: {
    backgroundColor: "#F7FAFC",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  editProfileText: {
    color: "#5E72E4",
    fontWeight: "600",
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    paddingVertical: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E9ECEF",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#32325D",
  },
  statLabel: {
    fontSize: 14,
    color: "#8898AA",
    marginTop: 5,
  },
  logoutButton: {
    borderRadius: 12,
    marginVertical: 10,
    overflow: "hidden",
    shadowColor: "#FF416C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutGradient: {
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 10,
  },
  versionText: {
    fontSize: 12,
    color: "#8898AA",
    textAlign: "center",
    marginTop: 15,
  },
});

export default AccountScreen;