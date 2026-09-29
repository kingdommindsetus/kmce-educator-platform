export type NervsAvatarAgent = {
  id: "mark" | "tube" | "lucy" | "booker" | "alice" | "snake";
  name: string;
  role: string;
  voiceId: string;
  referenceFile: string;
  mediaUrl: string;
  durationSeconds: number;
  personality: string;
};

export const NERVS_AVATAR_PACK_V1: NervsAvatarAgent[] = [
  {
    id: "mark",
    name: "Mark",
    role: "Marketing Director",
    voiceId: "IKne3meq5aSn9XLyUdCD",
    referenceFile: "mark.mp4",
    mediaUrl: "https://resource2.heygen.ai/video/a3b7f201c15c4fd1a725d8ed3ac95519/original.mp4",
    durationSeconds: 10,
    personality: "Strategic, direct, campaign-focused",
  },
  {
    id: "tube",
    name: "Tube",
    role: "YouTube / Video Creator",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ",
    referenceFile: "tube.mp4",
    mediaUrl: "https://resource2.heygen.ai/video/4caaf0f7d103428e9f831bcbc4835c6d/original.mp4",
    durationSeconds: 10,
    personality: "Creator energy, visual, fast-moving",
  },
  {
    id: "lucy",
    name: "Lucy",
    role: "Social Media / Distribution",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    referenceFile: "lucy.mp4",
    mediaUrl: "https://resource2.heygen.ai/video/a99b918e8ae348c9876e9e93ca1a6491/original.mp4",
    durationSeconds: 10,
    personality: "Bright, social, audience-aware; Lucky is an optional nickname only",
  },
  {
    id: "booker",
    name: "Booker",
    role: "Scheduling / Appointments",
    voiceId: "CwhRBWXzGAHq8TQ4Fs17",
    referenceFile: "booker.mp4",
    mediaUrl: "https://resource2.heygen.ai/video/caa3df691ff44785aa41a1fcad4e667b/original.mp4",
    durationSeconds: 10,
    personality: "Professional, warm, organized",
  },
  {
    id: "alice",
    name: "Alice",
    role: "Storefront / Website Quality",
    voiceId: "Xb7hH8MSUJpSbSDYk0k2",
    referenceFile: "alice.mp4",
    mediaUrl: "https://resource2.heygen.ai/video/4ef3e69dc575487b8eba3a02300fdee2/original.mp4",
    durationSeconds: 10,
    personality: "Polished, precise, conversion-aware",
  },
  {
    id: "snake",
    name: "Snake",
    role: "Growth Measurement / Analytics",
    voiceId: "k5eu7V3cPJkEA7D2irmP",
    referenceFile: "snake.mp4",
    mediaUrl: "https://resource2.heygen.ai/video/e5f8b946639347f2882888b4acc41697/original.mp4",
    durationSeconds: 10,
    personality: "Dry, sarcastic, observant; quietly watches the system",
  },
];

export function avatarMediaUrl(agentId: NervsAvatarAgent["id"]) {
  return NERVS_AVATAR_PACK_V1.find((agent) => agent.id === agentId)?.mediaUrl ?? null;
}
