export type NervsAvatarAgent = {
  id: "simon" | "marie" | "eyes" | "mark" | "cammy" | "eve" | "tube" | "lucy" | "snake" | "alice" | "echo" | "booker";
  name: string;
  role: string;
  voiceId: string;
  referenceFile: string | null;
  mediaUrl: string | null;
  durationSeconds: number | null;
  liveTalkingAvatarId: string;
  liveTalkingModel: "musetalk";
  personality: string;
};

export const NERVS_AVATAR_PACK_V1: NervsAvatarAgent[] = [
  {
    id:"simon", name:"Simon", role:"Executive / Orchestrator", voiceId:"pqHfZKP75CvOlQylNhV4",
    referenceFile:"simon.mp4", mediaUrl:"https://resource2.heygen.ai/video/f55d6cfb26d84479836f9bba79d80170/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_simon_v1",
    liveTalkingModel:"musetalk",
    personality:"Calm, executive, decisive, systems-focused",
  },
  {
    id:"marie", name:"Marie", role:"Executive Operations", voiceId:"EXAVITQu4vr4xnSDxMaL",
    referenceFile:"marie.mp4", mediaUrl:"https://resource2.heygen.ai/video/6e099264853744ee98105fc377c0167b/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_marie_v1",
    liveTalkingModel:"musetalk",
    personality:"Reassuring, organized, operationally disciplined",
  },
  {
    id:"eyes", name:"Eyes", role:"Market Intelligence", voiceId:"CwhRBWXzGAHq8TQ4Fs17",
    referenceFile:"eyes.mp4", mediaUrl:"https://resource2.heygen.ai/video/2667f12ff04e4352b445177f24ddc370/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_eyes_v1",
    liveTalkingModel:"musetalk",
    personality:"Analytical, observant, evidence-first",
  },
  {
    id:"mark", name:"Mark", role:"Marketing Director", voiceId:"IKne3meq5aSn9XLyUdCD",
    referenceFile:"mark.mp4", mediaUrl:"https://resource2.heygen.ai/video/a3b7f201c15c4fd1a725d8ed3ac95519/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_mark_v1",
    liveTalkingModel:"musetalk",
    personality:"Strategic, direct, campaign-focused",
  },
  {
    id:"cammy", name:"Cammy", role:"Campaign Generation / Economics", voiceId:"XrExE9yKIg1WjnnlVkGX",
    referenceFile:"cammy.mp4", mediaUrl:"https://resource2.heygen.ai/video/832eb6d56c384118aff8046eedf782d6/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_cammy_v1",
    liveTalkingModel:"musetalk",
    personality:"Professional, numbers-aware, campaign-focused",
  },
  {
    id:"eve", name:"Eve", role:"Brand / Catalog Curator", voiceId:"pFZP5JQG7iQjIQuC4Bku",
    referenceFile:"eve.mp4", mediaUrl:"https://resource2.heygen.ai/video/c989ddbe118c41988c8b36c54d70e51c/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_eve_v1",
    liveTalkingModel:"musetalk",
    personality:"Polished, visual, brand-protective",
  },
  {
    id:"tube", name:"Tube", role:"YouTube / Video Creator", voiceId:"TX3LPaxmHKxFdv7VOQHJ",
    referenceFile:"tube.mp4", mediaUrl:"https://resource2.heygen.ai/video/4caaf0f7d103428e9f831bcbc4835c6d/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_tube_v1",
    liveTalkingModel:"musetalk",
    personality:"Creator energy, visual, fast-moving",
  },
  {
    id:"lucy", name:"Lucy", role:"Social Media / Distribution", voiceId:"cgSgspJ2msm6clMCkdW9",
    referenceFile:"lucy.mp4", mediaUrl:"https://resource2.heygen.ai/video/a99b918e8ae348c9876e9e93ca1a6491/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_lucy_v1",
    liveTalkingModel:"musetalk",
    personality:"Bright, social, audience-aware; Lucky is an optional nickname only",
  },
  {
    id:"snake", name:"Snake", role:"Growth Measurement / Analytics", voiceId:"k5eu7V3cPJkEA7D2irmP",
    referenceFile:"snake.mp4", mediaUrl:"https://resource2.heygen.ai/video/e5f8b946639347f2882888b4acc41697/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_snake_v1",
    liveTalkingModel:"musetalk",
    personality:"Dry, sarcastic, observant; quietly watches the system",
  },
  {
    id:"alice", name:"Alice", role:"Storefront / Website Quality", voiceId:"Xb7hH8MSUJpSbSDYk0k2",
    referenceFile:"alice.mp4", mediaUrl:"https://resource2.heygen.ai/video/4ef3e69dc575487b8eba3a02300fdee2/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_alice_v1",
    liveTalkingModel:"musetalk",
    personality:"Polished, precise, conversion-aware",
  },
  {
    id:"echo", name:"Echo", role:"Sales Outreach", voiceId:"cjVigY5qzO86Huf0OWal",
    referenceFile:"echo.mp4", mediaUrl:"https://resource2.heygen.ai/video/889b48b78e0b4c14aad5157955441ac1/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_echo_v1",
    liveTalkingModel:"musetalk",
    personality:"Clear, trustworthy, professional",
  },
  {
    id:"booker", name:"Booker", role:"Scheduling / Appointments", voiceId:"CwhRBWXzGAHq8TQ4Fs17",
    referenceFile:"booker.mp4", mediaUrl:"https://resource2.heygen.ai/video/caa3df691ff44785aa41a1fcad4e667b/original.mp4", durationSeconds:10,
    liveTalkingAvatarId:"kmce_booker_v1",
    liveTalkingModel:"musetalk",
    personality:"Professional, warm, organized",
  },
];

export function avatarMediaUrl(agentId:NervsAvatarAgent["id"]) {
  return NERVS_AVATAR_PACK_V1.find(agent=>agent.id===agentId)?.mediaUrl ?? null;
}
