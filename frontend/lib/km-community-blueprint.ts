export type CircleTier={
  name:string;
  price_monthly:number|null;
  access_group:string;
  promise:string;
  spaces:string[];
};

export type CommunityBlueprint={
  name:string;
  summary:string;
  tiers:CircleTier[];
  spaces:Array<{name:string;type:"discussion"|"course"|"event"|"chat"|"coaching";visibility:string}>;
  access_groups:Array<{name:string;grants:string[]}>;
  course_outline:Array<{section:string;lessons:string[]}>;
  onboarding:string[];
  provisioning_steps:string[];
};

function moneyValues(input:string){
  return [...input.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)].map(m=>Number(m[1]));
}

function has(input:string,pattern:RegExp){return pattern.test(input.toLowerCase());}

export function buildCommunityBlueprint(brief:string,educatorName?:string):CommunityBlueprint{
  const text=String(brief||"").trim();
  const prices=moneyValues(text);
  const wantsFree=has(text,/\bfree\b/);
  const wantsVip=has(text,/\bvip\b|coaching|1[- ]on[- ]1|one[- ]on[- ]one/);
  const wantsCourses=has(text,/course|lesson|training|library/);
  const wantsEvents=has(text,/event|live|webinar|office hours|q&a/);
  const base=educatorName?educatorName.replace(/^Dr\.?\s*/i,"").trim():"Faculty";
  const tiers:CircleTier[]=[];

  if(wantsFree||prices.length===0){
    tiers.push({name:"Community",price_monthly:0,access_group:"Community",promise:"Free community access and foundational discussion spaces.",spaces:["Welcome","Community Feed"]});
  }
  const paidPrice=prices[0]??97;
  tiers.push({name:"Member",price_monthly:paidPrice,access_group:"Member",promise:wantsCourses?"Community plus structured course access.":"Expanded community access and premium resources.",spaces:["Member Lounge",...(wantsCourses?["Course Library"]:["Resource Library"])]});
  if(wantsVip||prices.length>1){
    tiers.push({name:"VIP",price_monthly:prices[1]??297,access_group:"VIP",promise:"Premium access with direct support, private discussion, and coaching.",spaces:["VIP Inner Circle","Coaching Hub"]});
  }

  const spaces=[
    {name:"Start Here",type:"discussion" as const,visibility:"All members"},
    {name:"Community Feed",type:"discussion" as const,visibility:"Community+"},
    ...(wantsCourses?[{name:"Course Library",type:"course" as const,visibility:"Member+"}]:[]),
    ...(wantsEvents?[{name:"Live Events",type:"event" as const,visibility:"Member+"}]:[]),
    ...(wantsVip?[{name:"VIP Inner Circle",type:"discussion" as const,visibility:"VIP"},{name:"Coaching Hub",type:"coaching" as const,visibility:"VIP"}]:[]),
  ];

  return {
    name:`${base} Community`,
    summary:`A tiered Circle community blueprint generated from the educator brief. Nothing is provisioned until founder approval.`,
    tiers,
    spaces,
    access_groups:tiers.map(t=>({name:t.access_group,grants:t.spaces})),
    course_outline:wantsCourses?[
      {section:"Start Here",lessons:["Welcome & Orientation","How to Use the Community"]},
      {section:"Core Curriculum",lessons:["Module 1","Module 2","Implementation"]},
      {section:"Next Steps",lessons:["Action Plan","Resources & Support"]},
    ]:[],
    onboarding:["Welcome post","Community guidelines","Introduce yourself prompt","How to access your tier"],
    provisioning_steps:["Create access groups","Create spaces","Map spaces to access groups","Create course sections and draft lessons","Create welcome content","Founder verifies structure","Open enrollment"],
  };
}
