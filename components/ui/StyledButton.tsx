import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface Props {
  title: string;
  onPress: () => void;
  style?: any;
}

const StyledButton = ({ title, onPress, style }: Props) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#1677ff",       // màu xanh giống Tamagui theme="active"
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,                // bo tròn max giống borderRadius="$10"
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});

export default StyledButton;

// cách sử dụng
 /*
<StyledButton
  title="Kiểm đếm đơn nhập"
  onPress={async () => {
    // your async logic
  }}
/>

<StyledButton
  title="Xem chứng từ"
  onPress={() => {
    router.push(`/import/paper-detail/${importOrder.paperIds}`);
  }}
  style={{ marginTop: 12 }}
/>

 */