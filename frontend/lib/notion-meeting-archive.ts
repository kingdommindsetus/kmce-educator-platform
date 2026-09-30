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

const DEFAULT_DATABASE_ID="3ea84961-9c26-81ea-8308-d61a54c8596e";
const DEFAULT_CONNECTED_ACCOUNT_ID="notion_artha-curb";

function compact(value:unknown,max=1900){
  return String(value??"").replace(/\s+/g," ").trim().slice(0,max);
}

function child(content:string,block_property:"paragraph"|"heading_2"|"bulleted_list_item"){
  return {content:compact(content,1900),block_property};
}

function findString(value:any,key:string):string{
  if(!value||typeof value!=="object") return "";
  if(typeof value[key]==="string") return value[key];
  for(const childValue of Object.values(value)){
    if(childValue&&typeof childValue==="object"){
      const found=findString(childValue,key);
      if(found) return found;
    }
  }
  return "";
}

export async function mirrorMeetingToNotion(input:NotionMeetingArchiveInput){
  const apiKey=process.env.COMPOSIO_API_KEY;
  const databaseId=process.env.NOTION_MEETING_DATABASE_ID||DEFAULT_DATABASE_ID;
  const connectedAccountId=process.env.COMPOSIO_NOTION_CONNECTED_ACCOUNT_ID||DEFAULT_CONNECTED_ACCOUNT_ID;

  if(!apiKey){
    return {status:"NOT_CONFIGURED" as const,pageId:null,pageUrl:null,error:"COMPOSIO_API_KEY is not configured"};
  }

  const childBlocks:any[]=[
    child("Executive Summary","heading_2"),
    child(input.summary,"paragraph"),
    child("Agent Reports","heading_2"),
    ...input.reports.flatMap(report=>[
      child(report.agent_name,"paragraph"),
      child("WIN: "+(report.win||"—"),"bulleted_list_item"),
      child("BLOCKER: "+(report.blocker||"—"),"bulleted_list_item"),
      child("NEXT: "+(report.next_action||"—"),"bulleted_list_item"),
      child("ASK: "+(report.ask_of_team||"—"),"bulleted_list_item"),
    ]),
    child("Action Items","heading_2"),
    ...(input.actionItems.length
      ? input.actionItems.map(action=>child(
          action.assigned_agent+" · "+action.priority+" · "+action.authority+" · "+action.status+
          " — "+action.title+" — "+action.instruction,
          "bulleted_list_item"
        ))
      : [child("No action items were generated.","paragraph")]),
  ].slice(0,100);

  const properties=[
    {name:"Meeting",type:"title",value:"PEGASUS Daily — "+input.meetingDate+" · #"+input.meetingId},
    {name:"Meeting ID",type:"number",value:String(input.meetingId)},
    {name:"Meeting Date",type:"date",value:input.meetingDate},
    {name:"Status",type:"select",value:"COMPLETED"},
    {name:"Meeting Type",type:"select",value:input.meetingType},
    {name:"Executive Summary",type:"rich_text",value:compact(input.summary)},
    {name:"Wins",type:"number",value:String(input.wins)},
    {name:"Blockers",type:"number",value:String(input.blockers)},
    {name:"Actions",type:"number",value:String(input.actions)},
    {name:"Founder Approvals",type:"number",value:String(input.founderApprovals)},
    {name:"Source",type:"select",value:"KMCE PEGASUS"},
  ];

  const response=await fetch(
    "https://backend.composio.dev/api/v3.1/tools/execute/NOTION_INSERT_ROW_DATABASE",
    {
      method:"POST",
      headers:{
        "x-api-key":apiKey,
        "Content-Type":"application/json",
      },
      body:JSON.stringify({
        connected_account_id:connectedAccountId,
        version:"latest",
        arguments:{
          database_id:databaseId,
          properties,
          child_blocks:childBlocks,
        },
      }),
    }
  );

  const data=await response.json().catch(()=>({}));
  const successful=response.ok && data?.successful!==false && data?.error==null;

  if(!successful){
    return {
      status:"ERROR" as const,
      pageId:null,
      pageUrl:null,
      error:compact(
        data?.error||
        data?.message||
        data?.data?.message||
        ("Composio Notion sync failed with HTTP "+response.status)
      ),
    };
  }

  const pageUrl=findString(data,"url");
  const pageId=findString(data,"id");

  return {
    status:"SYNCED" as const,
    pageId:pageId||null,
    pageUrl:pageUrl||null,
    error:null,
  };
}
