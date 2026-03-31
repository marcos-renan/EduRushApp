import type {
  FriendRequestsResponse,
  FriendsListResponse,
  FriendsRankingResponse,
  FriendsSearchResponse,
} from "../../types/api";
import { api, withAuth } from "./client";

export async function searchFriends(token: string, query: string): Promise<FriendsSearchResponse> {
  const { data } = await api.get<FriendsSearchResponse>("/student/friends/search", {
    ...withAuth(token),
    params: { query },
  });

  return data;
}

export async function getFriendRequests(token: string): Promise<FriendRequestsResponse> {
  const { data } = await api.get<FriendRequestsResponse>("/student/friends/requests", withAuth(token));
  return data;
}

export async function getFriends(token: string): Promise<FriendsListResponse> {
  const { data } = await api.get<FriendsListResponse>("/student/friends", withAuth(token));
  return data;
}

export async function getFriendsRanking(token: string): Promise<FriendsRankingResponse> {
  const { data } = await api.get<FriendsRankingResponse>("/student/friends/ranking", withAuth(token));
  return data;
}

export async function sendFriendRequest(token: string, username: string): Promise<void> {
  await api.post("/student/friends/requests", { username }, withAuth(token));
}

export async function acceptFriendRequest(token: string, requestExternalId: string): Promise<void> {
  await api.post(`/student/friends/requests/${requestExternalId}/accept`, {}, withAuth(token));
}

export async function rejectFriendRequest(token: string, requestExternalId: string): Promise<void> {
  await api.post(`/student/friends/requests/${requestExternalId}/reject`, {}, withAuth(token));
}

export async function removeFriend(token: string, friendExternalId: string): Promise<void> {
  await api.delete(`/student/friends/${friendExternalId}`, withAuth(token));
}

