import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolveApiAssetUrl } from "../../src/services/api/client";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const user = useAuthStore((state) => state.user);
  const profilePhotoVersion = useAuthStore((state) => state.profilePhotoVersion);
  const { colors } = useAppTheme();

  const rawProfilePhoto = resolveApiAssetUrl(user?.profile_photo_url ?? null);
  const profilePhotoUri = rawProfilePhoto
    ? `${rawProfilePhoto}${rawProfilePhoto.includes("?") ? "&" : "?"}v=${profilePhotoVersion}`
    : null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 3,
          paddingBottom: 1,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarStyle: {
          height: 62 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          borderTopColor: colors.tabBorder,
          backgroundColor: colors.tabBackground,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="trilhas"
        options={{
          title: "Materias",
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="missoes"
        options={{
          title: "Missoes",
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="amigos"
        options={{
          title: "Amigos",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size, focused }) =>
            profilePhotoUri ? (
              <View style={[styles.avatarWrap, { backgroundColor: colors.tabBackground, borderColor: focused ? colors.primary : palette.slate300 }]}>
                <Image
                  source={{ uri: profilePhotoUri }}
                  style={[styles.avatar, { width: size + 2, height: size + 2, borderRadius: (size + 2) / 2 }]}
                />
              </View>
            ) : (
              <Ionicons name="person-circle" color={color} size={size} />
            ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    borderRadius: 999,
    padding: 1,
    borderWidth: 1,
    borderColor: palette.slate300,
    backgroundColor: "#fff",
  },
  avatar: {
    borderWidth: 1,
    borderColor: palette.blue200,
  },
});
