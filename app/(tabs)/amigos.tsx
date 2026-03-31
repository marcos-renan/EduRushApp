import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { StyledDialog, type StyledDialogAction, type StyledDialogVariant } from "../../src/components/StyledDialog";
import {
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  getFriendsRanking,
  rejectFriendRequest,
  removeFriend,
  searchFriends,
  sendFriendRequest,
} from "../../src/services/api/friends";
import { extractApiError, resolveApiAssetUrl } from "../../src/services/api/client";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";
import type { FriendMember } from "../../src/types/api";

type DialogState = {
  visible: boolean;
  title: string;
  message?: string;
  variant: StyledDialogVariant;
  actions: StyledDialogAction[];
};

function Avatar({ member }: { member: FriendMember }) {
  const { colors } = useAppTheme();
  const photoUrl = resolveApiAssetUrl(member.user.profile_photo_url ?? null);

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={styles.avatar} />;
  }

  return (
    <View style={[styles.avatarFallback, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
      <Text style={[styles.avatarFallbackText, { color: colors.primary }]}>
        {(member.user.name?.charAt(0) || "U").toUpperCase()}
      </Text>
    </View>
  );
}

export default function FriendsScreen() {
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>({
    visible: false,
    title: "",
    variant: "info",
    actions: [],
  });

  const closeDialog = () => setDialogState((prev) => ({ ...prev, visible: false }));
  const showDialog = (title: string, message?: string, variant: StyledDialogVariant = "info") => {
    setDialogState({
      visible: true,
      title,
      message,
      variant,
      actions: [],
    });
  };

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["friends", token] }),
      queryClient.invalidateQueries({ queryKey: ["friend-requests", token] }),
      queryClient.invalidateQueries({ queryKey: ["friends-ranking", token] }),
      queryClient.invalidateQueries({ queryKey: ["friends-search", token] }),
    ]);
  };

  const friendsQuery = useQuery({
    queryKey: ["friends", token],
    queryFn: () => getFriends(token!),
    enabled: !!token,
  });

  const requestsQuery = useQuery({
    queryKey: ["friend-requests", token],
    queryFn: () => getFriendRequests(token!),
    enabled: !!token,
  });

  const rankingQuery = useQuery({
    queryKey: ["friends-ranking", token],
    queryFn: () => getFriendsRanking(token!),
    enabled: !!token,
  });

  const searchQuery = useQuery({
    queryKey: ["friends-search", token, searchTerm],
    queryFn: () => searchFriends(token!, searchTerm),
    enabled: !!token && searchTerm.trim().length >= 2,
  });

  const sendRequestMutation = useMutation({
    mutationFn: (username: string) => sendFriendRequest(token!, username),
    onSuccess: async () => {
      await refreshAll();
      showDialog("Pedido enviado", "Convite de amizade enviado com sucesso.", "success");
    },
    onError: (error) => {
      showDialog("Nao foi possivel enviar", extractApiError(error), "error");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (requestExternalId: string) => acceptFriendRequest(token!, requestExternalId),
    onSuccess: async () => {
      await refreshAll();
      showDialog("Pedido aceito", "Agora voces estao conectados no ranking.", "success");
    },
    onError: (error) => showDialog("Falha ao aceitar", extractApiError(error), "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestExternalId: string) => rejectFriendRequest(token!, requestExternalId),
    onSuccess: async () => {
      await refreshAll();
      showDialog("Pedido recusado", "O convite foi removido.", "info");
    },
    onError: (error) => showDialog("Falha ao recusar", extractApiError(error), "error"),
  });

  const removeMutation = useMutation({
    mutationFn: (friendExternalId: string) => removeFriend(token!, friendExternalId),
    onSuccess: async () => {
      await refreshAll();
      showDialog("Amigo removido", "A conexao foi removida do seu ranking.", "info");
    },
    onError: (error) => showDialog("Falha ao remover", extractApiError(error), "error"),
  });

  const incomingRequests = requestsQuery.data?.data.incoming ?? [];
  const outgoingRequests = requestsQuery.data?.data.outgoing ?? [];
  const friends = friendsQuery.data?.data ?? [];
  const ranking = rankingQuery.data?.data ?? [];
  const searchResults = searchQuery.data?.data ?? [];
  const loading = friendsQuery.isLoading || requestsQuery.isLoading || rankingQuery.isLoading;

  const isBusy = useMemo(
    () =>
      sendRequestMutation.isPending ||
      acceptMutation.isPending ||
      rejectMutation.isPending ||
      removeMutation.isPending,
    [sendRequestMutation.isPending, acceptMutation.isPending, rejectMutation.isPending, removeMutation.isPending]
  );

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Amigos</Text>
          <EnergyChip value={profile?.energy ?? 0} />
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Busque por @usuario, adicione amigos e compita no ranking.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Buscar amigo</Text>
          <View style={styles.searchRow}>
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="@usuario"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.inputText }]}
            />
            <Pressable
              onPress={() => setSearchTerm(searchInput.trim())}
              style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.primary }, pressed && styles.buttonPressed]}
            >
              <Text style={styles.searchButtonText}>Buscar</Text>
            </Pressable>
          </View>

          {searchQuery.isFetching ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Buscando...</Text>
            </View>
          ) : null}

          {searchTerm.length >= 2 && !searchQuery.isFetching && searchResults.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum usuario encontrado.</Text>
          ) : null}

          {searchResults.map((member) => {
            const status = member.request_status;
            const disabled = status === "sent" || status === "friends" || isBusy;

            return (
              <View key={member.user.external_id ?? member.user.username} style={[styles.memberRow, { borderColor: colors.border }]}>
                <View style={styles.memberInfo}>
                  <Avatar member={member} />
                  <View>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>{member.user.name}</Text>
                    <Text style={[styles.memberHandle, { color: colors.textSecondary }]}>{member.user.handle}</Text>
                  </View>
                </View>
                <Pressable
                  disabled={disabled}
                  onPress={() => sendRequestMutation.mutate(member.user.username)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    status === "friends"
                      ? { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }
                      : { backgroundColor: colors.primary, borderColor: colors.primary },
                    pressed && !disabled && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      status === "friends" ? { color: colors.textSecondary } : { color: palette.white },
                    ]}
                  >
                    {status === "friends" ? "Amigo" : status === "sent" ? "Enviado" : status === "received" ? "Responder abaixo" : "Adicionar"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Pedidos pendentes</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>
            Recebidos: {incomingRequests.length} | Enviados: {outgoingRequests.length}
          </Text>

          {incomingRequests.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum pedido recebido.</Text>
          ) : null}

          {incomingRequests.map((request) => (
            <View key={request.external_id} style={[styles.memberRow, { borderColor: colors.border }]}>
              <View style={styles.memberInfo}>
                <Avatar member={request.member} />
                <View>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>{request.member.user.name}</Text>
                  <Text style={[styles.memberHandle, { color: colors.textSecondary }]}>{request.member.user.handle}</Text>
                </View>
              </View>
              <View style={styles.requestActions}>
                <Pressable
                  onPress={() => rejectMutation.mutate(request.external_id)}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.rejectButton,
                    { borderColor: colors.dangerBorder, backgroundColor: colors.dangerSurface },
                    pressed && !isBusy && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.rejectButtonText}>Recusar</Text>
                </Pressable>
                <Pressable
                  onPress={() => acceptMutation.mutate(request.external_id)}
                  disabled={isBusy}
                  style={({ pressed }) => [styles.acceptButton, { backgroundColor: colors.primary }, pressed && !isBusy && styles.buttonPressed]}
                >
                  <Text style={styles.acceptButtonText}>Aceitar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Seus amigos</Text>

          {friends.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Voce ainda nao adicionou amigos.</Text>
          ) : null}

          {friends.map((friend) => (
            <View key={friend.user.external_id ?? friend.user.username} style={[styles.memberRow, { borderColor: colors.border }]}>
              <View style={styles.memberInfo}>
                <Avatar member={friend} />
                <View>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>{friend.user.name}</Text>
                  <Text style={[styles.memberHandle, { color: colors.textSecondary }]}>{friend.user.handle}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => removeMutation.mutate(friend.user.external_id)}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.removeButton,
                  { borderColor: colors.dangerBorder, backgroundColor: colors.dangerSurface },
                  pressed && !isBusy && styles.buttonPressed,
                ]}
              >
                <Text style={styles.removeButtonText}>Remover</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Ranking entre amigos</Text>
          {ranking.map((member) => (
            <View key={`${member.user.external_id ?? member.user.username}-rank`} style={[styles.rankingRow, { borderColor: colors.border }]}>
              <View style={styles.rankBadge}>
                <Text style={[styles.rankText, { color: colors.primary }]}>#{member.rank}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Avatar member={member} />
                <View>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                    {member.user.name} {member.is_me ? "(voce)" : ""}
                  </Text>
                  <Text style={[styles.memberHandle, { color: colors.textSecondary }]}>
                    {member.user.handle}  |  Nv. {member.stats.level}
                  </Text>
                </View>
              </View>
              <Text style={[styles.rankXp, { color: colors.primary }]}>{member.stats.total_xp} XP</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingInline}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando amigos...</Text>
          </View>
        ) : null}
      </ScrollView>

      <StyledDialog
        visible={dialogState.visible}
        title={dialogState.title}
        message={dialogState.message}
        variant={dialogState.variant}
        actions={dialogState.actions}
        onClose={closeDialog}
      />
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: palette.slate900,
  },
  subtitle: {
    marginTop: -2,
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  searchButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: "800",
  },
  memberRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: "900",
  },
  memberName: {
    fontSize: 14,
    fontWeight: "800",
  },
  memberHandle: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "800",
  },
  requestActions: {
    flexDirection: "row",
    gap: 6,
  },
  acceptButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  acceptButtonText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: "800",
  },
  rejectButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rejectButtonText: {
    color: palette.danger,
    fontSize: 11,
    fontWeight: "800",
  },
  removeButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: palette.danger,
    fontSize: 11,
    fontWeight: "800",
  },
  rankingRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankBadge: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "900",
  },
  rankXp: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: "900",
  },
  loadingInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
  },
});

