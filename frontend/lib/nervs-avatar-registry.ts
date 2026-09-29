export type NervsAvatarAgent = {
  id: "mark" | "tube" | "lucy" | "booker" | "alice" | "snake";
  name: string;
  role: string;
  voiceId: string;
  referenceFile: string;
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
    durationSeconds: 10,
    personality: "Strategic, direct, campaign-focused",
  },
  {
    id: "tube",
    name: "Tube",
    role: "YouTube / Video Creator",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ",
    referenceFile: "tube.mp4",
    durationSeconds: 10,
    personality: "Creator energy, visual, fast-moving",
  },
  {
    id: "lucy",
    name: "Lucy",
    role: "Social Media / Distribution",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    referenceFile: "lucy.mp4",
    durationSeconds: 10,
    personality: "Bright, social, audience-aware; Lucky is an optional nickname only",
  },
  {
    id: "booker",
    name: "Booker",
    role: "Scheduling / Appointments",
    voiceId: "CwhRBWXzGAHq8TQ4Fs17",
    referenceFile: "booker.mp4",
    durationSeconds: 10,
    personality: "Professional, warm, organized",
  },
  {
    id: "alice",
    name: "Alice",
    role: "Storefront / Website Quality",
    voiceId: "Xb7hH8MSUJpSbSDYk0k2",
    referenceFile: "alice.mp4",
    durationSeconds: 10,
    personality: "Polished, precise, conversion-aware",
  },
  {
    id: "snake",
    name: "Snake",
    role: "Growth Measurement / Analytics",
    voiceId: "k5eu7V3cPJkEA7D2irmP",
    referenceFile: "snake.mp4",
    durationSeconds: 10,
    personality: "Dry, sarcastic, observant; quietly watches the system",
  },
];

export function avatarMediaUrl(agentId: NervsAvatarAgent["id"]) {
  const base = process.env.NEXT_PUBLIC_NERVS_AVATAR_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/${agentId}.mp4` : null;
}
