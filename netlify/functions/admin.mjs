import { getStore } from "@netlify/blobs";
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json"}});
const code6=()=>String(Math.floor(100000+Math.random()*900000));
export default async (req)=>{
  if(req.method!=="POST")return J({error:"POST only"},405);
  if(!process.env.ADMIN_PASSWORD||req.headers.get("x-admin-pass")!==process.env.ADMIN_PASSWORD)return J({error:"Wrong password"},401);
  let b;try{b=await req.json()}catch{b={}}
  const st=getStore("pyq-students");const a=b.action;
  if(a==="login")return J({ok:true});
  if(a==="list"){const {blobs}=await st.list();const out=[];for(const x of blobs){const r=await st.get(x.key,{type:"json"});if(r)out.push({email:x.key,...r})}
    out.sort((p,q)=>(q.created||"").localeCompare(p.created||""));return J({ok:true,students:out})}
  if(a==="add"){const res=[];for(const s of (b.students||[])){const email=String(s.email||"").trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){res.push({email,error:"Invalid email"});continue}
      const old=await st.get(email,{type:"json"});const r=Object.assign(old||{created:new Date().toISOString(),devices:[]},{name:s.name||(old&&old.name)||"",mobile:String(s.mobile||(old&&old.mobile)||"").replace(/\D/g,""),valid:s.valid||(old&&old.valid)||"2027-03-31",revoked:false});
      if(!old)r.code=code6();await st.setJSON(email,r);res.push({email,...r,existed:!!old})}
    return J({ok:true,results:res})}
  const email=String(b.email||"").trim().toLowerCase();const r=await st.get(email,{type:"json"});if(!r)return J({error:"Not found"},404);
  if(a==="revoke"){r.revoked=true}else if(a==="restore"){r.revoked=false}else if(a==="resetDevices"){r.devices=[]}else if(a==="newCode"){r.code=code6();r.devices=[]}else if(a==="extend"){r.valid=b.valid}
  else if(a==="delete"){await st.delete(email);return J({ok:true})}else return J({error:"Unknown action"},400);
  await st.setJSON(email,r);return J({ok:true,student:{email,...r}});
};
