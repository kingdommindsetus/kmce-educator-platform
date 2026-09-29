import assert from "node:assert/strict";
import {emailAddress,stripQuotedReply,classifyReply,normalizeThreadMessages,inboundMessages} from "../lib/echo-replies.mjs";

assert.equal(emailAddress("Kimberly <KINGDOMMINDSETUS@gmail.com>"),"kingdommindsetus@gmail.com");
assert.equal(stripQuotedReply("Yes, please send more info.\n\nOn Monday Kimberly wrote:\n> old text"),"Yes, please send more info.");

let c=classifyReply("Yes, please send more information.");
assert.equal(c.classification,"INTERESTED");
assert.equal(c.pipeline_stage,"INTERESTED");
assert.equal(c.assigned_agent,"Booker");

c=classifyReply("No thanks, we are not interested.");
assert.equal(c.classification,"NOT_INTERESTED");
assert.equal(c.pipeline_stage,"DISQUALIFIED");
assert.equal(c.assigned_agent,"Atlas");

c=classifyReply("Thank you for reaching out.");
assert.equal(c.classification,"REPLIED");
assert.equal(c.pipeline_stage,"REPLIED");

const provider={data:{messages:[
 {messageId:"sent1",threadId:"t1",sender:"Kimberly <kingdommindsetus@gmail.com>",to:"lead@example.com",messageText:"hello",messageTimestamp:"2026-09-29T01:00:00Z",labelIds:["SENT"]},
 {messageId:"reply1",threadId:"t1",sender:"Lead <lead@example.com>",to:"kingdommindsetus@gmail.com",messageText:"I'm interested in learning more.",messageTimestamp:"2026-09-29T02:00:00Z",labelIds:["INBOX"]}
]}};
const messages=normalizeThreadMessages(provider);
assert.equal(messages.length,2);
const inbound=inboundMessages(messages,"kingdommindsetus@gmail.com","2026-09-29T01:01:00Z");
assert.equal(inbound.length,1);
assert.equal(inbound[0].messageId,"reply1");


const gmailNative={data:{
 id:"t2",
 messages:[
  {
   id:"sent2",threadId:"t2",internalDate:"1790644090000",labelIds:["SENT"],
   payload:{headers:[
    {name:"From",value:"Kimberly <kingdommindsetus@gmail.com>"},
    {name:"To",value:"lead@example.com"},
    {name:"Subject",value:"Native thread"}
   ],body:{data:Buffer.from("hello").toString("base64url")}}
  },
  {
   id:"reply2",threadId:"t2",internalDate:"1790647690000",labelIds:["INBOX"],
   payload:{headers:[
    {name:"From",value:"Lead <lead@example.com>"},
    {name:"To",value:"kingdommindsetus@gmail.com"},
    {name:"Subject",value:"Re: Native thread"}
   ],body:{data:Buffer.from("Yes, I'd like to learn more.").toString("base64url")}}
  }
 ]
}};
const nativeMessages=normalizeThreadMessages(gmailNative);
assert.equal(nativeMessages.length,2);
assert.equal(nativeMessages[1].body,"Yes, I'd like to learn more.");
assert.equal(nativeMessages[1].sender,"Lead <lead@example.com>");
assert.match(nativeMessages[1].timestamp,/^2026-/);

console.log("Echo reply detection PASS: provider normalization, Gmail-native payload parsing, self-filtering, quote stripping, and conservative routing work.");
