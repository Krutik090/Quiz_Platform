import type { AvatarOption, JoinEventInput, Participant } from "@tribastion/shared";
import { apiClient } from "@/lib/api-client";

export { AVATAR_OPTIONS } from "@tribastion/shared";
export type { AvatarOption };

export const participantApi = {
  async join(input: JoinEventInput) {
    const { data } = await apiClient.post<{ participant: Participant; token: string }>("/public/participants/join", input);
    return data;
  },
};
