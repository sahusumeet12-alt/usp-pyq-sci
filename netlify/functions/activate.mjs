import { getStore } from "@netlify/blobs";
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"content-type"}});
const MAXDEV=2;
export default async (req)=>{
  if(req.method==="OPTIONS")return J({});
  if(req.method!=="POST")return J({error:"POST only"},405);
  let b;try{b=await req.json()}catch{return J({error:"Bad request"},400)}
  const email=String(b.email||"").trim().toLowerCase(),code=String(b.code||"").replace(/\D/g,""),dev=String(b.device||"").slice(0,64);
  if(!email||!code||!dev)return J({ok:false,error:"Please enter your email and 6-digit code."});
  const st=getStore("pyq-students");const r=await st.get(email,{type:"json"});
  if(!r)return J({ok:false,error:"This email is not registered. Please WhatsApp 8103405051 after payment."});
  if((r.fails||0)>=10&&Date.now()-(r.failAt||0)<3600e3)return J({ok:false,error:"Too many wrong tries. Try again after 1 hour."});
  if(r.code!==code){r.fails=(r.fails||0)+1;r.failAt=Date.now();await st.setJSON(email,r);return J({ok:false,error:"Wrong code. Please check the code sent on WhatsApp."})}
  if(r.revoked)return J({ok:false,revoked:true,error:"Access for this email has been stopped. Please WhatsApp 8103405051."});
  const today=new Date().toISOString().slice(0,10);
  if(r.valid&&r.valid<today)return J({ok:false,expired:true,error:"Your access expired on "+r.valid+". Please WhatsApp 8103405051 to renew."});
  r.devices=r.devices||[];
  if(!r.devices.includes(dev)){
    if(r.devices.length>=MAXDEV)return J({ok:false,error:"This code is already used on "+MAXDEV+" devices. Please WhatsApp 8103405051."});
    r.devices.push(dev);if(!r.activated)r.activated=new Date().toISOString();
  }
  r.fails=0;r.lastSeen=new Date().toISOString();await st.setJSON(email,r);
  return J({ok:true,mk:process.env.PYQ_MASTER_KEY,valid:r.valid,name:r.name||""});
};
