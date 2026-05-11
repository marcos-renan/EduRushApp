import { StyleSheet, Text, View } from "react-native";
import { useNetworkStore } from "../store/network-store";

export function ConnectionBanner() {
  const isOnline = useNetworkStore((state) => state.isOnline);

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Sem internet. Algumas ações podem não funcionar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: "#f59e0b",
    borderBottomWidth: 1,
    borderBottomColor: "#d97706",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
});

