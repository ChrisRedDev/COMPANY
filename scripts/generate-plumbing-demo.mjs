import {mkdirSync,writeFileSync,copyFileSync} from "node:fs";
import {join} from "node:path";
const root=join(process.cwd(),"public/demo");mkdirSync(root,{recursive:true});
const reference="2026-10-06";
const date=(days)=>new Date(Date.parse(`${reference}T12:00:00Z`)-days*86400000).toISOString().slice(0,10);
const specs=[
 [0,"new","call","google_ads","Emergency Dartford","emergency plumber dartford",0,"DA1 2JH","Emergency plumbing","missed"],
 [0,"qualified","form","google_ads","Emergency Dartford","emergency plumber dartford",280,"DA2 6AA","Leak detection","answered"],
 [0,"booked","whatsapp","microsoft_ads","Drainage Kent","blocked drains kent",240,"DA11 0AA","Blocked drains","answered"],
 [0,"paid","call","google_ads","Emergency Dartford","emergency plumber dartford",420,"DA1 1AA","Emergency plumbing","answered"],
 [0,"paid","form","organic","Local search","plumber dartford",210,"DA8 1AA","Toilet repairs","answered"],
 [0,"contacted","call","gbp","Google Business Profile","plumber dartford",0,"DA6 7AA","Taps & sinks","missed"],
 [1,"quote","form","google_ads","Emergency Dartford","leak detection dartford",650,"DA1 5AA","Leak detection","answered"],
 [1,"in_progress","call","google_ads","Emergency Dartford","emergency plumber dartford",380,"DA2 7AA","General plumbing","answered"],
 [2,"completed","whatsapp","microsoft_ads","Drainage Kent","blocked drains kent",320,"ME15 6AA","Blocked drains","answered"],
 [3,"paid","call","google_ads","Emergency Dartford","emergency plumber dartford",590,"DA1 3AA","Emergency plumbing","answered"],
 [4,"paid","form","microsoft_ads","Drainage Kent","blocked drains kent",460,"ME1 1AA","Blocked drains","answered"],
 [5,"lost","website","google_ads","General plumbing broad","plumbing advice",0,"DA1 4AA","General plumbing","answered"],
 [6,"paid","call","google_ads","Emergency Dartford","emergency plumber dartford",740,"DA11 9AA","Emergency plumbing","answered"],
 [8,"paid","form","google_ads","Emergency Dartford","leak detection dartford",560,"BR8 7AA","Leak detection","answered"],
 [10,"paid","call","microsoft_ads","Drainage Kent","blocked drains kent",390,"ME14 1AA","Blocked drains","answered"],
 [12,"paid","whatsapp","google_ads","Emergency Dartford","emergency plumber dartford",480,"DA1 2AA","Emergency plumbing","answered"],
 [14,"quote","form","organic","Local search","bathroom plumber dartford",1200,"DA7 4AA","Bathrooms","answered"],
 [16,"paid","call","google_ads","Emergency Dartford","emergency plumber dartford",510,"DA8 2AA","Emergency plumbing","answered"],
 [20,"paid","form","microsoft_ads","Drainage Kent","blocked drains kent",440,"RM17 5AA","Blocked drains","answered"],
 [24,"paid","call","google_ads","Emergency Dartford","emergency plumber dartford",620,"TN13 1AA","Emergency plumbing","answered"],
];
const stages=["new","contacted","qualified","quote","booked","in_progress","completed","paid"];
const leads=specs.map(([ago,status,channel,source,campaign,keyword,value,postcode,service,outcome],index)=>{
 const landing=postcode.startsWith("ME")?"https://local-plumbing-services.co.uk/24h-maidstone-kent/":"https://local-plumbing-services.co.uk/dartford-kent/";
 const events=[];const add=(type,minutes,metadata={})=>events.push({type,minutes,metadata});
 if(source.endsWith("ads"))add("ad_click",0,{keyword,campaign});add("page_view",1,{landing_page:landing});
 add(channel==="call"?"phone_call":channel==="whatsapp"?"whatsapp":"form_submit",2,channel==="call"?{call_duration:outcome==="missed"?0:180+index*11,call_outcome:outcome,called_number:postcode.startsWith("ME")?"07900 049749":"07392 234913",provider_call_id:`DEMO-CALL-${index+1}`}:{form_name:channel==="website"?"Website callback":"Request a quote"});
 const stage=stages.indexOf(status);if(stage>=2)add("status_change",5,{status:"qualified",previous_status:"contacted"});
 if(stage>=3)add("quote_sent",15,{amount:value,currency:"GBP"});if(stage>=4){add("quote_accepted",25,{amount:value,currency:"GBP"});add("booking_created",30,{scheduled_at:`${date(ago)}T11:00:00Z`});}
 if(stage>=5)add("job_started",120,{amount:value,currency:"GBP"});if(stage>=6)add("job_completed",180,{amount:value,currency:"GBP"});if(stage>=7)add("payment_received",210,{amount:value,currency:"GBP"});
 return {date:date(ago),first_name:`Demo Customer ${String(index+1).padStart(2,"0")}`,last_name:"",company_name:"",email:`plumbing-demo-${index+1}@example.com`,phone:`07700 900${String(index+1).padStart(3,"0")}`,postcode,service,urgency:service==="Emergency plumbing"?"emergency":service==="Bathrooms"?"planned":"same_day",channel,problem:`Synthetic ${service.toLowerCase()} enquiry for demonstration only.`,currency:"GBP",status,source,campaign,medium:source.endsWith("ads")?"cpc":"organic",estimated_value:value,revenue:0,notes:"DEMO — synthetic customer, illustrative values, no live account data.",landing_page:landing,keyword,utm:{utm_source:source,utm_medium:source.endsWith("ads")?"cpc":"organic",utm_campaign:campaign},events};
});
const ads=[];for(let ago=0;ago<30;ago++){
 for(const [source,campaign,keyword,search_term,spend,clicks,conversions] of [["google_ads","Emergency Dartford","emergency plumber dartford","emergency plumber near me",21,7,1],["google_ads","Emergency Dartford","leak detection dartford","water leak repair dartford",6,3,0],["microsoft_ads","Drainage Kent","blocked drains kent","blocked drains maidstone",9,4,ago%4===0?1:0],["google_ads","General plumbing broad","plumbing advice","how to fix a tap yourself",5,4,0]])ads.push({date:date(ago),source,campaign,keyword,search_term,spend,impressions:clicks*19,clicks,conversions,currency:"GBP"});
}
const tracking=[];for(let ago=0;ago<7;ago++)for(const source of ["google_ads","microsoft_ads","organic","gbp"]){
 for(const channel of ["call","form","whatsapp"]){const count=leads.filter(l=>l.date===date(ago)&&l.source===source&&(channel==="form"?["form","website"].includes(l.channel):l.channel===channel)&&!l.events.some(e=>e.type==="phone_call"&&e.metadata.call_outcome==="missed")).length;
 for(const system of ["ga4","gtm",...(source.endsWith("ads")?[source]:[])])tracking.push({date:date(ago),source,channel,system,conversions:count+(ago===0&&source==="google_ads"&&channel==="form"&&system==="gtm"?3:0)+(ago===0&&source==="microsoft_ads"&&channel==="whatsapp"&&system==="microsoft_ads"?1:0),definition:"unique_leads",timezone:"Europe/London",currency:"GBP"});}}
