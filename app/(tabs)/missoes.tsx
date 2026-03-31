import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EnergyChip } from "../../src/components/EnergyChip";
import { GradientScreen } from "../../src/components/GradientScreen";
import { LessonsLineChart } from "../../src/components/LessonsLineChart";
import { resolveApiAssetUrl } from "../../src/services/api/client";
import { getFriendsRanking } from "../../src/services/api/friends";
import { useAuthStore } from "../../src/store/auth-store";
import { useAppTheme } from "../../src/theme/app-theme";
import { palette } from "../../src/theme/palette";
import type { FriendMember, FriendsRankingResponse } from "../../src/types/api";

type RankedMember = FriendsRankingResponse["data"][number];
const STREAK_ACTIVE_COLOR = "#ffb43f";

function RankingAvatar({ member }: { member: FriendMember }) {
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

function buildStreakGraphPoints(streak: number, points = 7): boolean[] {
  const activeCount = Math.max(0, Math.min(streak, points));
  const threshold = points - activeCount;

  return Array.from({ length: points }, (_, index) => index >= threshold);
}

function dayInitial(dateValue: string): string {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";

  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(parsed).replace(".", "");
  return label.charAt(0).toUpperCase();
}

export default function RankingScreen() {
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const { colors } = useAppTheme();
  const [selectedMember, setSelectedMember] = useState<RankedMember | null>(null);

  const rankingQuery = useQuery({
    queryKey: ["friends-ranking", token],
    queryFn: () => getFriendsRanking(token!),
    enabled: !!token,
  });

  const ranking = rankingQuery.data?.data ?? [];
  const myRow = ranking.find((item) => item.is_me) ?? null;
  const streakPoints = buildStreakGraphPoints(selectedMember?.stats.current_streak ?? 0);
  const streakDayInitials = selectedMember?.stats.lessons_per_day?.map((item) => dayInitial(item.date)) ?? [];

  return (
    <GradientScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Ranking</Text>
          <EnergyChip value={profile?.energy ?? 0} />
        </View>
        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Toque no perfil para ver detalhes de sequencia, nivel e badges.</Text>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Sua colocacao</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {myRow ? `#${myRow.rank}` : "#-"}
          </Text>
          <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>
            {myRow ? `${myRow.stats.total_xp} XP acumulado` : "Adicione amigos para entrar no ranking"}
          </Text>
        </View>

        {rankingQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={palette.blue700} />
            <Text style={styles.centeredText}>Carregando ranking...</Text>
          </View>
        ) : null}

        {rankingQuery.isError ? <Text style={styles.errorText}>Nao foi possivel carregar o ranking.</Text> : null}

        {!rankingQuery.isLoading && ranking.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.centeredText}>Sem jogadores no ranking ainda.</Text>
          </View>
        ) : null}

        {ranking.map((member) => (
          <Pressable
            key={`${member.user.external_id ?? member.user.username}-ranking`}
            onPress={() => setSelectedMember(member)}
            style={({ pressed }) => [
              styles.rowCard,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
              pressed && styles.rowCardPressed,
            ]}
          >
            <View style={styles.rankBadge}>
              <Text style={[styles.rankText, { color: colors.primary }]}>#{member.rank}</Text>
            </View>
            <View style={styles.memberInfo}>
              <RankingAvatar member={member} />
              <View>
                <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                  {member.user.name} {member.is_me ? "(voce)" : ""}
                </Text>
                <Text style={[styles.memberHandle, { color: colors.textSecondary }]}>
                  {member.user.handle} | Nv. {member.stats.level}
                </Text>
              </View>
            </View>
            <Text style={[styles.memberXp, { color: colors.primary }]}>{member.stats.total_xp} XP</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Modal
        visible={!!selectedMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedMember(null)} />
          {selectedMember ? (
            <View style={[styles.modalCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Perfil no ranking</Text>
                <Pressable onPress={() => setSelectedMember(null)} style={styles.closeButton}>
                  <Text style={[styles.closeText, { color: colors.textSecondary }]}>Fechar</Text>
                </Pressable>
              </View>

              <View style={styles.modalProfileRow}>
                <RankingAvatar member={selectedMember} />
                <View>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>{selectedMember.user.name}</Text>
                  <Text style={[styles.memberHandle, { color: colors.textSecondary }]}>{selectedMember.user.handle}</Text>
                </View>
              </View>

              <View style={styles.modalStatsRow}>
                <View style={[styles.modalStatBox, { backgroundColor: colors.cardMutedBackground }]}>
                  <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Nivel</Text>
                  <Text style={[styles.modalStatValue, { color: colors.primary }]}>{selectedMember.stats.level}</Text>
                </View>
                <View style={[styles.modalStatBox, { backgroundColor: colors.cardMutedBackground }]}>
                  <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Sequencia</Text>
                  <Text style={[styles.modalStatValue, { color: colors.primary }]}>{selectedMember.stats.current_streak}</Text>
                </View>
              </View>

              <View style={styles.graphSection}>
                <Text style={[styles.graphTitle, { color: colors.textPrimary }]}>Grafico de sequencia</Text>
                <View style={styles.graphRow}>
                  {streakPoints.map((active, index) => (
                    <View key={`streak-point-${index}`} style={styles.graphNodeWrap}>
                      <View
                        style={[
                          styles.graphNode,
                          {
                            backgroundColor: active ? STREAK_ACTIVE_COLOR : colors.cardMutedBackground,
                            borderColor: active ? STREAK_ACTIVE_COLOR : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.graphNodeLabel, { color: active ? palette.white : colors.textSecondary }]}>
                          {streakDayInitials[index] ?? "-"}
                        </Text>
                      </View>
                      {index < streakPoints.length - 1 ? (
                        <View
                          style={[
                            styles.graphConnector,
                            {
                              backgroundColor:
                                streakPoints[index] && streakPoints[index + 1] ? STREAK_ACTIVE_COLOR : colors.border,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.lessonsChartSection}>
                <Text style={[styles.graphTitle, { color: colors.textPrimary }]}>Licoes por dia</Text>
                <LessonsLineChart data={selectedMember.stats.lessons_per_day} height={148} />
              </View>

              <View style={styles.badgesSection}>
                <Text style={[styles.graphTitle, { color: colors.textPrimary }]}>Badges</Text>
                <View style={styles.badgesWrap}>
                  {selectedMember.stats.badges.length > 0 ? (
                    selectedMember.stats.badges.map((badge: RankedMember["stats"]["badges"][number], index: number) => (
                      <View
                        key={`${badge.name}-${index}`}
                        style={[
                          styles.badgeChip,
                          {
                            borderColor: badge.color_hex || colors.border,
                            backgroundColor: colors.cardMutedBackground,
                          },
                        ]}
                      >
                        <Text style={[styles.badgeChipText, { color: badge.color_hex || colors.textPrimary }]}>
                          {badge.name}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noBadgesText, { color: colors.textSecondary }]}>Sem badges desbloqueadas ainda.</Text>
                  )}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  screenTitle: {
    color: palette.slate900,
    fontSize: 24,
    fontWeight: "900",
  },
  screenSubtitle: {
    color: palette.slate700,
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: "900",
  },
  summaryHint: {
    fontSize: 12,
    fontWeight: "600",
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowCardPressed: {
    opacity: 0.86,
  },
  rankBadge: {
    width: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 15,
    fontWeight: "900",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: palette.blue200,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  memberXp: {
    fontSize: 12,
    fontWeight: "900",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  centeredText: {
    color: palette.slate700,
    fontWeight: "600",
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 9, 20, 0.58)",
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  closeButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalStatBox: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  modalStatLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalStatValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "900",
  },
  graphSection: {
    gap: 8,
  },
  graphTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  graphRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  graphNodeWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  graphNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  graphNodeLabel: {
    fontSize: 10,
    fontWeight: "900",
  },
  graphConnector: {
    height: 2,
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 999,
  },
  badgesSection: {
    gap: 8,
  },
  lessonsChartSection: {
    gap: 8,
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  noBadgesText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
