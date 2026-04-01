import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { extractApiError } from "../../src/services/api/client";
import { loginRequest } from "../../src/services/api/auth";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";

const schema = z.object({
  email: z.string().email("Digite um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

type LoginFormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const { colors, gradientColors, isDark } = useAppTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormData) => loginRequest(values.email, values.password),
    onSuccess: async (data) => {
      await setSession(data.access_token, data.user, data.student_profile);
      router.replace("/(tabs)");
    },
  });

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.select({ ios: 24, android: 0 })}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Image
              source={
                isDark
                  ? require("../../assets/branding/edurush-dark.png")
                  : require("../../assets/branding/edurush-light.png")
              }
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Seu app gamificado para o ensino médio.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Entrar na conta</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Use seu login de aluno para acessar matérias, trilhas, missões e questões.
            </Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>E-mail</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="aluno@edurush.com"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.inputText }]}
                    returnKeyType="next"
                  />
                )}
              />
              {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Senha</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.passwordWrapper, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
                    <TextInput
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="******"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.passwordInput, { color: colors.inputText }]}
                      returnKeyType="done"
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.passwordToggle}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}
            </View>

            {loginMutation.isError ? (
              <Text style={styles.error}>{extractApiError(loginMutation.error)}</Text>
            ) : null}

            <Pressable
              onPress={handleSubmit((values) => loginMutation.mutate(values))}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </Pressable>

            <Pressable onPress={() => router.replace("/(auth)/register")} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Criar conta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 18,
    paddingVertical: 24,
  },
  hero: {
    alignItems: "center",
    gap: 8,
  },
  logoImage: {
    width: 210,
    height: 78,
  },
  subtitle: {
    color: palette.blue200,
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: palette.blue200,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    color: palette.slate900,
    fontSize: 24,
    fontWeight: "800",
  },
  description: {
    color: palette.slate700,
    fontSize: 13,
    fontWeight: "500",
  },
  field: {
    gap: 8,
  },
  label: {
    color: palette.slate900,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: palette.blue200,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.slate900,
    fontSize: 15,
    fontWeight: "600",
    backgroundColor: palette.blue100,
  },
  passwordWrapper: {
    borderWidth: 1,
    borderColor: palette.blue200,
    borderRadius: 14,
    backgroundColor: palette.blue100,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.slate900,
    fontSize: 15,
    fontWeight: "600",
  },
  passwordToggle: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: palette.blue700,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.white,
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: palette.blue700,
    fontSize: 14,
    fontWeight: "800",
  },
  error: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: "700",
  },
});