const localSeo=[{date:reference,location:"Dartford",service:"Emergency plumbing",keyword:"emergency plumber dartford",rank:4,competitor:"Demo competitor A",competitor_rank:2,calls:18,reviews:12,rating:4.8,landing_page:"https://local-plumbing-services.co.uk/dartford-kent/"},{date:reference,location:"Maidstone",service:"Blocked drains",keyword:"blocked drains maidstone",rank:8,competitor:"Demo competitor B",competitor_rank:3,calls:9,reviews:7,rating:4.7,landing_page:"https://local-plumbing-services.co.uk/24h-maidstone-kent/"},{date:reference,location:"Gravesend",service:"General plumbing",keyword:"plumber gravesend",rank:11,competitor:"Demo competitor C",competitor_rank:5,calls:6,reviews:5,rating:4.6,landing_page:"https://local-plumbing-services.co.uk/"}];
const fixture={version:1,demo:true,reference_date:reference,currency:"GBP",timezone:"Europe/London",description:"Synthetic Local Plumbing Services demonstration. Not real customers, prices, reviews, rankings or performance.",leads,ads,tracking,localSeo};
writeFileSync(join(root,"plumbing-demo.json"),JSON.stringify(fixture,null,2)+"\n");
function csv(name,rows){const headers=Object.keys(rows[0]);const escape=(v)=>`"${String(v??"").replaceAll('"','""')}"`;writeFileSync(join(root,name),headers.join(",")+"\n"+rows.map(r=>headers.map(h=>escape(r[h])).join(",")).join("\n")+"\n");}
csv("ads-keywords-demo.csv",ads);csv("tracking-health-demo.csv",tracking);csv("local-seo-demo.csv",localSeo);
csv("call-tracking-demo.csv",leads.filter(l=>l.channel==="call").map((l,index)=>{const e=l.events.find(e=>e.type==="phone_call");return{id:`DEMO-FILE-CALL-${index+1}`,timestamp:`${l.date}T09:02:00Z`,phone:l.phone,name:l.first_name,called_number:e.metadata.called_number,outcome:e.metadata.call_outcome,duration:e.metadata.call_duration,source:l.source,campaign:l.campaign,landing_page:l.landing_page,keyword:l.keyword,postcode:l.postcode,service:l.service,problem:l.problem};}));
writeFileSync(join(root,"README.md"),"# Local Plumbing Services DEMO files\n\nEvery contact, transaction, performance value, rank and review metric is synthetic. No call-tracking number has been provisioned and no external messages are sent. The JSON pack is loaded by the DEMO button into a separate SQLite workspace; its dates are shifted relative to the day of first loading. Loading again opens the same demo. The CSV files demonstrate validated import schemas and use the reference date 6 October 2026. Real imports must use GBP and Europe/London. Ads conversions are platform-reported; CRM outcomes and revenue come from lead events. Calls use stable provider IDs for replay protection. Search-term rows show keyword-level CRM outcomes, not fabricated exact search-term attribution.\n\nThe Company Brain is owner-supplied public research, not demo account performance.\n");
if(process.argv[2])copyFileSync(process.argv[2],join(root,"company-brain.md"));
console.log(`Generated demo files with ${leads.length} synthetic leads.`);
