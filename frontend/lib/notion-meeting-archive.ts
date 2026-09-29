type NotionMeetingArchiveInput={
  meetingId:number;
  meetingDate:string;
  meetingType:string;
  summary:string;
  wins:number;
  blockers:number;
  actions:number;
  founderApprovals:number;
  reports:Array<{
    agent_name:string;
    win?:string|null;
    blocker?:string|null;
    next_action?:string|null;
    ask_of_team?:string|null;
  }>;
  actionItems:Array<{
    assigned_agent:string;
    title:string;
    instruction:string;
    priority:string;
    authority:string;
    status:string;
  }>;
};

const DEFAULT_DATA_SOURCE_ID="ba923415-e6eb-4aa3-843c-d74dcbba0880";

function richText(content:string){
  return [{type:"text",text:{content}}];
}

function paragraph(content:string){
  return {object:"block",type:"paragraph",paragraph:{rich_text:richText(content)}};
}

function heading2(content:string){
  return {object:"block",type:"heading_2",heading_2:{rich_text:richText(content)}};
}

function bullet(content:string){
  return {object:"block",type:"bulleted_list_item",bulleted_list_item:{rich_text:richText(content)}};
}

export async function mirrorMeetingToNotion(input:NotionMeetingArchiveInput){
  const token=process.env.NOTION_API_KEY;
  const dataSourceId=process.env.NOTION_MEETING_DATA_SOURCE_ID||DEFAULT_DATA_SOURCE_ID;

  if(!token){
    return {status:"NOT_CONFIGURED" as const,pageId:null,pageUrl:null,error:null};
  }

  const children:any[]=[
    heading2("Executive Summary"),
    paragraph(input.summary),
    heading2("Agent Reports"),
    ...input.reports.flatMap(report=>[
      paragraph(report.agent_name),
      bullet("WIN: "+(report.win||"—")),
      bullet("BLOCKER: "+(report.blocker||"—")),
      bullet("NEXT: "+(report.next_action||"—")),
      bullet("ASK: "+(report.ask_of_team||"—")),
    ]),
    heading2("Action Items"),
    ...(input.actionItems.length
      ? input.actionItems.map(action=>bullet(
          action.assigned_agent+" · "+action.priority+" · "+action.authority+" · "+action.status+" — "+action.title+" — "+action.instruction
        ))
      : [paragraph("No action items were generated.")]),
  ];

  const payload={
    parent:{type:"data_source_id",data_source_id:dataSourceId},
    properties:{
      "Meeting":{title:richText("NERVS Daily — "+input.meetingDate+" · #"+input.meetingId)},
      "Meeting ID":{number:input.meetingId},
      "Meeting Date":{date:{start:input.meetingDate}},
      "Status":{select:{name:"COMPLETED"}},
      "Meeting Type":{select:{name:input.meetingType}},
      "Executive Summary":{rich_text:richText(input.summary.slice(0,1900))},
      "Wins":{number:input.wins},
      "Blockers":{number:input.blockers},
      "Actions":{number:input.actions},
      "Founder Approvals":{number:input.founderApprovals},
      "Source":{select:{name:"KMCE NERVS"}},
    },
    children,
  };

  const response=await fetch("https://api.notion.com/v1/pages",{
    method:"POST",
    headers:{
      "Authorization":"Bearer "+token,
      "Content-Type":"application/json",
      "Notion-Version":"2025-09-03",
    },
    body:JSON.stringify(payload),
  });

  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    return {
      status:"ERROR" as const,
      pageId:null,
      pageUrl:null,
      error:String(data?.message||("Notion sync failed with HTTP "+response.status)),
    };
  }

  return {
    status:"SYNCED" as const,
    pageId:String(data.id||""),
    pageUrl:String(data.url||""),
    error:null,
  };
}
