import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { palette } from "../theme/palette";

type CenteredStateProps = {
  loading?: boolean;
  message: string;
};

export function CenteredState({ loading = false, message }: CenteredStateProps) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="large" color={palette.blue700} /> : null}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  message: {
    marginTop: 12,
    color: palette.slate700,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },
});
