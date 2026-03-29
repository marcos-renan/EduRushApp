import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
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
import { registerRequest } from "../../src/services/api/auth";
import { extractApiError } from "../../src/services/api/client";
import { useAuthStore } from "../../src/store/auth-store";
import { gradient, palette } from "../../src/theme/palette";

const schema = z
  .object({
    name: z.string().min(3, "Informe seu nome completo."),
    email: z.string().email("Digite um e-mail valido."),
    grade_year: z.number().int().min(1).max(3),
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
    password_confirmation: z.string().min(6, "Confirme a senha."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ["password_confirmation"],
    message: "As senhas precisam ser iguais.",
  });

type RegisterFormData = z.infer<typeof schema>;

const gradeOptions = [
  { label: "1o ano", value: 1 },
  { label: "2o ano", value: 2 },
  { label: "3o ano", value: 3 },
];

export default function RegisterScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      grade_year: 1,
      password: "",
      password_confirmation: "",
    },
  });

  const selectedGrade = watch("grade_year");

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormData) => registerRequest(values),
    onSuccess: async (data) => {
      await setSession(data.access_token, data.user, data.student_profile);
      router.replace("/(tabs)");
    },
  });

  return (
    <LinearGradient colors={gradient} style={styles.container}>
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
            <Text style={styles.logo}>EduRush</Text>
            <Text style={styles.subtitle}>Crie sua conta e comece a evoluir.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Criar conta</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Nome</Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Seu nome"
                    placeholderTextColor={palette.slate500}
                    style={styles.input}
                  />
                )}
              />
              {errors.name ? <Text style={styles.error}>{errors.name.message}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>E-mail</Text>
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
                    placeholderTextColor={palette.slate500}
                    style={styles.input}
                  />
                )}
              />
              {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Serie</Text>
              <View style={styles.gradeRow}>
                {gradeOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setValue("grade_year", option.value, { shouldValidate: true })}
                    style={[
                      styles.gradeChip,
                      selectedGrade === option.value && styles.gradeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.gradeChipText,
                        selectedGrade === option.value && styles.gradeChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Senha</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      secureTextEntry={!showPassword}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="******"
                      placeholderTextColor={palette.slate500}
                      style={styles.passwordInput}
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.passwordToggle}
                      hitSlop={10}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={palette.slate700}
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirmar senha</Text>
              <Controller
                control={control}
                name="password_confirmation"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      secureTextEntry={!showConfirmPassword}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="******"
                      placeholderTextColor={palette.slate500}
                      style={styles.passwordInput}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      style={styles.passwordToggle}
                      hitSlop={10}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={palette.slate700}
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.password_confirmation ? (
                <Text style={styles.error}>{errors.password_confirmation.message}</Text>
              ) : null}
            </View>

            {registerMutation.isError ? (
              <Text style={styles.error}>{extractApiError(registerMutation.error)}</Text>
            ) : null}

            <Pressable
              onPress={handleSubmit((values) => registerMutation.mutate(values))}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.buttonText}>Criar conta</Text>
              )}
            </Pressable>

            <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Ja tenho conta</Text>
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
  logo: {
    color: palette.white,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 0.5,
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
    gap: 12,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  title: {
    color: palette.slate900,
    fontSize: 24,
    fontWeight: "800",
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
  gradeRow: {
    flexDirection: "row",
    gap: 8,
  },
  gradeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.blue200,
    backgroundColor: palette.blue100,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  gradeChipActive: {
    borderColor: palette.blue700,
    backgroundColor: palette.blue700,
  },
  gradeChipText: {
    color: palette.blue700,
    fontSize: 12,
    fontWeight: "800",
  },
  gradeChipTextActive: {
    color: palette.white,
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
    marginTop: 6,
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
