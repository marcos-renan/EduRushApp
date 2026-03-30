import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/app-theme";
import { palette } from "../theme/palette";

export type StyledDialogVariant = "info" | "success" | "warning" | "error";

export type StyledDialogAction = {
  label: string;
  kind?: "primary" | "secondary" | "danger";
  onPress?: () => void;
};

type StyledDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  variant?: StyledDialogVariant;
  actions?: StyledDialogAction[];
  onClose?: () => void;
};

function variantIcon(variant: StyledDialogVariant) {
  if (variant === "success") return { name: "checkmark-circle" as const, color: palette.success };
  if (variant === "warning") return { name: "warning" as const, color: palette.warning };
  if (variant === "error") return { name: "close-circle" as const, color: palette.danger };
  return { name: "information-circle" as const, color: palette.blue700 };
}

export const StyledDialog = memo(function StyledDialog({
  visible,
  title,
  message,
  variant = "info",
  actions = [],
  onClose,
}: StyledDialogProps) {
  const { colors } = useAppTheme();
  const icon = variantIcon(variant);
  const resolvedActions = actions.length
    ? actions
    : [{ label: "OK", kind: "primary" as const, onPress: onClose }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Ionicons name={icon.name} size={22} color={icon.color} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          </View>
          {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}
          <View style={styles.actions}>
            {resolvedActions.map((action, index) => {
              const kind = action.kind ?? "primary";
              const buttonStyle = [
                styles.button,
                kind === "primary" && { backgroundColor: colors.primary, borderColor: colors.primary },
                kind === "secondary" && {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
                kind === "danger" && {
                  backgroundColor: colors.dangerSurface,
                  borderColor: colors.dangerBorder,
                },
              ];
              const textStyle = [
                styles.buttonText,
                kind === "primary" && { color: palette.white },
                kind === "secondary" && { color: colors.textPrimary },
                kind === "danger" && { color: palette.danger },
              ];

              return (
                <Pressable
                  key={`${action.label}-${index}`}
                  onPress={() => {
                    action.onPress?.();
                    if (!action.onPress && onClose) onClose();
                  }}
                  style={({ pressed }) => [buttonStyle, pressed && styles.buttonPressed]}
                >
                  <Text style={textStyle}>{action.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 9, 20, 0.5)",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  actions: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  button: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
