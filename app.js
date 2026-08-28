const KEY="qr_timecard_v1", STAFF_KEY="qr_timecard_staff_v1";
const $=s=>document.querySelector(s);
const today=()=>new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Tokyo"});
const nowISO=()=>new Date().toISOString();
let records=JSON.parse(localStorage.getItem(KEY)||"[]");
let staff=JSON.parse(localStorage.getItem(STAFF_KEY)||"[]");
if(!staff.length){staff=[{id:"NM-0001",name:"サンプルスタッフ"}];saveStaff()}
function save(){localStorage.setItem(KEY,JSON.stringify(records))}
function saveStaff(){localStorage.setItem(STAFF_KEY,JSON.stringify(staff))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function fmt(iso){if(!iso)return"--:--";return new Date(iso).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"Asia/Tokyo"})}
function dateFmt(){return new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short",timeZone:"Asia/Tokyo"})}
function getToday(){return records.filter(r=>r.date===today())}
function getLatest(id){return records.filter(r=>r.staffId===id&&r.date===today()).sort((a,b)=>new Date(b.time)-new Date(a.time))[0]}
function punch(id){
 const s=staff.find(x=>x.id===id); if(!s){setStatus("登録されていないスタッフIDです",true);return}
 const last=getLatest(id);
 if(!last || last.type==="out"){
   records.push({id:crypto.randomUUID(),staffId:id,name:s.name,date:today(),time:nowISO(),type:"in"});
   save(); showResult(s,"in"); 
 }else{
   records.push({id:crypto.randomUUID(),staffId:id,name:s.name,date:today(),time:nowISO(),type:"out"});
   save(); showResult(s,"out");
 }
 renderAdmin();
}
function setStatus(t,err=false){$("#clockStatus").textContent=t;$("#clockStatus").style.color=err?"var(--red)":"var(--green)"}
function showResult(s,type){
 $("#modalContent").innerHTML=`<div class="success"><div class="big">${type==="in"?"🟢":"🔴"}</div><h2>${esc(s.name)}さん</h2><p>${type==="in"?"出勤":"退勤"}を記録しました。</p><h3>${fmt(nowISO())}</h3><button class="primary" id="ok">OK</button></div>`;
 $("#modal").classList.remove("hidden");$("#ok").onclick=()=>$("#modal").classList.add("hidden");
 setStatus(`${s.name}さんの${type==="in"?"出勤":"退勤"}を記録しました`);
}
function renderAdmin(){
 const t=getToday(), ids=new Set(t.map(x=>x.staffId));
 $("#staffCount").textContent=staff.length;$("#todayIn").textContent=new Set(t.filter(x=>x.type==="in").map(x=>x.staffId)).size;
 $("#todayWorking").textContent=staff.filter(s=>{let l=getLatest(s.id);return l?.type==="in"}).length;
 $("#todayPunches").textContent=t.length;$("#workingCount").textContent=$("#todayWorking").textContent;$("#punchCount").textContent=t.length;
 const q=($("#search")?.value||"").toLowerCase();
 $("#attendanceBody").innerHTML=staff.filter(s=>(s.name+s.id).toLowerCase().includes(q)).map(s=>{let arr=t.filter(x=>x.staffId===s.id);let ins=arr.filter(x=>x.type==="in"),outs=arr.filter(x=>x.type==="out");let last=arr.at(-1);return `<tr><td>${esc(s.name)}</td><td>${esc(s.id)}</td><td>${fmt(ins[0]?.time)}</td><td>${fmt(outs.at(-1)?.time)}</td><td><span class="pill ${last?.type==="in"?"on":"off"}">${last?.type==="in"?"出勤中":"退勤"}</span></td></tr>`}).join("")||`<tr><td colspan="5">データがありません</td></tr>`;
 $("#staffBody").innerHTML=staff.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.id)}</td><td><button class="ghost small qr" data-id="${esc(s.id)}">表示</button></td><td><button class="danger small del" data-id="${esc(s.id)}">削除</button></td></tr>`).join("");
 document.querySelectorAll(".qr").forEach(b=>b.onclick=()=>showQR(b.dataset.id));
 document.querySelectorAll(".del").forEach(b=>b.onclick=()=>{if(confirm("このスタッフを削除しますか？")){staff=staff.filter(s=>s.id!==b.dataset.id);saveStaff();renderAdmin()}});
}
function showQR(id){
 const s=staff.find(x=>x.id===id);
 $("#modalContent").innerHTML=`<h3>${esc(s.name)} のスタッフQR</h3><div class="qrbox"><canvas id="qrCanvas"></canvas></div><p style="text-align:center;color:var(--muted)">ID: ${esc(s.id)}</p><p style="text-align:center"><button class="primary" id="printQR">印刷</button></p>`;
 $("#modal").classList.remove("hidden");QRCode.toCanvas($("#qrCanvas"),s.id,{width:260,margin:2});
 $("#printQR").onclick=()=>{let w=window.open("","_blank");w.document.write(`<html><body style="text-align:center;font-family:sans-serif"><h2>${esc(s.name)}</h2><canvas id="c"></canvas><p>${esc(s.id)}</p><script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script><script>QRCode.toCanvas(document.getElementById("c"),"${esc(s.id)}",{width:300});<\/script></body></html>`);w.document.close();setTimeout(()=>w.print(),500)}
}
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")};
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.page).classList.add("active");if(b.dataset.page==="admin")renderAdmin()});
$("#manualBtn").onclick=()=>{let id=prompt("スタッフIDを入力してください");if(id)punch(id.trim())};
$("#addStaffBtn").onclick=()=>{$("#modalContent").innerHTML=`<h3>スタッフ追加</h3><div class="form"><input id="newName" placeholder="名前"><input id="newId" placeholder="スタッフID（例：NM-0002）"><button class="primary" id="saveNew">登録</button></div>`;$("#modal").classList.remove("hidden");$("#saveNew").onclick=()=>{let name=$("#newName").value.trim(),id=$("#newId").value.trim();if(!name||!id)return alert("名前とIDを入力してください");if(staff.some(s=>s.id===id))return alert("そのIDは既に存在します");staff.push({name,id});saveStaff();$("#modal").classList.add("hidden");renderAdmin()}};
$("#search").oninput=renderAdmin;
$("#exportBtn").onclick=()=>{let rows=[["日時","日付","スタッフID","名前","区分"],...records.map(r=>[r.time,r.date,r.staffId,r.name,r.type==="in"?"出勤":"退勤"])];let csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`timecard_${today()}.csv`;a.click()};
$("#clearBtn").onclick=()=>{if(confirm("勤怠記録をすべて削除します。スタッフ情報は残ります。")){records=[];save();renderAdmin()}};
let stream=null,canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{willReadFrequently:true}),scanning=false;
async function startCamera(){
 try{if(stream)stream.getTracks().forEach(t=>t.stop());stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});$("#video").srcObject=stream;scanning=true;$("#cameraHint").textContent="QRコードをかざしてください";scanLoop()}catch(e){$("#cameraHint").textContent="カメラを使用できません。ID手入力をご利用ください。";setStatus("カメラへのアクセスを許可してください",true)}}
function scanLoop(){if(!scanning)return;let v=$("#video");if(v.readyState>=2){canvas.width=v.videoWidth;canvas.height=v.videoHeight;ctx.drawImage(v,0,0);let d=ctx.getImageData(0,0,canvas.width,canvas.height),code=jsQR(d.data,d.width,d.height,{inversionAttempts:"dontInvert"});if(code?.data){scanning=false;punch(code.data.trim());setTimeout(()=>{scanning=true;scanLoop()},2200);return}}requestAnimationFrame(scanLoop)}
$("#startCamera").onclick=startCamera;
setInterval(()=>{$("#dateNow").textContent=dateFmt();$("#timeNow").textContent=new Date().toLocaleTimeString("ja-JP",{hour12:false,timeZone:"Asia/Tokyo"});renderAdmin()},1000);
$("#dateNow").textContent=dateFmt();renderAdmin();
