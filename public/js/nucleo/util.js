/* Utilitários gerais: seletores, escape de HTML, formatação de números e datas, avisos (toast) e download de arquivos. */
"use strict";

const NUMK=k=>NUM.includes(k)||ITENS.includes(k);
const clone=o=>JSON.parse(JSON.stringify(o));

const f1=n=>Number(n).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});
const brl=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const brl0=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

const nv=(r,k)=>(r[k]==null||r[k]==="")?NaN:Number(r[k]);

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f0=n=>Number(n).toLocaleString("pt-BR",{maximumFractionDigits:0});
const f2=n=>Number(n).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fdt=s=>{try{return new Date(s).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}catch{return""}};
const slug=id=>String(id).trim().replace(/[^A-Za-z0-9_\-.~:@+]/g,"_").slice(0,150);
let tt;function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,3800)}
const hasRes=x=>typeof x.IUP==="number";
const stCls=s=>"s-"+s.replace(/ /g,"-");
const stPill=s=>`<span class="pill ${s==="Validado"||s==="Homologado"?"ok":s==="Devolvido"?"warn":s==="Em validação"?"info":""}">${esc(sl(s))}</span>`;
const iupPill=f=>`<span class="pill ${f==="Baixo"?"ok":f==="Intenso"?"warn":f==="Muito intenso"?"crit":""}">${esc(f)}</span>`;

function downloadFile(filename,data,type){
  const blob=data instanceof Blob?data:new Blob([data],{type:type||"application/octet-stream"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}
