(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(a){if(a.ep)return;a.ep=!0;const r=n(a);fetch(a.href,r)}})();function Qa(){if(typeof import.meta<"u")return"/EDHLOG/";const{pathname:t}=window.location,e=t.split("/").filter(Boolean),n=e[e.length-1]||"";return e.length&&!n.includes(".")?`/${e[0]}/`:"./"}const Ws="America/New_York";function ee(){return new Intl.DateTimeFormat("en-CA",{timeZone:Ws}).format(new Date)}function co(){return new Intl.DateTimeFormat("en-GB",{timeZone:Ws,hour:"2-digit",minute:"2-digit",hour12:!1}).format(new Date)}function io(){const t=new Intl.DateTimeFormat("en-GB",{timeZone:Ws,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).format(new Date);return`${ee()}-${t.replace(/:/g,"-")}`}function tr(t){if(!t||typeof t!="string")return"";const e=t.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);if(!e)return"";const n=Number(e[1]),s=Number(e[2]);return n<0||n>23||s<0||s>59?"":`${String(n).padStart(2,"0")}:${String(s).padStart(2,"0")}`}function zt(t){const e=T((t==null?void 0:t.date)||""),n=tr(t==null?void 0:t.time)||"00:00";return`${e}T${n}`}function K(t,e){const n=zt(t).localeCompare(zt(e));return n!==0?n:String(t.id||"").localeCompare(String(e.id||""))}function T(t){if(!t||typeof t!="string"||/^\d{4}-\d{2}-\d{2}$/.test(t))return t;const e=t.match(/^(\d{1,2})\/\?\/(\d{2})$/);if(e){const[,s,a]=e;return`20${a}-${s.padStart(2,"0")}-15`}const n=new Date(t);return Number.isNaN(n.getTime())?t:n.toISOString().slice(0,10)}function X(t){const e=T(t),[n,s,a]=e.split("-");return!n||!s||!a?t:new Date(Number(n),Number(s)-1,Number(a)).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}function mn(t){return T(t).slice(0,4)}function z(t){return String((t==null?void 0:t.id)||"").trim()}function Fe(t){return String((t==null?void 0:t.commander)||(t==null?void 0:t.name)||"").trim()}function O(t){return String((t==null?void 0:t.commander)||(t==null?void 0:t.name)||"").trim()}function B(t){return String((t==null?void 0:t.name)||"").trim()||O(t)}function Ts(t){return O(t)}function As(t,e){const n=T(e)||String(e||"").trim(),s=[...t.history||[]].sort((a,r)=>String(a.changedAt).localeCompare(String(r.changedAt)));for(const a of s){const r=T(a.changedAt)||String(a.changedAt||"").trim();if(r&&n<r){const o=String(a.commander||"").trim();if(o)return o}}return O(t)}function zn(t,e){var a;const n=et(e,t.deck);if((a=n==null?void 0:n.history)!=null&&a.length)return As(n,t.date);const s=String(t.myCommander||"").trim();return s||(n?O(n):String(t.deck||"").trim())}function et(t,e){const n=String(e||"").trim();return n&&(t.find(s=>z(s)===n)||t.find(s=>Fe(s)===n)||t.find(s=>String(s.name||"").trim()===n))||null}function it(t){const e=new Map;for(const n of t){const s=z(n);s&&e.set(s,n);const a=Fe(n);a&&e.set(a,n);const r=String(n.name||"").trim();r&&r!==a&&e.set(r,n)}return e}function xn(t,e){const n=et(e,t);return n?Ts(n):String(t||"").trim()}function On(t,e){const n=et(e,t);return n?B(n):String(t||"").trim()}const er="edhlog-data-v1";let se=null,Rn=null;function lo(){return Rn}function oa(t){return`${T(t.date)}|${t.deck}|${t.result}`}async function nr(){return await(await fetch(`${Qa()}data/seed.json`,{cache:"no-store"})).json()}function uo(t){let e=!1;for(const n of t.decks)n.commander||(n.commander=n.name||"",n.name="",e=!0);return e}function mo(t){var a,r;let e=!1;function n(o){const c=o.decks.map(i=>i.id).filter(Boolean).map(i=>{const d=/^d-(\d+)$/.exec(i);return d?Number(d[1]):0});return`d-${(c.length?Math.max(...c):0)+1}`}for(const o of t.decks)o.id||(o.id=n(t),e=!0);const s=new Map;for(const o of t.decks){const c=o.id;if(!c)continue;s.set(c,c),s.set(Fe(o),c),s.set(O(o),c);const l=String(o.name||"").trim();l&&s.set(l,c);const i=(r=(a=t.meta)==null?void 0:a.deckSeedKeyById)==null?void 0:r[c];i&&s.set(i,c)}for(const o of t.games){const c=o.deck,l=s.get(c)||(t.decks.some(i=>i.id===c)?c:null);if(l){if(!o.myCommander){if(c!==l&&!/^d-\d+$/.test(c))o.myCommander=c;else{const i=t.decks.find(d=>d.id===l);i&&(o.myCommander=O(i))}e=!0}o.deck!==l&&(o.deck=l,e=!0)}}return e}function fo(t){let e=uo(t);const n=new Map;for(const s of t.games){const a=n.get(s.deck);(!a||s.date<a)&&n.set(s.deck,s.date)}for(const s of t.decks)s.createdAt||(s.createdAt=n.get(s.id)||n.get(s.commander)||n.get(s.name)||"2024-04-15",e=!0);return mo(t)&&(e=!0),po(t)&&(e=!0),e}function po(t){var n;let e=!1;for(const s of t.games){const a=et(t.decks,s.deck);if(!((n=a==null?void 0:a.history)!=null&&n.length))continue;const r=As(a,s.date);r&&s.myCommander!==r&&(s.myCommander=r,e=!0)}return e}function Le(t){return String(t.commander||t.name||"").trim()}function sr(t,e,n){!e||!n||(t.meta||(t.meta={}),t.meta.deckSeedKeyById||(t.meta.deckSeedKeyById={}),t.meta.deckSeedKeyById[e]=n)}function ar(t,e,n){sr(t,e,n)}function rr(t,e){const n=Le(e);n&&(t.meta||(t.meta={}),t.meta.removedSeedDeckKeys||(t.meta.removedSeedDeckKeys=[]),t.meta.removedSeedDeckKeys.includes(n)||t.meta.removedSeedDeckKeys.push(n))}function go(t){var s;const e=new Set(((s=t.meta)==null?void 0:s.removedSeedDeckKeys)||[]);if(!e.size)return!1;const n=t.decks.length;return t.decks=t.decks.filter(a=>!e.has(Le(a))),t.decks.length!==n}function yo(t){let e=!1;const n=new Set;for(const s of t.decks)for(const a of s.history||[]){const r=String(a.commander||"").trim();if(r)for(const o of t.decks)o===s||n.has(o)||Le(o)===r&&(n.add(o),rr(t,o),s.id&&ar(t,s.id,r),e=!0)}return n.size?(t.decks=t.decks.filter(s=>!n.has(s)),!0):e}function ho(t,e,n){var s;return{...e,id:n.id,name:n.name??e.name??"",commander:n.commander||e.commander||e.name||"",bracket:n.bracket??e.bracket??4,colors:[...(s=n.colors)!=null&&s.length?n.colors:e.colors||[]],retired:n.retired??e.retired??!1,createdAt:n.createdAt??e.createdAt,history:n.history??e.history,listUrl:n.listUrl??e.listUrl,listSource:n.listSource??e.listSource,listSyncedAt:n.listSyncedAt??e.listSyncedAt,cards:n.cards??e.cards,archetypes:n.archetypes??e.archetypes}}function or(t){let e=!1;for(const n of t.games){const s=T(n.date);s!==n.date&&(n.date=s,e=!0)}return go(t)&&(e=!0),yo(t)&&(e=!0),fo(t)&&(e=!0),e}function bo(t,e){var f,p,g,m,$;const n=new Set(e.games.map(h=>h.id)),s=t.games.length,a=new Map;for(const h of t.games)h.source==="local"&&n.has(h.id)&&a.set(h.id,h);const r=t.games.filter(h=>h.source==="local"&&!n.has(h.id));t.games=e.games.map(h=>{const R=a.get(h.id);return R?{...h,...R,source:"local"}:{...h}});let o=t.games.length+1;for(const h of r)t.games.push({...h,id:`game-${o++}`,source:"local"});const c=new Map,l=new Map;for(const h of t.decks){const R=Le(h);R&&c.set(R,h);const b=h.id,v=b&&((p=(f=t.meta)==null?void 0:f.deckSeedKeyById)==null?void 0:p[b]);v&&l.set(v,h)}const i=new Set(((g=t.meta)==null?void 0:g.removedSeedDeckKeys)||[]),d=new Set,u=[];for(const h of e.decks){const R=Le(h);if(!R||i.has(R))continue;const b=c.get(R)||l.get(R);b!=null&&b.id&&d.add(b.id);const v=b?ho(t,h,b):{...h,colors:[...h.colors||[]]};b!=null&&b.id&&ar(t,b.id,R),u.push(v)}for(const h of t.decks){if(h.id&&d.has(h.id))continue;const R=Le(h);R&&i.has(R)||u.push({...h,colors:[...h.colors||[]]})}return t.decks=u,t.meta={...t.meta,seedHash:(m=e.meta)==null?void 0:m.seedHash,seedGames:(($=e.meta)==null?void 0:$.seedGames)??e.games.length},{games:e.games.length,keptLocal:r.length,removed:Math.max(0,s-t.games.length)}}function Bs(){if(se)return se;const t=localStorage.getItem(er);return t?(se=JSON.parse(t),or(se)&&ct(se),se):null}async function $o(){var s,a;Rn=null;const t=await nr();let e=Bs();if(!e)return ct(t),t;const n=(s=t.meta)==null?void 0:s.seedHash;if(n){const r=e.games.length,o=(a=e.meta)==null?void 0:a.seedHash,c=JSON.stringify(e.decks),l=bo(e,t),i=or(e),d=JSON.stringify(e.decks)!==c;(r!==e.games.length||o!==n||d||i)&&(ct(e),(l.removed>0||o!==n)&&(Rn=l))}return e}function ct(t){try{return se=t,localStorage.setItem(er,JSON.stringify(t)),!0}catch(e){return console.error("EDHLOG save failed",e),!1}}async function ko(){const t=await nr();return ct(t),Rn=null,t}function cr(t,e){const n=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),s=URL.createObjectURL(n),a=document.createElement("a");a.href=s,a.download=e,a.rel="noopener",a.style.display="none",document.body.appendChild(a),a.click(),a.remove(),window.setTimeout(()=>URL.revokeObjectURL(s),1e3)}function vo(){const t=Bs();t&&cr(t,`edhlog-${ee()}.json`)}function So(t){const e=t||Bs();e&&cr(e,`edhlog-${io()}.json`)}async function wo(t){const e=await t.text(),n=JSON.parse(e);if(!n.decks||!n.games)throw new Error("Invalid EDHLOG data file");return ct(n),n}function Co(t){const e=t.map(s=>parseInt(s.id.replace("game-",""),10)).filter(s=>!Number.isNaN(s));return`game-${(e.length?Math.max(...e):0)+1}`}function ls(t){const e=t.decks.map(s=>s.id).filter(Boolean).map(s=>{const a=/^d-(\d+)$/.exec(s);return a?Number(a[1]):0});return`d-${(e.length?Math.max(...e):0)+1}`}const ds=[[],["W"],["U"],["B"],["R"],["G"],["W","U"],["R","W"],["U","B"],["B","G"],["R","G"],["U","R"],["W","B"],["B","R"],["W","G"],["U","G"],["W","B","G"],["W","U","G"],["W","U","B"],["U","B","R"],["W","U","R"],["B","R","G"],["W","B","R"],["W","R","G"],["U","B","G"],["U","R","G"],["U","B","R","G"],["W","B","R","G"],["W","U","R","G"],["W","B","U","G"],["W","B","U","R"],["W","U","B","R","G"]];function ir(t){return[...t].sort((e,n)=>tn.indexOf(e)-tn.indexOf(n))}function lr(t){return new Set((t||[]).filter(e=>tn.includes(e)))}function dr(t,e){return t.length?t.length===e.size&&t.every(n=>e.has(n)):e.size===0}function Ns(t){const e=lr(t);if(!e.size)return[];for(const n of ds)if(n.length&&dr(n,e))return[...n];return ir(e)}function us(t){const e=lr(t);for(let s=0;s<ds.length;s++)if(dr(ds[s],e))return s;const n=ir(e).join("");return 1e4+e.size*1e3+n.split("").reduce((s,a)=>s*10+tn.indexOf(a),0)}const tn=["W","U","B","R","G","C"],Fn={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green",C:"Colorless"},xo=5,Ro=20;function Mn(t){const e=tn.indexOf(t);return e===-1?99:e}function W(t,e){return e?t/e:0}function pe(t,e=2){const n=(t*100).toFixed(e);return`${e>0?n.replace(/\.?0+$/,""):n}%`}function ft(t,e){return(t+xo)/(e+Ro)}function Ln(t,e){const n=new Map;for(const s of t){const a=z(s);n.set(a,{...s,id:a,games:0,wins:0,losses:0,lastPlayed:null})}for(const s of e){const a=s.deck;if(!n.has(a)){const o=et(t,a);n.set(a,{id:(o==null?void 0:o.id)||a,name:(o==null?void 0:o.name)||"",commander:(o==null?void 0:o.commander)||s.myCommander||a,bracket:(o==null?void 0:o.bracket)??4,colors:(o==null?void 0:o.colors)??[],retired:(o==null?void 0:o.retired)??!1,createdAt:(o==null?void 0:o.createdAt)||s.date,games:0,wins:0,losses:0,lastPlayed:null})}const r=n.get(a);r.games+=1,s.result==="Win"?r.wins+=1:r.losses+=1,(!r.lastPlayed||s.date>r.lastPlayed)&&(r.lastPlayed=s.date)}return[...n.values()].map(s=>({...s,winRate:W(s.wins,s.games),normalizedWr:ft(s.wins,s.games)}))}function ur(t){const e=t.filter(s=>s.result==="Win").length,n=t.length;return{games:n,wins:e,losses:n-e,winRate:W(e,n),...Ds(t)}}function Ds(t){const e=t.filter(a=>a.result==="Win"&&Number(a.turn)>0).map(a=>Number(a.turn)),n=t.filter(a=>a.result==="Loss"&&Number(a.turn)>0).map(a=>Number(a.turn)),s=a=>a.length?a.reduce((r,o)=>r+o,0)/a.length:null;return{avgTurnWin:s(e),avgTurnLoss:s(n)}}function Mo(t,e,n="",s=null){const a=it(e),r=s!=null&&s.length?new Set(s.map(String)):n?new Set([String(n)]):null,o=t.filter(f=>{if(!r)return!0;const p=a.get(f.deck),g=String(f.bracket??(p==null?void 0:p.bracket)??4);return r.has(g)}),c=ur(o),l=Ln(e,o).filter(f=>f.games>0),i=Ps(l,"normWr","desc").slice(0,3),{avgTurnWin:d,avgTurnLoss:u}=Ds(o);return{overview:c,podium:i,avgTurnWin:d,avgTurnLoss:u}}function mt(t,e){const n=e.get(t.deck);return t.bracket??(n==null?void 0:n.bracket)??4}const Jn=["","1","2","3","4","5"];function Lo(t=""){return t?`Bracket ${t}`:"All Brackets"}function ca(t=""){const n=(Jn.indexOf(String(t||""))+1)%Jn.length;return Jn[n]}function jn(t,e,n=""){if(!n)return t;const s=it(e);return t.filter(a=>String(mt(a,s))===String(n))}function Io(t,e){const n=new Map(e.map(a=>[a.id||Fe(a),a])),s=[1,2,3,4,5].map(a=>({bracket:a,games:0,wins:0}));for(const a of t){const r=mt(a,n),o=s.find(c=>c.bracket===r)??s[3];o.games+=1,a.result==="Win"&&(o.wins+=1)}return s.map(a=>({...a,winRate:W(a.wins,a.games),normalizedWr:ft(a.wins,a.games)}))}function Eo(t){const e=new Map;for(const n of t){const s=mn(n.date);e.has(s)||e.set(s,{year:s,games:0,wins:0});const a=e.get(s);a.games+=1,n.result==="Win"&&(a.wins+=1)}return[...e.values()].sort((n,s)=>n.year.localeCompare(s.year)).map(n=>({...n,winRate:W(n.wins,n.games),normalizedWr:ft(n.wins,n.games)}))}function Wo(t){const e=[...t].sort(K),n=e.length,s=[];for(let o=100;o<=n;o+=100){const c=o-99,i=e.slice(c-1,o).filter(d=>d.result==="Win").length;s.push({label:`${c}-${o}`,rangeStart:c,rangeEnd:o,games:100,wins:i,winRate:W(i,100)})}const a=n%100;if(a>0){const o=n-a+1,l=e.slice(o-1,n).filter(i=>i.result==="Win").length;s.push({label:`${o}-${n}`,rangeStart:o,rangeEnd:n,games:a,wins:l,winRate:W(l,a)})}const r=[];for(let o=100;o<=n;o+=100){const l=e.slice(0,o).filter(i=>i.result==="Win").length;r.push({label:`1-${o}`,games:o,wins:l,winRate:W(l,o)})}if(a>0){const c=e.slice(0,n).filter(l=>l.result==="Win").length;r.push({label:`1-${n}`,games:n,wins:c,winRate:W(c,n)})}return{windows:s,cumulative:r}}function To(){return`${Qa()}mana`}function Kt(t){const e=Ns(t),n=To();return e.length?e.map(s=>`<img class="mana-img" src="${n}/${s}.svg" alt="${s}" title="${Fn[s]||s}" />`).join(""):`<img class="mana-img" src="${n}/C.svg" alt="C" title="Colorless" />`}function Ps(t,e,n){const s=n==="asc"?1:-1;function a(r,o,c){const l=!r.games,i=!o.games;return l&&i?B(r).localeCompare(B(o)):l?1:i?-1:c()||B(r).localeCompare(B(o))}return[...t].sort((r,o)=>{if(e==="name")return s*B(r).localeCompare(B(o));if(e==="games")return a(r,o,()=>s*(r.games-o.games));if(e==="wr"||e==="winRate")return a(r,o,()=>s*(r.winRate-o.winRate));if(e==="normWr")return a(r,o,()=>s*(r.normalizedWr-o.normalizedWr));if(e==="bracket")return s*(r.bracket-o.bracket)||B(r).localeCompare(B(o));if(e==="wins")return a(r,o,()=>s*(r.wins-o.wins)||s*(r.winRate-o.winRate));if(e==="losses")return s*(r.losses-o.losses)||B(r).localeCompare(B(o));if(e==="newest"||e==="createdAt"){const c=r.createdAt||"",l=o.createdAt||"";return s*c.localeCompare(l)||B(r).localeCompare(B(o))}if(e==="recent"||e==="lastPlayed"){const c=r.lastPlayed||"",l=o.lastPlayed||"";return s*c.localeCompare(l)||B(r).localeCompare(B(o))}return e==="colors"||e==="colorIdentity"?s*(us(r.colors)-us(o.colors))||B(r).localeCompare(B(o)):0})}const Xn=.25;function Gs(t,e,n){return Math.min(n,Math.max(e,t))}function mr(t,e,n){return`hsl(${t} ${e}% ${n}%)`}function Zn(t,e,n){return t+(e-t)*n}function Ao(t,e,n){return mr(Zn(t[0],e[0],n),Zn(t[1],e[1],n),Zn(t[2],e[2],n))}function we(t,e){for(let n=0;n<t.length-1;n++){const s=t[n],a=t[n+1];if(e<=a.at){const r=a.at-s.at||1,o=(e-s.at)/r;return Ao(s.hsl,a.hsl,Gs(o,0,1))}}return mr(...t[t.length-1].hsl)}function Bo(t){const e=Gs(t,0,1);return e>=Xn?we([{at:Xn,hsl:[128,48,84]},{at:.35,hsl:[132,52,68]},{at:.45,hsl:[136,58,48]},{at:.6,hsl:[140,62,34]},{at:.8,hsl:[144,68,22]},{at:1,hsl:[148,72,12]}],e):we([{at:0,hsl:[0,72,48]},{at:.1,hsl:[18,78,52]},{at:.18,hsl:[42,90,58]},{at:Xn,hsl:[128,48,84]}],e)}function No(t,e){if(!e||e<=0)return"transparent";const n=t/e;return n>=1?n<=1.1?we([{at:1,hsl:[140,62,34]},{at:1.1,hsl:[128,48,84]}],n):we([{at:1.1,hsl:[55,90,58]},{at:1.35,hsl:[18,78,52]},{at:1.7,hsl:[0,72,42]},{at:2.5,hsl:[0,75,28]}],n):n>=.9?we([{at:.9,hsl:[185,55,48]},{at:1,hsl:[140,62,34]}],n):we([{at:0,hsl:[275,58,20]},{at:.5,hsl:[245,52,32]},{at:.9,hsl:[185,55,48]}],n)}function Do(t){return Gs(t,0,1)>=.5?"#f4fff8":"#0D0F0F"}function Po(t,e){if(!e||e<=0)return"inherit";const n=t/e;return n>=.92&&n<=1.08||n>=1.35||n<=.55?"#f4fff8":"#0D0F0F"}function G(t,e=2){if(t==null||Number.isNaN(t))return'<span class="wr-cell wr-na">—</span>';const n=Bo(t),s=Do(t);return`<span class="wr-cell" style="background:${n};color:${s}">${pe(t,e)}</span>`}function It(t,e,n=String(t)){if(t==null||Number.isNaN(t))return'<span class="wr-cell wr-na">—</span>';if(!e||e<=0)return`<span class="wr-cell">${n}</span>`;const s=No(t,e),a=Po(t,e);return`<span class="wr-cell" style="background:${s};color:${a}">${n}</span>`}function Et(t,e){const n=t.filter(s=>s.key==="C"?!1:e==="decks"?(s.decks||0)>0:(s.games||0)>0);return n.length?n.reduce((s,a)=>s+(a[e]||0),0)/n.length:0}function Go(t,e){return!t||t.col!==e?"":t.dir==="asc"?" ↑":" ↓"}function w(t,e,n,s,a=""){return`<th class="sortable${(s==null?void 0:s.col)===e?" sorted":""} ${a}" data-sort-table="${t}" data-sort-col="${e}">${n}${Go(s,e)}</th>`}function Sn(t,e){return(t==null?void 0:t.col)===e?{col:e,dir:t.dir==="asc"?"desc":"asc"}:{col:e,dir:"desc"}}const wt={wins:"winRate"};function zo(t){return t?Array.isArray(t)?t:[t]:[]}function st(t,e,n,s={}){if(!(e!=null&&e.col)||!n[e.col])return t;const a=n[e.col],r=zo(s[e.col]);return[...t].sort((o,c)=>{const l=ia(a(o),a(c),e.dir);if(l!==0)return l;for(const i of r){const d=typeof i=="string"?i:i.key,u=typeof i=="string"?e.dir:i.dir??e.dir;if(!n[d])continue;const f=ia(n[d](o),n[d](c),u);if(f!==0)return f}return 0})}function ia(t,e,n){const s=n==="asc"?1:-1;return t==null&&e==null?0:t==null?1:e==null?-1:typeof t=="string"&&typeof e=="string"?s*t.localeCompare(e):s*(t-e)}const xt={W:"#fffbd5",U:"#aae0fa",B:"#2a2a35",R:"#f9aa8f",G:"#9bd3ae",C:"#ccc2c0"};function Oo(t){return[parseInt(t.slice(1,3),16),parseInt(t.slice(3,5),16),parseInt(t.slice(5,7),16)]}function Fo(t,e,n){const s=a=>Math.max(0,Math.min(255,Math.round(a)));return`#${[t,e,n].map(a=>s(a).toString(16).padStart(2,"0")).join("")}`}function fr(t){const e=t.filter(o=>xt[o]);if(!e.length)return xt.C;if(e.length===1)return xt[e[0]];let n=0,s=0,a=0;for(const o of e){const[c,l,i]=Oo(xt[o]);n+=c,s+=l,a+=i}const r=e.length;return Fo(n/r,s/r,a/r)}const In=["#5b9fd4","#3dba7a","#c9a227","#e05c5c","#9b7ad4","#e08a4a","#6ec6ca","#d46a9b","#7a8cff","#b8e986"];function zs(t){return In[(t-1)%In.length]}function ms(t,e){if(t.bracket!=null)return zs(t.bracket);const n=(t.colors||(t.color?[t.color]:[])).filter(s=>xt[s]);return n.length>1?fr(n):n.length===1?xt[n[0]]:t.color&&xt[t.color]?xt[t.color]:In[e%In.length]}function la(t){return{colors:t.displayColors,color:t.key!=="C"&&t.displayColors.length===1?t.displayColors[0]:void 0,key:t.key}}function yn(t,e,n,s){const a=(s-90)*Math.PI/180;return{x:t+n*Math.cos(a),y:e+n*Math.sin(a)}}function jo(t,e,n,s,a,r){const o=r-a;if(o<=0)return"";o>=360&&(r=a+359.999);const c=yn(t,e,n,a),l=yn(t,e,n,r),i=yn(t,e,s,r),d=yn(t,e,s,a),u=r-a>180?1:0;return`M ${c.x} ${c.y} A ${n} ${n} 0 ${u} 1 ${l.x} ${l.y} L ${i.x} ${i.y} A ${s} ${s} 0 ${u} 0 ${d.x} ${d.y} Z`}function Ho(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function qo(t){return t.bracket!=null?`Bracket ${t.bracket}`:t.key?t.key:"Slice"}function _o(t,e){if(t.bracket!=null)return{fill:zs(t.bracket),def:null};const n=(t.colors||(t.color?[t.color]:[])).filter(s=>xt[s]);return n.length<=1?{fill:n[0]?xt[n[0]]:ms(t,e),def:null}:{fill:fr(n),def:null}}function da(t,e=0,{animate:n=!0}={}){const s=t.filter(d=>d.value>0),a=s.reduce((d,u)=>d+u.value,0),r=n?"pie-panel":"pie-panel pie-panel--static";if(!a)return`<div class="${r} pie-panel--empty" data-pie-key="${e}"></div>`;let o=0;const c=[],l=n?"pie-slice":"pie-slice pie-slice--static",i=s.map((d,u)=>{const f=d.value/a*360,p=jo(50,50,44,28,o,o+f),{fill:g,def:m}=_o(d,u);m&&c.push(m);const $=d.hover||String(d.value);o+=f;const h=n?` style="animation-delay:${u*.045}s"`:"";return`<path class="${l}" d="${p}" fill="${g}" data-hover="${Ho($)}"${h} />`});return`
    <div class="${r}" data-pie-key="${e}">
      <svg class="pie-svg" viewBox="0 0 100 100" aria-hidden="true">${c.length?`<defs>${c.join("")}</defs>`:""}${i.join("")}</svg>
      <div class="pie-tooltip" hidden></div>
    </div>`}function fs(t,e){return e==="wins"?t.wins||0:e==="decks"?t.decks||0:t.games||0}function Ko(t,e,n){const s=qo(t),a=fs(t,e),r=n>0?(a/n*100).toFixed(1):"0.0";return e==="wins"?`${s}: ${r}%`:e==="decks"?`${s}: ${r}%`:`${s}: ${r}%`}function ua(t,e,n){const s=t.reduce((a,r)=>a+fs(r,e),0);return t.map(a=>{const r=n(a);return{...r,value:fs(a,e),hover:r.hover??Ko(a,e,s)}})}function Uo(t=document.getElementById("main")){t&&t.querySelectorAll(".pie-panel:not(.pie-panel--empty)").forEach(e=>{const n=e.querySelector(".pie-tooltip"),s=e.querySelector(".pie-svg");!n||!s||e.querySelectorAll(".pie-slice").forEach(a=>{a.addEventListener("mouseenter",()=>{n.textContent=a.getAttribute("data-hover")||"",n.hidden=!1}),a.addEventListener("mousemove",r=>{const o=e.getBoundingClientRect();n.style.left=`${r.clientX-o.left}px`,n.style.top=`${r.clientY-o.top}px`}),a.addEventListener("mouseleave",()=>{n.hidden=!0})})})}const pr=["W","U","B","R","G","C"],gr=["C","G","R","B","U","W"];function en(t){return t==="C"?[]:t.split("")}function Os(t){return t==="C"?"Colorless":[...t].map(e=>Fn[e]||e).join(" ")}function ps(t,e){return e==="wubrgc"&&t!=="C"&&t.length===1?Fn[t]||t:Os(t)}const Vo={white:"W",blue:"U",black:"B",red:"R",green:"G",colorless:"C"};function yr(t){return!t||t==="C"?"C":[...t.toUpperCase().replace(/[^WUBRGC]/g,"")].filter((e,n,s)=>s.indexOf(e)===n).sort((e,n)=>Mn(e)-Mn(n)).join("")}function Yo(t){const e=String(t||"").trim().toLowerCase();if(!e)return"";const n=new Set;for(const[s,a]of Object.entries(Vo))e.includes(s)&&n.add(a);for(const s of e.toUpperCase())"WUBRGC".includes(s)&&n.add(s);return yr([...n].join(""))}function ma(t,e){const n=Yo(e),s=String(e||"").trim().toLowerCase();if(!n&&!s)return!0;const a=yr(String(t||""));return!!(n&&(a===n||[...n].every(r=>a.includes(r))||a.length===1&&n.includes(a))||s&&(Os(a).toLowerCase().includes(s)||a==="C"&&s.includes("colorless")))}function Jo(t,e){if(!String(e||"").trim())return!0;const n=String(t.subjectKey||"").replace(/^ci:/,""),s=String(t.opponentKey||"").replace(/^oci:/,"");return ma(n,e)||ma(s,e)}function Fs(t,e,n){const s=e||[],a=t||[];if(!a.length)return s.length===0;if(!s.length)return!1;if(n==="exclusive"){if(a.length!==s.length)return!1;const r=[...a].sort().join(""),o=[...s].sort().join("");return r===o}return a.every(r=>s.includes(r))}function gs(t,e,n){return e==="exact"?[Ie(t||[])]:e==="wubrgc"?["W","U","B","R","G","C"].filter(a=>Fs(a==="C"?[]:[a],t||[],n)):n==="exclusive"?[Ie(t||[])]:t!=null&&t.length?hr(t).map(s=>Ie(s)):["C"]}function Ie(t){return t.length?[...t].sort((e,n)=>Mn(e)-Mn(n)).join(""):"C"}function hr(t){const e=[],n=t.length;for(let s=1;s<1<<n;s++){const a=[];for(let r=0;r<n;r++)s&1<<r&&a.push(t[r]);e.push(a)}return e}function Xo(t,e){const n=e==="cgrbuw"?gr:pr;if(t==="C")return n.indexOf("C");const s=[...t].sort((r,o)=>n.indexOf(r)-n.indexOf(o));let a=0;for(const r of s)a=a*10+(n.indexOf(r)+1);return a}function Zo(t,e,n,s){if(e==="wubrgc")return[...s==="cgrbuw"?gr:pr];if(e==="exact"){const r=new Set;for(const o of t)r.add(Ie(o.colors||[]));return[...r]}const a=new Set;for(const r of t){const o=r.colors||[];if(n==="exclusive"){a.add(Ie(o));continue}if(!o.length){a.add("C");continue}for(const c of hr(o))a.add(Ie(c))}return[...a]}function Qo(t,{view:e,agg:n,sortOrder:s,bracketFilter:a=""}){const r=Zo(t,e,n,s),o=e==="exact"?"exclusive":n,c=!!a;return r.map(i=>{const d=en(i),u=t.filter(m=>Fs(d,m.colors||[],o)),f=c?u.filter(m=>m.games>0):u,p=f.reduce((m,$)=>m+$.games,0),g=f.reduce((m,$)=>m+$.wins,0);return{key:i,colors:d,name:e==="wubrgc"&&i!=="C"?Fn[i]:Os(i),displayColors:d,decks:f.length,games:p,wins:g,winRate:W(g,p),normalizedWr:ft(g,p),colorOrder:Xo(i,s)}}).sort((i,d)=>i.colorOrder-d.colorOrder)}function tc(t){return t==="cgrbuw"?"CGRBUW":"WUBRGC"}function Qn(t){return t==="all"?"All Colors":t==="exact"?"Exact Colors":"WUBRGC"}function ts(t){return t==="wubrgc"?"all":t==="all"?"exact":"wubrgc"}const lt="Brass";function fa(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function En(t,e,n){const s=String(e||"").trim();if(!s)return;const a=s.toLowerCase(),r=t.get(a);if(!r){t.set(a,{name:s,count:1,lastDate:n});return}r.count+=1,n>=r.lastDate&&(r.lastDate=n,r.name=s)}function ec(t){const e=new Map;for(const n of t)for(const s of n.opponents||[])En(e,s.name,n.date);return[...e.values()]}function nc(t){const e=new Map;for(const n of t){const s=n.createdAt||"1970-01-01",a=new Set([O(n)]);for(const r of n.history||[]){const o=String(r.commander||"").trim();o&&a.add(o)}for(const r of a)En(e,r,s)}return[...e.values()]}function sc(t){const e=new Map;for(const n of t)for(const s of n){const a=s.name.toLowerCase(),r=e.get(a);if(!r){e.set(a,{...s});continue}r.count+=s.count,s.lastDate>=r.lastDate&&(r.lastDate=s.lastDate,r.name=s.name)}return[...e.values()]}function br(t){const e=new Map;function n(s,a,r){const o=String(s||"").trim(),c=String(a||"").trim();if(!o||!c)return;const l=o.toLowerCase();e.has(l)||e.set(l,new Map);const i=e.get(l),d=c.toLowerCase(),u=i.get(d);if(!u){i.set(d,{name:c,count:1,lastDate:r});return}u.count+=1,r>=u.lastDate&&(u.lastDate=r,u.name=c)}for(const s of t){s.mySeat&&s.deck&&n(lt,s.myCommander||s.deck,zt(s));for(const a of s.opponents||[])n(a.player,a.name,zt(s))}return e}function ac(t){const e=br(t),n=new Map;for(const s of t){s.mySeat&&s.deck&&En(n,lt,zt(s));for(const a of s.opponents||[])a.player&&a.name&&En(n,a.player,zt(s))}return[...n.values()].filter(s=>e.has(s.name.toLowerCase())&&s.name.toLowerCase()!==lt.toLowerCase())}function $r(t,e){const n=t.toLowerCase(),s=e.toLowerCase().trim();if(!s)return 0;if(n===s)return 1e3;if(n.startsWith(s))return 900-s.length*.1;const a=n.indexOf(s);if(a>=0)return 700-a;const r=s.split(/\s+/).filter(Boolean);return r.length>1&&r.every(o=>n.includes(o))?500-r.length:0}function pa(t){return[...t].sort((e,n)=>e.localeCompare(n,void 0,{sensitivity:"base"}))}function rc(t,e=8){const n=[...t].sort((r,o)=>K(o,r)),s=new Set,a=[];for(const r of n){const o=[...r.opponents||[]].sort((c,l)=>c.seat-l.seat);for(const c of o){const l=String(c.player||"").trim();if(!l||!c.name)continue;const i=l.toLowerCase();if(!(i===lt.toLowerCase()||s.has(i))&&(s.add(i),a.push(l),a.length>=e))return a}}return a}function kr(t,e,n=8){const s=t.trim();return s?e.map(a=>({...a,score:$r(a.name,s)})).filter(a=>a.score>0).sort((a,r)=>r.score-a.score||r.count-a.count||r.lastDate.localeCompare(a.lastDate)).slice(0,n).map(a=>a.name):[...e].sort((a,r)=>r.lastDate.localeCompare(a.lastDate)||r.count-a.count).slice(0,n).map(a=>a.name)}function oc(t,e,n,s=8){const a=t.trim(),r=n.filter(o=>o.name.toLowerCase()!==lt.toLowerCase());if(!a){const o=rc(e,s);if(o.length>=s)return o;const c=new Set(o.map(i=>i.toLowerCase())),l=[...r].filter(i=>!c.has(i.name.toLowerCase())).sort((i,d)=>d.lastDate.localeCompare(i.lastDate)||d.count-i.count).map(i=>i.name);return[...o,...l].slice(0,s)}return kr(a,r,s)}function cc(t,e,n,s=8){if(!n.length)return kr(t,e,s);const a=t.trim(),r=new Set(n.map(d=>d.name.toLowerCase())),o=pa(n.map(d=>d.name)),c=pa(e.filter(d=>!r.has(d.name.toLowerCase())).map(d=>d.name)),l=d=>!a||$r(d,a)>0;return[...o.filter(l),...c.filter(l)].slice(0,s)}function ic(t,e,n=[]){if(!t)return;const s=sc([ec(e),nc(n)]),a=ac(e),r=br(e),o=new WeakMap;function c(b){const v=b.closest(".pod-seat-row"),k=v==null?void 0:v.querySelector(".player-input");return k instanceof HTMLInputElement?k.value.trim():""}function l(b){const v=r.get(b.toLowerCase());return v?[...v.values()]:[]}function i(b){return b.classList.contains("opponent-input")?s:b.classList.contains("player-input")?a:[]}function d(b){return b instanceof HTMLInputElement&&(b.classList.contains("opponent-input")||b.classList.contains("player-input"))}function u(b){return b.closest(".opponent-input-wrap")}function f(b){var v;return(v=u(b))==null?void 0:v.querySelector(".opponent-suggestions")}function p(b){const v=f(b);v&&(v.hidden=!0)}function g(b,v){b.value=v,p(b),b.focus()}function m(b){if(b.classList.contains("opponent-input")){const v=c(b);return cc(b.value,s,l(v))}return oc(b.value,e,i(b))}function $(b){const v=f(b);if(!v)return;const k=m(b);if(o.set(b,-1),!k.length){v.hidden=!0,v.innerHTML="";return}v.innerHTML=k.map(M=>`<li role="option" data-value="${fa(M)}">${fa(M)}</li>`).join(""),v.hidden=!1}function h(b){const v=b.closest(".pod-seat-row"),k=v==null?void 0:v.querySelector(".opponent-input");if(!(k instanceof HTMLInputElement))return;const M=f(k);(k===document.activeElement||M&&!M.hidden)&&$(k)}function R(b,v){const k=f(b);if(!k)return;const M=[...k.querySelectorAll('[role="option"]')];if(!M.length)return;const C=Math.max(0,Math.min(v,M.length-1));o.set(b,C),M.forEach((L,_)=>L.classList.toggle("active",_===C)),M[C].scrollIntoView({block:"nearest"})}t.addEventListener("input",b=>{const v=b.target;!(v instanceof HTMLInputElement)||!d(v)||(v.classList.contains("player-input")&&h(v),$(v))}),t.addEventListener("focusin",b=>{const v=b.target;d(v)&&$(v)}),t.addEventListener("focusout",b=>{const v=b.target;d(v)&&setTimeout(()=>{const k=u(v);k&&!k.contains(document.activeElement)&&p(v)},150)}),t.addEventListener("keydown",b=>{const v=b.target;if(!d(v))return;const k=f(v);if(!k||k.hidden)return;const M=[...k.querySelectorAll('[role="option"]')];if(!M.length)return;const C=o.get(v)??-1;b.key==="ArrowDown"?(b.preventDefault(),R(v,C+1)):b.key==="ArrowUp"?(b.preventDefault(),R(v,C<=0?0:C-1)):b.key==="Enter"&&C>=0?(b.preventDefault(),g(v,M[C].dataset.value||""),v.classList.contains("player-input")&&h(v)):b.key==="Escape"&&p(v)}),t.addEventListener("mousedown",b=>{const v=b.target.closest('[role="option"]');if(!v)return;b.preventDefault();const k=v.closest(".opponent-input-wrap"),M=k==null?void 0:k.querySelector(".opponent-input, .player-input");M instanceof HTMLInputElement&&(g(M,v.dataset.value||""),M.classList.contains("player-input")&&h(M))})}const Rt=new Map,Ee=new Map;let ga=0;function lc(t){if(!t)return[];const e=(t.color_identity||[]).filter(n=>"WUBRG".includes(n));return Ns(e)}async function vr(){const t=Math.max(0,110-(Date.now()-ga));t&&await new Promise(e=>setTimeout(e,t)),ga=Date.now()}function ya(t,e="normal",n=0){var a;if(!t)return null;let s;return(a=t.card_faces)!=null&&a.length&&(s=(t.card_faces[n]??t.card_faces[0]).image_uris),s||(s=t.image_uris),s?e==="art"?s.art_crop||s.normal||null:s.normal||s.art_crop||null:null}function ce(t,e="normal",n=0){const s=String(t||"").trim(),a=n?`:face${n}`:"";return e==="art"?`${s}:art${a}`:`${s}${a}`}function Sr(t,e){var r,o,c;const n=String(t||"").trim();if(!n||!e)return null;const s=((r=e.card_faces)==null?void 0:r.length)||1;for(let l=0;l<s;l++){const i=ya(e,"normal",l),d=ya(e,"art",l),u=((c=(o=e.card_faces)==null?void 0:o[l])==null?void 0:c.name)||e.name||n;i&&(Rt.set(ce(n,"normal",l),i),u!==n&&Rt.set(ce(u,"normal",l),i)),d&&(Rt.set(ce(n,"art",l),d),u!==n&&Rt.set(ce(u,"art",l),d))}const a={layout:e.layout,faceNames:(e.card_faces||[]).map(l=>l.name),colorIdentity:lc(e)};return Ee.set(n,a),e.name&&e.name!==n&&Ee.set(e.name,a),a}function Dt(t){const e=String(t||"").trim();return e?Ee.get(e)??null:null}async function ie(t){const e=String(t||"").trim();if(!e)return null;if(Ee.has(e))return Ee.get(e);await vr();const n=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(e)}`);if(!n.ok)return Ee.set(e,null),null;const s=await n.json();return Sr(e,s)}async function dc(t,e="normal",n=0){const s=ce(t,e,n);if(Rt.has(s))return Rt.get(s);await vr();const a=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(t)}`);if(!a.ok)return Rt.set(s,null),null;const r=await a.json();return Sr(t,r),Rt.get(s)??null}function uc(t,e){const{className:n="commander-img loading",art:s=!1,escapeHtml:a}=e;return xr(t).map(r=>{const o=s?' data-card-image="art"':"",c=r.face?` data-card-face="${r.face}"`:"",l=r.name;return`<img class="${n}" data-card-name="${a(l)}"${c}${o} alt="${a(l)}" title="${a(l)}" />`}).join("")}async function mc(t){if(!t)return;const e=t.querySelectorAll("img[data-card-name]"),n=new Map;for(const s of e){const a=s.dataset.cardName;if(!a)continue;const r=s.dataset.cardImage==="art"?"art":"normal",o=Number(s.dataset.cardFace)||0,c=n.get(a)??[];c.some(l=>l.crop===r&&l.face===o)||c.push({crop:r,face:o}),n.set(a,c)}for(const[s,a]of n)for(const{crop:r,face:o}of a){const c=ce(s,r,o);Rt.has(c)||await dc(s,r,o)}for(const s of e){const a=s.dataset.cardName,r=s.dataset.cardImage==="art"?"art":"normal",o=Number(s.dataset.cardFace)||0,c=Rt.get(ce(a,r,o));c?(s.src=c,s.classList.remove("loading")):s.classList.add("missing")}}async function fc(t){const e=document.querySelector(`[data-entity-report-root="${CSS.escape(t)}"]`);return mc(e)}const wr="edhlog:commander-matchup-keys:v6",pc=new Set(["transform","modal_dfc","double_faced_token","reversible_card","meld","art_series"]),Cr=new Set(["adventure","split"]),Ye=gc();function gc(){try{const t=localStorage.getItem(wr);if(!t)return new Map;const e=JSON.parse(t);return new Map(Object.entries(e).map(([n,s])=>[n,s]))}catch{return new Map}}function yc(){localStorage.setItem(wr,JSON.stringify(Object.fromEntries(Ye)))}function js(t){return String(t||"").split(/\s*\/\/\s*/).map(e=>e.trim()).filter(Boolean)}function ot(t){return String(t||"").trim().toLowerCase()}function ha(t){return String(t||"").split(",")[0].trim().toLowerCase()}function Hs(t){if(t.length!==2)return!1;const e=t[0].split(",")[0].trim().toLowerCase(),n=t[1].split(",")[0].trim().toLowerCase();return e.length>0&&e===n}function hc(t){return t.length!==2||Hs(t)?!1:ha(t[0])!==ha(t[1])}function wn(t,e){var n;if(!t||Cr.has(t.layout))return!1;if(pc.has(t.layout))return!0;if(((n=t.faceNames)==null?void 0:n.length)>=2&&e.length===2){const s=t.faceNames.map(a=>a.toLowerCase());return s.includes(e[0].toLowerCase())&&s.includes(e[1].toLowerCase())}return!1}function Ce(t){return!!t&&Cr.has(t.layout)}function bc(t,e){const n=Dt(t)||Dt(e[0])||Dt(e[1]);return Ce(n)?_e(t,e):null}function Wn(t){const e=t.trim();return{kind:"single",canonicalName:e,parts:[e]}}function xe(t){const e=t.trim();return{kind:"dfc",canonicalName:e,parts:[e]}}function _e(t,e){return{kind:"singleFront",canonicalName:t.trim(),parts:e}}function ys(t){const e=[...t].sort((n,s)=>n.localeCompare(s,void 0,{sensitivity:"base"}));return{kind:"partner",canonicalName:e.join(" // "),parts:e}}function pt(t,e){const n=new Set([t,e.canonicalName]);if(e.kind==="partner"){for(const s of e.parts){const a=ot(s),r=Ye.get(a);if(!r)Ye.set(a,Wn(s));else if(r.kind==="singleFront")continue}n.add([...e.parts].reverse().join(" // "))}if(e.kind==="singleFront")for(const s of e.parts)n.add(s);for(const s of n)s&&Ye.set(ot(s),e);yc()}function qs(t){const e=String(t||"").trim();return e?Ye.get(ot(e))??null:null}function H(t){const e=String(t||"").trim();if(!e)return Wn("");const n=qs(e);if(n)return n;const s=js(e);if(s.length<2)return Wn(e);if(Hs(s))return xe(e);const a=bc(e,s);if(a)return a;const r=Dt(e)||Dt(s[0])||Dt(s[1]);return r&&wn(r,s)?xe(e):ys(s)}function xr(t){var s;const e=H(t),n=Dt(t)||Dt(e.canonicalName)||((s=e.parts)==null?void 0:s.map(a=>Dt(a)).find(Boolean));return e.kind==="singleFront"||e.kind==="single"||Ce(n)?[{name:e.canonicalName,face:0}]:e.kind==="dfc"?[{name:e.canonicalName,face:0},{name:e.canonicalName,face:1}]:e.kind==="partner"?Hn(t)?[{name:e.parts.find(r=>ot(r)===ot(t))||t,face:0}]:e.parts.map(a=>({name:a,face:0})):[{name:e.canonicalName,face:0}]}function Hn(t){const e=H(t);if(e.kind!=="partner")return!1;const n=ot(t);return n===ot(e.canonicalName)?!1:e.parts.some(s=>ot(s)===n)}function Mt(t,e={}){const{splitPartners:n=!1}=e,s=H(t);return s.kind==="partner"&&n?[...s.parts]:[s.canonicalName]}function fn(t,e,n={}){const{splitPartners:s=!1}=n,a=String(t||"").trim(),r=String(e||"").trim();if(!a||!r)return!1;if(ot(a)===ot(r))return!0;const o=H(a),c=H(r);if(!s)return o.canonicalName===c.canonicalName;const l=ot(r);return c.kind==="single"||Hn(r)?o.kind==="partner"?o.parts.some(d=>ot(d)===l):ot(o.canonicalName)===l:c.kind==="partner"?o.canonicalName===c.canonicalName:o.kind==="partner"?o.parts.some(d=>ot(d)===l):o.canonicalName===c.canonicalName}async function $c(t){const e=t.trim(),n=qs(e);if(n)return n;const s=js(e);if(s.length<2){const o=Wn(e);return pt(e,o),o}if(Hs(s)){const o=xe(e);return pt(e,o),o}if(hc(s)){let o=await ie(e);if(Ce(o)){const l=_e(e,s);return pt(e,l),l}if(o=await ie(s[0]),Ce(o)){const l=_e(e,s);return pt(e,l),l}if(wn(o,s)){const l=xe(e);return pt(e,l),l}if(o=await ie(s[1]),Ce(o)){const l=_e(e,s);return pt(e,l),l}if(wn(o,s)){const l=xe(e);return pt(e,l),l}const c=ys(s);return pt(e,c),c}let a=await ie(e);if(Ce(a)){const o=_e(e,s);return pt(e,o),o}if(wn(a,s)){const o=xe(e);return pt(e,o),o}const r=ys(s);return pt(e,r),r}function ba(t){var n,s;const e=new Set;for(const a of t){(n=a.deck)!=null&&n.includes("//")&&e.add(a.deck.trim());for(const r of a.opponents||[])(s=r.name)!=null&&s.includes("//")&&e.add(String(r.name).trim())}return[...e]}async function kc(t){const e=t.filter(n=>!qs(n));for(const n of e)await $c(n)}const hs="edhlog:commander-colors:v3",vc="edhlog:commander-colors:v2",Qt=Sc();function Sc(){try{let t=localStorage.getItem(hs);if(t||(t=localStorage.getItem(vc),t&&localStorage.setItem(hs,t)),!t)return new Map;const e=JSON.parse(t);return new Map(Object.entries(e).map(([n,s])=>[n,s]))}catch{return new Map}}function es(){localStorage.setItem(hs,JSON.stringify(Object.fromEntries(Qt)))}function Vt(t){return String(t||"").trim().toLowerCase()}function he(t,e){t&&Qt.set(Vt(t),e)}async function wc(t){const e=t.trim();if(!e)return[];const n=Qt.get(Vt(e));if(n!=null&&n.length)return n;const s=H(e),a=js(e);if(s.kind==="partner"&&a.length===1){const c=await ie(e);if(!c)return[];const l=c.colorIdentity??[];return he(e,l),es(),l}if(s.kind==="partner"){const c=new Set;for(const i of s.parts){let d=Qt.get(Vt(i));if(!(d!=null&&d.length)){const u=await ie(i);if(!u)continue;d=u.colorIdentity??[],he(i,d)}for(const u of d)c.add(u)}const l=Ns([...c]);return he(s.canonicalName,l),he(e,l),es(),l}const r=await ie(s.canonicalName);if(!r)return[];const o=r.colorIdentity??[];return he(s.canonicalName,o),he(e,o),es(),o}function qn(t){const e=String(t||"").trim();if(!e)return[];const n=Vt(e),s=H(e);if(Hn(e)){const o=s.parts.find(c=>Vt(c)===n);if(o){const c=Qt.get(Vt(o));if(c!=null&&c.length)return c}}const a=Qt.get(n);if(a!=null&&a.length)return a;const r=Qt.get(Vt(s.canonicalName));return r!=null&&r.length?r:[]}function pn(t){var e;return t?(e=t.colors)!=null&&e.length?t.colors:qn(O(t)):[]}function Be(t,e={}){const{splitPartners:n=!1,ownedColors:s=null,ownedDeck:a=null}=e,r=a?pn(a):s;return r!=null&&r.length&&!(n&&Hn(t))?r:qn(t)}function Cc(t){var n;const e=new Set;for(const s of t){if((n=s.colors)!=null&&n.length)continue;const a=O(s);a&&e.add(a)}return[...e]}function xc(t){var n;let e=!1;for(const s of t){if((n=s.colors)!=null&&n.length)continue;const a=qn(O(s));a.length&&(s.colors=[...a],e=!0)}return e}async function Rc(t){const e=new Set(t.filter(Boolean));for(const n of t){const s=H(n);if(s.kind==="partner"){for(const a of s.parts)e.add(a);e.add(s.canonicalName)}}for(const n of e){const s=Vt(n),a=Qt.get(s);a!=null&&a.length||await wc(n)}}const _s=.25,Tn=25,bs=Tn*_s,Mc=[{id:"players",label:"Player Matchups"},{id:"decks",label:"Deck Matchups"},{id:"colors",label:"Color Matchups"}];function bt(t){return String(t||"").trim().toLowerCase()}function Rr(t){return bt(t.player)===bt(lt)}function q(t,e=null){var s;const n=[];if(t.mySeat||t.deck){const a=((s=t.myPlayer)==null?void 0:s.trim())||lt,r=t.deck,o=e?zn(t,e):String(t.myCommander||"").trim()||r,c=Number(t.mySeat)||0,l=$a(t);n.push({seat:c,player:a,deck:o,deckSlotId:r,commander:o,didWin:l?l===c:t.result==="Win"})}for(const a of t.opponents||[]){const r=String(a.name||"").trim();if(!r)continue;const o=String(a.player||"").trim(),c=Number(a.seat)||0,l=$a(t);n.push({seat:c,player:o,deck:r,commander:r,didWin:l?l===c:!1})}return n}function Lc(t){const e=new Set;for(const n of t)for(const s of q(n)){const a=String(s.commander||"").trim();a&&e.add(a)}return[...e]}function $a(t){return t.winnerSeat?Number(t.winnerSeat):t.mySeat&&t.result==="Win"?Number(t.mySeat):0}function Ic(t,e,n,s={}){var c;if(n==="players")return[Ec(t,e,n)];const{splitPartners:a=!1,splitPlayers:r=!1}=s,o=[];if(r){const l=(c=e.player)==null?void 0:c.trim();if(!l)return o;for(const i of Mt(t.deck,{splitPartners:a}))for(const d of Mt(e.commander,{splitPartners:a}))o.push({subjectKey:`d:${bt(i)}`,subjectLabel:i,opponentKey:`dc:${bt(d)}__p:${bt(l)}`,opponentLabel:d,opponentPlayer:l});return o}for(const l of Mt(t.deck,{splitPartners:a}))for(const i of Mt(e.commander,{splitPartners:a}))o.push({subjectKey:`d:${bt(l)}`,subjectLabel:l,opponentKey:`dc:${bt(i)}`,opponentLabel:i});return o}function Ec(t,e,n){return n==="players"?{subjectKey:`p:${bt(t.player)}`,subjectLabel:t.player,opponentKey:`p:${bt(e.player)}`,opponentLabel:e.player}:{subjectKey:`d:${bt(t.deck)}`,subjectLabel:t.deck,opponentKey:`dc:${bt(e.commander)}`,opponentLabel:e.commander}}function An(t,e){return e?W(t,e)-_s:0}function Bn(t,e){return(t+bs)/(e+Tn)-_s}function Ne(t){return(t.sharedLosses??0)-(t.losses??0)}function Mr(t){const e=t.games>0?W(t.wins,t.games):0,n=t.losses,s=t.games>0?W(n,t.games):0,a=(t.wins+bs)/(t.games+Tn);(n+bs)/(t.games+Tn);const r=t.opponentPlayers?[...t.opponentPlayers.entries()].map(([o,c])=>({player:o,games:c})).sort((o,c)=>c.games-o.games||o.player.localeCompare(c.player)):[];return{...t,winRate:e,normalizedWinRate:a,opponentWins:n,opponentWinRate:s,opponentPlayerBreakdown:r,opponentCount:r.length,matchupImpact:An(t.wins,t.games),normalizedMatchupImpact:Bn(t.wins,t.games),opponentMatchupImpact:An(n,t.games),opponentNormalizedMatchupImpact:Bn(n,t.games)}}function Lr(t){const e=t*100;return`${e>0?"+":""}${e.toFixed(1)}%`}function Ir(t){return t>1e-9?"positive":t<-1e-9?"negative":"neutral"}function ka(t,e,n={}){const{splitPartners:s=!1,splitPlayers:a=!1,combineDecks:r=!1,decks:o=[]}=n,c=new Map;for(const i of t){const d=q(i,o);if(d.length<2)continue;const u=d.find(Rr);if(u){for(const f of d)if(f!==u&&!(e==="players"&&!f.player))for(const p of Ic(u,f,e,{splitPartners:s,splitPlayers:a})){const{subjectKey:g,subjectLabel:m,opponentKey:$,opponentLabel:h,opponentPlayer:R}=p;if(g===$)continue;const b=r&&e==="decks"?$:`${g}__${$}`,v=c.get(b)??{subjectKey:r&&e==="decks"?"":g,opponentKey:$,subject:r&&e==="decks"?"":m,opponent:h,opponentPlayer:R,games:0,wins:0,losses:0,sharedLosses:0,opponentPlayers:e==="decks"&&!a?new Map:void 0};v.games+=1,u.didWin?v.wins+=1:f.didWin?v.losses+=1:v.sharedLosses+=1,e==="decks"&&!a&&f.player&&v.opponentPlayers&&v.opponentPlayers.set(f.player,(v.opponentPlayers.get(f.player)||0)+1),c.set(b,v)}}}return[...c.values()].map(Mr).sort((i,d)=>{if(d.normalizedMatchupImpact!==i.normalizedMatchupImpact)return d.normalizedMatchupImpact-i.normalizedMatchupImpact;const u=Ne(i),f=Ne(d);return f!==u?f-u:d.games!==i.games?d.games-i.games:d.matchupImpact!==i.matchupImpact?d.matchupImpact-i.matchupImpact:e==="decks"&&!r&&i.subject!==d.subject?i.subject.localeCompare(d.subject,void 0,{numeric:!0}):i.opponent.localeCompare(d.opponent,void 0,{numeric:!0})})}function Wc(t,e,n,s){const a=it(e);return t.filter(r=>{const o=a.get(r.deck);if(n==="active"&&(o!=null&&o.retired)||n==="retired"&&!(o!=null&&o.retired))return!1;if(s){const c=r.bracket??(o==null?void 0:o.bracket)??4;if(String(c)!==s)return!1}return!0})}function Tc(t,e){const{decks:n,deckFilter:s,bracketFilter:a,view:r,agg:o,splitPartners:c=!1}=e,l=it(n),i=Wc(t,n,s,a),d=new Map;for(const f of i){const p=q(f,n);if(p.length<2)continue;const g=p.find(Rr);if(!g)continue;const m=l.get(f.deck),$=zn(f,n),h=Mt($,{splitPartners:c});for(const R of p){if(R===g)continue;const b=Mt(R.commander,{splitPartners:c});for(const v of h){const k=Be(v,{splitPartners:c,ownedDeck:m}),M=gs(k,r,o);for(const C of M)for(const L of b){const _=l.get(L),A=Be(L,{splitPartners:c,ownedDeck:_}),St=gs(A,r,o);for(const nt of St){const jt=`ci:${C}__oci:${nt}`,ut=d.get(jt)??{subjectKey:`ci:${C}`,opponentKey:`oci:${nt}`,subject:ps(C,r),opponent:ps(nt,r),subjectColors:en(C),opponentColors:en(nt),games:0,wins:0,losses:0,sharedLosses:0};ut.games+=1,g.didWin?ut.wins+=1:R.didWin?ut.losses+=1:ut.sharedLosses+=1,d.set(jt,ut)}}}}}return[...d.values()].map(Mr).sort((f,p)=>{if(p.normalizedMatchupImpact!==f.normalizedMatchupImpact)return p.normalizedMatchupImpact-f.normalizedMatchupImpact;const g=Ne(f),m=Ne(p);return m!==g?m-g:p.games!==f.games?p.games-f.games:f.subject!==p.subject?f.subject.localeCompare(p.subject,void 0,{numeric:!0}):f.opponent.localeCompare(p.opponent,void 0,{numeric:!0})})}function Ac(t,e={}){var o;const n=e.splitPartners??!1,s=e.splitPlayers??!1,a=e.combineDecks??!1,r=((o=e.colorOptions)==null?void 0:o.decks)??[];return{players:ka(t,"players",{splitPartners:n,decks:r}),decks:ka(t,"decks",{splitPartners:n,splitPlayers:s,combineDecks:a,decks:r}),colors:e.colorOptions?Tc(t,{...e.colorOptions,splitPartners:n}):[]}}function _n(t){const n=[...t].sort(K).map(s=>T(s.date)||s.date).filter(Boolean);if(!n.length){const s=new Date().toISOString().slice(0,10);return{min:s,max:s}}return{min:n[0],max:n[n.length-1]}}function De(t,e){const n=_n(t);if(!e.customized)return{start:n.min,end:n.max,bounds:n};const s=e.start||n.min,a=e.end||n.max;return{start:s<n.min?n.min:s,end:a>n.max?n.max:a,bounds:n}}function Ks(t,e,n){const s=T(e)||e,a=T(n)||n;return t.filter(r=>{const o=T(r.date)||r.date;return o>=s&&o<=a})}function Er(t,e){return Ks(t,e.start,e.end)}function Bc(t,e,n,s,a,r){const o=it(e),c=en(n);return Ks(t,a,r).filter(i=>{const d=o.get(i.deck);return d?Fs(c,pn(d),s):!1})}function va(t,e,n,s,a){const r=it(e);return Ks(t,s,a).filter(c=>mt(c,r)===n)}function Nc(t,e,n){return[...t].sort(K).slice(e-1,n)}function qt(t){if(!t.length)return[];let e=0,n=0;const s=new Map;for(const a of t){n+=1,a.result==="Win"&&(e+=1);const r=T(a.date)||a.date,o=s.get(r);o?(o.dayGames+=1,a.result==="Win"&&(o.dayWins+=1),o.cumulativeWins=e,o.cumulativeGames=n):s.set(r,{date:r,dayWins:a.result==="Win"?1:0,dayGames:1,cumulativeWins:e,cumulativeGames:n})}return[...s.values()].map((a,r)=>({index:r+1,date:a.date,dayGames:a.dayGames,dayWins:a.dayWins,dayWinRate:a.dayWins/a.dayGames,games:a.cumulativeGames,wins:a.cumulativeWins,winRate:a.cumulativeWins/a.cumulativeGames}))}const Ft=760,$t=280,I={top:24,right:48,bottom:48,left:44};function Dc(t,e,n,s){const a=T(e),r=T(n),o=T(t);if(!a||!r||!o)return I.left;if(a===r)return I.left+s/2;const c=new Date(`${a}T00:00:00`).getTime(),l=new Date(`${r}T00:00:00`).getTime(),i=new Date(`${o}T00:00:00`).getTime(),d=l-c;if(!d)return I.left+s/2;const u=Math.min(1,Math.max(0,(i-c)/d));return I.left+u*s}function $s({plotW:t,plotH:e,baselineY:n,xLabels:s,title:a,headerHtml:r,body:o}){return`
    <div class="trends-chart-wrap">
      ${r||(a?`<div class="trends-chart-title">${tt(a)}</div>`:"")}
      <svg class="trends-chart" viewBox="0 0 ${Ft} ${$t}" role="img" aria-label="Win rate over time">
        ${o}
        ${s}
        <text class="trends-axis-label" x="${I.left+t/2}" y="${$t-28}" text-anchor="middle">Date</text>
      </svg>
      <div class="trends-chart-tip" hidden></div>
    </div>`}function Pc(t){return[0,.25,.5,.75,1].map(n=>{const s=I.top+t-n*t;return`<line class="trends-grid-line" x1="${I.left}" y1="${s}" x2="${Ft-I.right}" y2="${s}" />
        <text class="trends-axis-label" x="${I.left-8}" y="${s+4}" text-anchor="end">${Math.round(n*100)}%</text>`}).join("")}function Gc(t,e){const n=T(t),s=T(e);if(!n||!s||n===s)return n||s;const a=new Date(`${n}T00:00:00`).getTime(),r=new Date(`${s}T00:00:00`).getTime();return new Date(Math.round((a+r)/2)).toISOString().slice(0,10)}function Nn(t){const e=Ft-I.left-I.right,n=I.left,s=I.left+e,a=I.left+e/2,r=T(t.start),o=T(t.end);if(!r||!o)return"";if(r===o)return`<text class="trends-axis-label trends-x-label" x="${a}" y="${$t-10}" text-anchor="middle">${tt(X(r))}</text>`;const c=Gc(r,o);return`
    <text class="trends-axis-label trends-x-label" x="${n}" y="${$t-10}" text-anchor="start">${tt(X(r))}</text>
    <text class="trends-axis-label trends-x-label" x="${a}" y="${$t-10}" text-anchor="middle">${tt(X(c))}</text>
    <text class="trends-axis-label trends-x-label" x="${s}" y="${$t-10}" text-anchor="end">${tt(X(o))}</text>`}function zc(t,e,{startDate:n,endDate:s}={}){return n&&s?Nn({start:n,end:s}):t.length?(t.length<=3?t.map((r,o)=>o):[0,Math.floor((t.length-1)/2),t.length-1]).map(r=>{const o=t[r],c=X(e[r].date),l=r===0,i=r===t.length-1,d=l?"start":i?"end":"middle";let u=o.x;return l&&(u=Math.max(o.x,I.left)),i&&(u=Math.min(o.x,Ft-I.right)),`<text class="trends-axis-label trends-x-label" x="${u}" y="${$t-10}" text-anchor="${d}">${tt(c)}</text>`}).join(""):""}function Oc(t,e=null){const n=Ft-I.left-I.right,s=$t-I.top-I.bottom;return t.map((a,r)=>{const o=I.left+(t.length===1?n/2:r/(t.length-1)*n),c=I.top+s-a.winRate*s;return{...a,x:o,y:c}})}function Wr(t,e,n){const s=Ft-I.left-I.right,a=$t-I.top-I.bottom;return t.map(r=>{const o=Dc(r.date,e,n,s),c=I.top+a-r.winRate*a;return{...r,x:o,y:c}})}function Tr(t,{seriesId:e="",color:n=null,label:s=""}={}){const a=[...t].sort((o,c)=>o.x-c.x);return{linePath:a.map((o,c)=>`${c===0?"M":"L"} ${o.x} ${o.y}`).join(" "),color:n,dots:a.map(o=>`
      <g class="trends-point-group${e?` trends-point-group-${e}`:""}"
        data-series-id="${tt(e)}"
        data-series-label="${tt(s||e)}"
        data-series-color="${tt(n||"")}"
        data-wr="${o.winRate}" data-day-wr="${o.dayWinRate}" data-games="${o.games}" data-wins="${o.wins}"
        data-day-games="${o.dayGames}" data-day-wins="${o.dayWins}"
        data-date="${tt(o.date)}" data-index="${o.index}">
        <circle class="trends-point-hit" cx="${o.x}" cy="${o.y}" r="10" />
        <circle class="${n?"trends-point trends-point-series":"trends-point"}" cx="${o.x}" cy="${o.y}" r="3"${n?` style="fill: ${n}"`:""} />
      </g>
    `).join("")}}function Ar(t){const e=I.top+t-.25*t;return{baselineY:e,markup:`
      ${Pc(t)}
      <line class="trends-baseline" x1="${I.left}" y1="${e}" x2="${Ft-I.right}" y2="${e}" />`}}function Us(t,e,n,s){const a=Math.round(Number(n))||1,r=Math.round(Number(s))||a,o=Math.min(a,r),c=Math.max(a,r);let l=Math.round(Number(t))||o,i=Math.round(Number(e))||c;return l=Math.max(o,Math.min(l,c)),i=Math.max(o,Math.min(i,c)),l>i&&(l=i),i<l&&(i=l),{min:l,max:i}}function Vs(t="trends"){return{minInput:`${t}-game-min-input`,maxInput:`${t}-game-max-input`,minSlider:`${t}-game-min-slider`,maxSlider:`${t}-game-max-slider`,fill:`${t}-game-range-fill`}}function Br(t){const{min:e,max:n,boundsMin:s,boundsMax:a,idPrefix:r="trends"}=t,o=Vs(r),c=a-s;if(c<=0)return"";const l=(e-s)/c*100,i=(n-s)/c*100;return`
    <div class="trends-game-range">
      <input type="number" class="trends-game-range-input" id="${o.minInput}"
        min="${s}" max="${a}" value="${e}" aria-label="Minimum game" />
      <div class="trends-game-range-track">
        <div class="trends-game-range-fill" id="${o.fill}" style="--range-start:${l}%;--range-end:${i}%"></div>
        <input type="range" class="trends-game-range-slider" id="${o.minSlider}"
          min="${s}" max="${a}" value="${e}" aria-label="Minimum game slider" />
        <input type="range" class="trends-game-range-slider" id="${o.maxSlider}"
          min="${s}" max="${a}" value="${n}" aria-label="Maximum game slider" />
      </div>
      <input type="number" class="trends-game-range-input" id="${o.maxInput}"
        min="${s}" max="${a}" value="${n}" aria-label="Maximum game" />
    </div>`}function Fc(t){const{title:e,winRate:n,gameCount:s=null,min:a,max:r,boundsMin:o,boundsMax:c,idPrefix:l="trends",showTitle:i=!0}=t,d=s==null?null:`${s} Game${s===1?"":"s"}`,u=n!=null?pe(n):"—",f=s==null?`${e} ${u}`.trim():e?`${e}: ${d} - ${u}`:`${d} - ${u}`,p=i?`<div class="trends-chart-header-title">
        <span class="trends-chart-title">${tt(f)}</span>
      </div>`:"",g=Br({min:a,max:r,boundsMin:o,boundsMax:c,idPrefix:l});return`
    <div class="trends-chart-header">
      ${p}
      ${g}
    </div>`}function ns(t,e,n,s,a="trends"){const r=Vs(a),o=document.getElementById(r.minSlider),c=document.getElementById(r.maxSlider),l=document.getElementById(r.minInput),i=document.getElementById(r.maxInput),d=document.getElementById(r.fill),u=s-n;o&&(o.value=String(t)),c&&(c.value=String(e)),l&&(l.value=String(t)),i&&(i.value=String(e)),d&&u>0&&(d.style.setProperty("--range-start",`${(t-n)/u*100}%`),d.style.setProperty("--range-end",`${(e-n)/u*100}%`))}function Nr(t,e,n,s="trends"){const a=Vs(s),r=document.getElementById(a.minSlider),o=document.getElementById(a.maxSlider),c=document.getElementById(a.minInput),l=document.getElementById(a.maxInput);if(!r||!o||!c||!l||e<=t)return;const i=(d,u)=>{const f=Us(d,u,t,e);ns(f.min,f.max,t,e,s),n(f)};r.addEventListener("input",()=>{let d=Number(r.value),u=Number(o.value);d>u&&(u=d),ns(d,u,t,e,s)}),o.addEventListener("input",()=>{let d=Number(r.value),u=Number(o.value);u<d&&(d=u),ns(d,u,t,e,s)}),r.addEventListener("change",()=>{i(Number(r.value),Number(o.value))}),o.addEventListener("change",()=>{i(Number(r.value),Number(o.value))}),c.addEventListener("change",()=>{i(Number(c.value),Number(l.value))}),l.addEventListener("change",()=>{i(Number(c.value),Number(l.value))})}function Dr(t,e="",n=null,s=null){const a=Ft-I.left-I.right,r=$t-I.top-I.bottom,{baselineY:o,markup:c}=Ar(r);if(!t.length){const d=n?Nn(n):"";return $s({plotW:a,plotH:r,baselineY:o,xLabels:d,title:e,headerHtml:s,body:c})}const l=n?Wr(t,n.start,n.end):Oc(t),i=Tr(l);return $s({plotW:a,plotH:r,baselineY:o,xLabels:n?Nn(n):zc(l,t),title:e,headerHtml:s,body:`
      ${c}
      <path class="trends-line" d="${i.linePath}" />
      ${i.dots}`})}function je(t,e,n="",s=null){const a=Ft-I.left-I.right,r=$t-I.top-I.bottom,{baselineY:o,markup:c}=Ar(r),l=(t||[]).filter(d=>{var u;return(u=d.series)==null?void 0:u.length}).map(d=>{const u=Wr(d.series,e.start,e.end),f=Tr(u,{seriesId:String(d.id),color:d.color,label:d.label});return{...d,points:u,rendered:f}});return`
    ${l.length>0?`
    <div class="trends-chart-legend">
      ${l.map(d=>`
        <span class="trends-legend-item" style="--series-color:${d.color}">
          <span class="trends-legend-swatch"></span>${tt(d.label)}
        </span>`).join("")}
    </div>`:""}
    ${$s({plotW:a,plotH:r,baselineY:o,xLabels:Nn(e),title:n,headerHtml:s,body:`
        ${c}
        ${l.map(d=>`
          <path class="trends-line-series" fill="none" style="stroke: ${d.color}" d="${d.rendered.linePath}" />
          ${d.rendered.dots}`).join("")}`})}`}function jc(t){const[e,n]=t.split("-");return!e||!n?t:new Date(Number(e),Number(n)-1,1).toLocaleDateString("en-US",{month:"short",year:"numeric"})}function Hc(t){const e=new Map;for(const s of t){const a=T(s.date);if(!a)continue;const r=a.slice(0,7);e.set(r,(e.get(r)||0)+1)}if(!e.size)return null;let n=null;for(const[s,a]of e)(!n||a>n.games)&&(n={month:s,games:a});return n}function qc(t){const e=[...new Set(t.map(r=>T(r.date)).filter(Boolean))].sort();if(e.length<2)return null;let n=0,s=e[0],a=e[1];for(let r=1;r<e.length;r+=1){const o=new Date(`${e[r-1]}T00:00:00`).getTime(),c=new Date(`${e[r]}T00:00:00`).getTime(),l=Math.round((c-o)/(1e3*60*60*24));l>n&&(n=l,s=e[r-1],a=e[r])}return{days:n,from:s,to:a}}function _c(t){const e=[...t].sort(K);let n=0,s=0,a=0,r=0;for(const c of e)c.result==="Win"?(a+=1,r=0,n=Math.max(n,a)):(r+=1,a=0,s=Math.max(s,r));let o={type:null,length:0};if(e.length){const c=e[e.length-1].result==="Win"?"win":"loss";let l=0;for(let i=e.length-1;i>=0;i-=1){const d=e[i].result==="Win";if(c==="win"&&d||c==="loss"&&!d)l+=1;else break}o={type:c,length:l}}return{longestWinStreak:n,longestLossStreak:s,currentStreak:o,mostActiveMonth:Hc(e),longestBreak:qc(e)}}function Sa(t){return t>0?String(t):"—"}function Kc(t){return!t.type||!t.length?"—":`${t.type==="win"?"W":"L"}${t.length}`}function Uc(t,e={}){const n=e.streakMode??"current",s=t.currentStreak.type==="win"?" trends-streak-win":t.currentStreak.type==="loss"?" trends-streak-loss":"",a=t.mostActiveMonth?`${t.mostActiveMonth.games} games`:"",r=t.longestBreak?`${X(t.longestBreak.from)} – ${X(t.longestBreak.to)}`:"",c=n==="hidden"?"":`
        <div class="stat-card">
          <span class="stat-label">${n==="at-end"?"Streak at End":"Current Streak"}</span>
          <span class="stat-value${s}">${Kc(t.currentStreak)}</span>
        </div>`;return`
    <section class="trends-summary-section">
      <div class="${n==="hidden"?"stat-grid trends-summary-stats trends-summary-stats--compact":"stat-grid trends-summary-stats"}">
        ${c}
        <div class="stat-card">
          <span class="stat-label">Longest Win Streak</span>
          <span class="stat-value trends-streak-win">${Sa(t.longestWinStreak)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Longest Losing Streak</span>
          <span class="stat-value trends-streak-loss">${Sa(t.longestLossStreak)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Most Active Month</span>
          <span class="stat-value">${t.mostActiveMonth?tt(jc(t.mostActiveMonth.month)):"—"}</span>
          ${a?`<span class="stat-sub">${tt(a)}</span>`:""}
        </div>
        <div class="stat-card">
          <span class="stat-label">Longest Break</span>
          <span class="stat-value">${t.longestBreak?`${t.longestBreak.days} days`:"—"}</span>
          ${r?`<span class="stat-sub">${tt(r)}</span>`:""}
        </div>
      </div>
    </section>`}function tt(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function Pr(){document.querySelectorAll(".trends-chart-wrap").forEach(t=>{const e=t.querySelector(".trends-chart-tip"),n=t.querySelector(".trends-chart");!e||!n||t.querySelectorAll(".trends-point-group").forEach(s=>{const a=s.querySelector(".trends-point");if(!a)return;const r=()=>{const c=Number(s.dataset.wr),l=Number(s.dataset.dayWr),i=Number(s.dataset.dayGames),d=Number(s.dataset.dayWins),u=s.dataset.seriesColor,f=s.dataset.seriesLabel,p=f?`${f}<br>`:"";e.hidden=!1,s.classList.add("active"),a.setAttribute("r","5"),u&&a.setAttribute("fill",u);const g=X(s.dataset.date),m=i>1?`${d}W / ${i}G · ${pe(l)} that day`:`${d===1?"Win":"Loss"} that day`;e.innerHTML=`${p}${g}<br>${m}<br>Overall ${pe(c)} (${s.dataset.wins}/${s.dataset.games})`;const $=Number(a.getAttribute("cx")),h=Number(a.getAttribute("cy")),R=n.createSVGPoint();R.x=$,R.y=h;const b=R.matrixTransform(n.getScreenCTM()),v=t.getBoundingClientRect();e.style.left=`${b.x-v.left}px`,e.style.top=`${b.y-v.top}px`},o=()=>{e.hidden=!0,s.classList.remove("active"),a.setAttribute("r","3"),s.dataset.seriesColor&&a.setAttribute("fill",s.dataset.seriesColor)};s.addEventListener("mouseenter",r),s.addEventListener("mouseleave",o)})})}function Q(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function j(t){return String(t||"").trim().toLowerCase()}function wa(t){if(!t.mySeat)return!1;const e=t.opponents||[];return e.length?e.some(n=>String(n.name||"").trim()||String(n.player||"").trim()):!1}function ss(t){return[...t].sort((e,n)=>K(n,e))}function Vc(t,e,n){const s=j(e);return t.filter(a=>q(a,n).some(r=>j(r.player)===s))}function Yc(t,e,n={},s){const{playerScope:a=null,splitPartners:r=!1}=n,o=a?j(a):null;return t.filter(c=>q(c,s).some(l=>o&&j(l.player)!==o?!1:fn(l.commander,e,{splitPartners:r})))}function Gr(t,e){return t.didWin?"win":e.some(n=>n!==t&&n.didWin)?"loss":"shared"}function zr(t){const e=Number(t);return Number.isInteger(e)&&e>=1&&e<=4}function ks(t,e,n){let s=0,a=0,r=0,o=0,c=null;for(const l of t){const i=q(l,n);for(const d of i){if(!e(d,i,l))continue;s+=1;const u=Gr(d,i);u==="win"?a+=1:u==="loss"?r+=1:o+=1,(!c||K(c,l)<0)&&(c=l)}}return{games:s,wins:a,losses:r,sharedLosses:o,lastPlayed:(c==null?void 0:c.date)??null,winRate:W(a,s),normalizedWr:ft(a,s),...Jc(t,e,n)}}function Jc(t,e,n){const s=[],a=[];for(const o of t){const c=Number(o.turn);if(!(c>0))continue;const l=q(o,n);for(const i of l){if(!e(i,l,o))continue;const d=Gr(i,l);d==="win"?s.push(c):d==="loss"&&a.push(c)}}const r=o=>o.length?o.reduce((c,l)=>c+l,0)/o.length:null;return{avgTurnWin:r(s),avgTurnLoss:r(a)}}function Ca(t,e,n){const s=[];for(const a of t){const r=q(a,n);for(const o of r)e(o,r,a)&&s.push({date:a.date,result:o.didWin?"Win":"Loss",turn:a.turn,seat:o.seat})}return s.sort((a,r)=>K({date:a.date,time:""},{date:r.date,time:""}))}function Xc(t,e,n){const s=T(e)||e,a=T(n)||n;return t.filter(r=>{const o=T(r.date)||r.date;return o>=s&&o<=a})}function as(t,e,n){const s=[];for(let a=1;a<=4;a+=1){const r=ks(t,(o,c,l)=>e(o,c,l)&&zr(o.seat)&&o.seat===a,n);r.games>0&&s.push({seat:a,...r})}return s.sort((a,r)=>r.winRate!==a.winRate?r.winRate-a.winRate:r.games!==a.games?r.games-a.games:a.seat-r.seat)}function Or(t,e,n){const s=[...t],a=s.length,r=s.map(M=>({date:M.date})),o=_n(r);let c=s;if(e.customized){const M=De(r,e);c=Xc(s,M.start,M.end)}const l=new Set(c),i=[];s.forEach((M,C)=>{l.has(M)&&i.push(C+1)});const d=i.length?Math.min(...i):1,u=i.length?Math.max(...i):Math.max(1,a),f=n.customized?n.min??d:d,p=n.customized?n.max??u:u,g=Us(f,p,d,u),m=s.slice(g.min-1,g.max),$=m.length?m:c.length?c:s,h=De($.map(M=>({date:M.date})),e),R=m.filter(M=>M.result==="Win").length,b=m.length?W(R,m.length):null,v=si(m),k=ai(m);return{sorted:s,poolGames:c,filterBounds:o,boundsMin:d,boundsMax:u,gameRange:g,rangeGames:m,chartRange:h,headerWinRate:b,filteredStats:v,filteredSeatRankings:k}}function Zc(t){const e=t.losses;return{...t,winRate:t.games>0?W(t.wins,t.games):0,normalizedWinRate:(t.wins+25*.25)/(t.games+25),opponentWins:e,opponentWinRate:t.games>0?W(e,t.games):0,matchupImpact:An(t.wins,t.games),normalizedMatchupImpact:Bn(t.wins,t.games),opponentMatchupImpact:An(e,t.games),opponentNormalizedMatchupImpact:Bn(e,t.games)}}function be(t,e,n,s={},a){const{splitPartners:r=!1,groupByOpponent:o=!1}=s,c=new Map;for(const l of t){const i=q(l,a);if(!(i.length<2)){for(const d of i)if(n(d,i,l))for(const u of i){if(u===d||e==="players"&&!u.player)continue;const f=e==="players"?[{subject:d.player,opponent:u.player}]:Qc(d,u,{splitPartners:r});for(const{subject:p,opponent:g}of f){if(!p||!g)continue;const m=o?j(g):`${j(p)}__${j(g)}`,$=c.get(m)??{subject:o?"":p,opponent:g,games:0,wins:0,losses:0,sharedLosses:0};$.games+=1,d.didWin?$.wins+=1:u.didWin?$.losses+=1:$.sharedLosses+=1,c.set(m,$)}}}}return[...c.values()].map(Zc).sort((l,i)=>{if(i.normalizedMatchupImpact!==l.normalizedMatchupImpact)return i.normalizedMatchupImpact-l.normalizedMatchupImpact;const d=Ne(l),u=Ne(i);return u!==d?u-d:i.games!==l.games?i.games-l.games:l.opponent.localeCompare(i.opponent,void 0,{numeric:!0})})}function Qc(t,e,n){const{splitPartners:s=!1}=n,a=[];for(const r of Mt(t.commander,{splitPartners:s}))for(const o of Mt(e.commander,{splitPartners:s}))a.push({subject:r,opponent:o});return a}function Fr(t,e){const n=H(t).canonicalName;for(const s of e)if(H(O(s)).canonicalName===n)return Fe(s);return null}function ge(t,e=t){return t!=null&&t.trim()?`<button type="button" class="link-btn entity-link" data-entity-report="player" data-entity-key="${Q(t.trim())}">${Q(e||t)}</button>`:Q(e||"")}function vt(t,e,n={}){const{label:s,playerScope:a=null,deckSlotId:r=null}=n,o=String(t||"").trim();if(!o&&!r)return Q(s||"");const c=r?null:Fr(o,e),l=r||c||o,i=a?` data-entity-player-scope="${Q(a)}"`:"",d=r?` data-entity-deck-slot="${Q(r)}"`:"";return`<button type="button" class="link-btn entity-link" data-entity-report="deck" data-entity-key="${Q(l)}"${i}${d}>${Q(s||xn(l,e))}</button>`}function re(t,e,n=!1){const s=n?G(e):`<span class="stat-value">${e}</span>`;return`<div class="stat-card"><span class="stat-label">${t}</span>${s}</div>`}function xa(t){return t!=null?t.toFixed(1):"—"}function ti(t){return`
    ${re("Avg Turn (Win)",xa(t.avgTurnWin))}
    ${re("Avg Turn (Loss)",xa(t.avgTurnLoss))}`}function Ra(t){return`<span class="impact-cell ${Ir(t)}">${Lr(t)}</span>`}function Ma(t,e,n,s){return e==="player"?ge(t.opponent):vt(t.opponent,n,{playerScope:s||null})}function ei(t,e){const n=t.filter(o=>o.deck===e);let s=0,a=null;for(const o of n)o.result==="Win"&&(s+=1),(!a||K(a,o)<0)&&(a=o);const r=n.length;return{games:r,wins:s,losses:r-s,sharedLosses:0,lastPlayed:(a==null?void 0:a.date)??null,winRate:W(s,r),normalizedWr:ft(s,r),...Ds(n)}}function ni(t,e){return t.filter(n=>n.deck===e).map(n=>({date:n.date,result:n.result,turn:n.turn,seat:n.mySeat})).sort((n,s)=>K({date:n.date,time:""},{date:s.date,time:""}))}function si(t){const e=t.length,n=t.filter(o=>o.result==="Win").length,s=[],a=[];for(const o of t){const c=Number(o.turn);c>0&&(o.result==="Win"?s.push(c):a.push(c))}const r=o=>o.length?o.reduce((c,l)=>c+l,0)/o.length:null;return{games:e,wins:n,losses:e-n,sharedLosses:0,lastPlayed:e?t[e-1].date:null,winRate:W(n,e),normalizedWr:ft(n,e),avgTurnWin:r(s),avgTurnLoss:r(a)}}function ai(t){const e=new Map;for(const n of t){if(!zr(n.seat))continue;const s=Number(n.seat),a=e.get(s)??{seat:s,games:0,wins:0};a.games+=1,n.result==="Win"&&(a.wins+=1),e.set(s,a)}return[...e.values()].map(n=>({...n,winRate:W(n.wins,n.games)})).sort((n,s)=>s.winRate!==n.winRate?s.winRate-n.winRate:s.games!==n.games?s.games-n.games:n.seat-s.seat)}function ri(t,e,n={},s){const{splitPartners:a=!1}=n,r=new Map;for(const o of t){const c=q(o,s);for(const l of c){if(!l.player||!fn(l.commander,e,{splitPartners:a}))continue;const i=j(l.player),d=r.get(i)??{player:l.player,games:0,wins:0};d.games+=1,l.didWin&&(d.wins+=1),r.set(i,d)}}return[...r.values()].map(o=>({...o,winRate:W(o.wins,o.games),normalizedWr:ft(o.wins,o.games)})).sort((o,c)=>c.normalizedWr!==o.normalizedWr?c.normalizedWr-o.normalizedWr:c.games!==o.games?c.games-o.games:o.player.localeCompare(c.player,void 0,{numeric:!0}))}function oi(t){return t.length?`
    <table class="table compact entity-matchup-table entity-pilot-table">
      <thead><tr>
        <th>Player</th>
        <th>G</th>
        <th>W</th>
        <th>Norm WR</th>
      </tr></thead>
      <tbody>
        ${t.map(e=>`
          <tr>
            <td>${ge(e.player)}</td>
            <td>${e.games}</td>
            <td>${e.wins}</td>
            <td>${G(e.normalizedWr)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`:""}function ci(t,e,n){const{kind:s,key:a,playerScope:r=null,splitPartners:o=!1,deckSlotId:c=null}=n;if(s==="player"){const m=a,$=j(m),h=A=>j(A.player)===$,R=ks(t,h,e),b=Ca(t,h,e),v=new Map;for(const A of t){const St=q(A,e);for(const nt of St){if(j(nt.player)!==$||!nt.commander)continue;const jt=H(nt.commander).canonicalName,ut=v.get(jt)??{name:nt.commander,games:0,wins:0,ownedKey:Fr(nt.commander,e)};ut.games+=1,nt.didWin&&(ut.wins+=1),v.set(jt,ut)}}const M=$===j(lt)?e.map(A=>{const St=z(A),nt=t.filter(Yn=>Yn.deck===St),jt=nt.filter(Yn=>Yn.result==="Win").length,ut=nt.length;return{key:St,name:B(A),commander:O(A),deckSlotId:St,games:ut,wins:jt,winRate:W(jt,ut),owned:!0}}):[],C=[...v.values()].sort((A,St)=>St.games-A.games||A.name.localeCompare(St.name)).map(A=>({key:A.ownedKey||A.name,name:A.name,commander:A.name,games:A.games,wins:A.wins,winRate:W(A.wins,A.games),owned:!!A.ownedKey})),L=ii(M,C),_=ss(Vc(t,m,e));return{kind:s,title:m,subtitle:null,colors:[],stats:R,chartGames:b,deckList:L,entityGames:_,pilots:[],playerMatchups:be(t,"players",h,{},e),deckMatchups:be(t,"decks",h,{splitPartners:o},e),playerScope:null,seatRankings:as(t,h,e)}}if(s==="deck"&&c){const m=et(e,c),$=m?B(m):On(c,e),h=m?O(m):xn(a,e),R=ei(t,c),b=ni(t,c),v=(M,C,L)=>L.deck!==c||r&&j(M.player)!==j(r)?!1:j(M.player)===j(lt),k=Be(h,{splitPartners:o,ownedDeck:m});return{kind:s,title:$,subtitle:null,colors:k,stats:R,chartGames:b,deckList:[],entityGames:ss(t.filter(M=>M.deck===c)),pilots:[],playerMatchups:be(t,"players",v,{},e),deckMatchups:be(t,"decks",v,{splitPartners:o},e),playerScope:r,deckSlotId:c,displayCommander:h,seatRankings:as(t,v,e)}}const l=xn(a,e),i=m=>r&&j(m.player)!==j(r)?!1:fn(m.commander,l,{splitPartners:o}),d=ks(t,i,e),u=Ca(t,i,e),f=et(e,a),p=Be(l,{splitPartners:o,ownedDeck:f}),g=r?[]:ri(t,l,{splitPartners:o},e);return{kind:s,title:l,subtitle:null,colors:p,stats:d,chartGames:u,deckList:[],entityGames:ss(Yc(t,l,{playerScope:r,splitPartners:o},e)),pilots:g,playerMatchups:be(t,"players",i,{splitPartners:o,groupByOpponent:!0},e),deckMatchups:be(t,"decks",i,{splitPartners:o,groupByOpponent:!0},e),playerScope:r,deckSlotId:null,displayCommander:l,seatRankings:as(t,i,e)}}function ii(t,e){const n=new Map;for(const s of[...t,...e]){const a=H(s.commander||s.name).canonicalName,r=n.get(a);r?(s.games>=r.games&&(r.games=s.games,r.wins=s.wins??0,r.winRate=s.winRate??W(r.wins,r.games)),r.owned=r.owned||s.owned,s.deckSlotId&&(r.deckSlotId=s.deckSlotId),s.commander&&(r.commander=s.commander)):n.set(a,{...s,wins:s.wins??0,winRate:s.winRate??W(s.wins??0,s.games)})}return[...n.values()].sort((s,a)=>a.games-s.games||s.name.localeCompare(a.name))}function jr(t,e,n){if(n.kind==="player"){const r=j(n.title),o=q(t,e).find(c=>j(c.player)===r);return o?o.didWin?"win":"loss":""}if(n.deckSlotId)return t.result==="Win"?"win":"loss";const s=n.displayCommander||n.title,a=q(t,e).find(r=>fn(r.commander,s,{splitPartners:!1}));return a?a.didWin?"win":"loss":t.result==="Win"?"win":"loss"}function li(t,e,n){const s=new Map(q(t,e).map(c=>[c.seat,c])),a=[1,2,3,4].map(c=>{const l=s.get(c),i=l?l.didWin?"entity-game-seat-win":"entity-game-seat-loss":"",d=l!=null&&l.player?ge(l.player):"—",u=l!=null&&l.commander?Q(l.commander):"—";return`
        <div class="entity-game-seat-box ${i}">
          <span class="entity-game-seat-num">Seat ${c}</span>
          <span class="entity-game-seat-player">${d}</span>
          <span class="entity-game-seat-commander">${u}</span>
        </div>`}).join(""),r=it(e),o=jr(t,e,n);return`
    <article class="entity-game-pod-card">
      <div class="entity-game-pod-header">
        <span>${X(t.date)}</span>
        <span>Turn ${t.turn||"—"}</span>
        <span>Bracket ${mt(t,r)}</span>
        <span class="result-pill ${o}">${o==="win"?"Win":"Loss"}</span>
      </div>
      <div class="entity-game-pod-seats">${a}</div>
    </article>`}function vs(t,e,n){if(n.kind==="player"){const s=j(n.title);return q(t,e).find(a=>j(a.player)===s)}return q(t,e).find(s=>fn(s.commander,n.displayCommander||n.title,{splitPartners:!1}))}function di(t,e){const n=it(t);return{date:s=>zt(s),deck:s=>xn(s.deck,t),player:s=>{var a;return((a=vs(s,t,e))==null?void 0:a.player)||""},seat:s=>{var a;return((a=vs(s,t,e))==null?void 0:a.seat)||s.mySeat||0},turn:s=>Number(s.turn)>0?Number(s.turn):null,bracket:s=>mt(s,n),result:s=>s.result==="Win"?1:0}}function ui(t,e,n,s){if(!t.length)return"";const a=it(e),r=n.kind==="player",o=n.kind==="deck",c="entity-games",l=s??{col:"date",dir:"desc"},i=st(t,l,di(e,n),{...wt,result:"date"});return`
    <table class="table compact entity-games-table sortable-table">
      <thead><tr>
        ${w(c,"date","Date",l)}
        ${r?w(c,"deck","Deck",l):""}
        ${o?w(c,"player","Player",l):""}
        ${w(c,"seat","Seat",l)}
        ${w(c,"turn","Turn",l)}
        ${w(c,"bracket","Bracket",l)}
        ${w(c,"result","Result",l)}
      </tr></thead>
      <tbody>
        ${i.map(d=>{const u=jr(d,e,n),f=vs(d,e,n),p=r?`<td>${vt((f==null?void 0:f.commander)||d.deck,e,{label:(f==null?void 0:f.commander)||On(d.deck,e),playerScope:n.title,deckSlotId:(f==null?void 0:f.deckSlotId)||d.deck||null})}</td>`:"",g=o?`<td>${f!=null&&f.player?ge(f.player):"—"}</td>`:"",m=n.kind==="player"?(f==null?void 0:f.seat)||d.mySeat||"—":(f==null?void 0:f.seat)||"—";return`
            <tr>
              <td>${X(d.date)}</td>
              ${p}
              ${g}
              <td>${m}</td>
              <td>${d.turn||"—"}</td>
              <td>${mt(d,a)}</td>
              <td><span class="result-pill ${u}">${u==="win"?"Win":"Loss"}</span></td>
            </tr>`}).join("")}
      </tbody>
    </table>`}function mi(t,e,n){const s=t.entityGames||[];if(!s.length)return'<p class="muted-text entity-report-empty">No games logged yet.</p>';const a=s.filter(wa),r=s.filter(i=>!wa(i)),o=a.map(i=>li(i,e,t)).join(""),c=r.length?r:a.length?[]:s,l=c.length?ui(c,e,t,n):"";return`
    ${a.length?`<div class="entity-game-pod-list">${o}</div>`:""}
    ${l}`}function fi(t,e,n="games",s,a){const o=[{id:"games",label:"Games"},{id:"decks",label:"Deck Matchups"},{id:"players",label:"Player Matchups"}].map(f=>`<button type="button" role="tab" aria-selected="${f.id===n}" class="sub-tab ${f.id===n?"active":""}" data-entity-report-tab="${f.id}">${f.label}</button>`).join(""),c=mi(t,e,a),l=(s==null?void 0:s.players)??{col:"normalizedMatchupImpact",dir:"desc"},i=(s==null?void 0:s.decks)??{col:"normalizedMatchupImpact",dir:"desc"},d=La(t.playerMatchups,f=>Ma(f,"player",e,t.playerScope),"entity-matchups-players",l),u=La(t.deckMatchups,f=>Ma(f,"deck",e,t.playerScope),"entity-matchups-decks",i);return`
    <div class="entity-report-section entity-report-tabs-section">
      <div class="sub-tabs entity-report-tablist" role="tablist">${o}</div>
      <div class="entity-report-tab-panel" data-entity-report-panel="games" role="tabpanel" ${n==="games"?"":"hidden"}>${c}</div>
      <div class="entity-report-tab-panel" data-entity-report-panel="decks" role="tabpanel" ${n==="decks"?"":"hidden"}>${u}</div>
      <div class="entity-report-tab-panel" data-entity-report-panel="players" role="tabpanel" ${n==="players"?"":"hidden"}>${d}</div>
    </div>`}function pi(t,e,n){return t.length?`
    <div class="entity-deck-grid">
      ${t.map(s=>{const a=s.commander||s.name,r=xr(a)[0];return`
        <div class="entity-deck-card">
          <div class="entity-deck-card-art">
            ${r?`<img class="commander-img commander-art-img loading" data-card-name="${Q(r.name)}"${r.face?` data-card-face="${r.face}"`:""} data-card-image="art" alt="${Q(a)}" />`:""}
          </div>
          <div class="entity-deck-card-body">
            <div class="entity-deck-card-name">${vt(a,e,{label:s.name,playerScope:n,deckSlotId:s.deckSlotId||null})}</div>
            <div class="entity-deck-card-stats">
              <span>${s.games}G</span>
              <span>${s.wins??0}W</span>
              <span>${s.games?G(s.winRate??W(s.wins??0,s.games)):"—"}</span>
            </div>
          </div>
        </div>`}).join("")}
    </div>`:""}const gi=[{id:"overview",label:"Overview"},{id:"seats",label:"Seats"}];function yi(t){return`
    ${re("Games",t.games)}
    ${re("Wins",t.wins)}
    ${re("Win rate",t.games?t.winRate:0,!!t.games)}
    ${re("Norm WR",t.games?t.normalizedWr:0,!!t.games)}
    ${ti(t)}
    ${re("Last played",t.lastPlayed?X(t.lastPlayed):"—")}`}function hi(t){return t!=null&&t.length?`
    <ol class="entity-seat-rankings">
      ${t.map((e,n)=>`
        <li class="entity-seat-ranking-row">
          <span class="entity-seat-rank">#${n+1}</span>
          <span class="entity-seat-name">Seat ${e.seat}</span>
          <span class="entity-seat-stats">
            <span>${e.games}G</span>
            <span>${e.wins}W</span>
            <span>${G(e.winRate)}</span>
          </span>
        </li>`).join("")}
    </ol>`:'<p class="muted-text entity-report-empty">No seat data yet.</p>'}function bi(t,e="overview",n){const s=`<div class="stat-grid entity-report-stats">${yi(n.filteredStats)}</div>`,a=hi(n.filteredSeatRankings);return`
    <div class="entity-report-hero-tabs">
      <div class="sub-tabs entity-report-hero-tablist" role="tablist">${gi.map(o=>`<button type="button" role="tab" aria-selected="${o.id===e}" class="sub-tab entity-report-hero-tab ${o.id===e?"active":""}" data-entity-hero-tab="${o.id}">${o.label}</button>`).join("")}</div>
      <div class="entity-report-hero-panel" data-entity-hero-panel="overview" role="tabpanel" ${e==="overview"?"":"hidden"}>${s}</div>
      <div class="entity-report-hero-panel" data-entity-hero-panel="seats" role="tabpanel" ${e==="seats"?"":"hidden"}>${a}</div>
    </div>`}function $i(t){const{bounds:e,start:n,end:s}=t;return`
    <div class="entity-report-chart-dates stats-range-dates">
      <label>From <input type="date" id="entity-report-range-start" min="${e.min}" max="${e.max}" value="${n}" /></label>
      <label>To <input type="date" id="entity-report-range-end" min="${e.min}" max="${e.max}" value="${s}" /></label>
    </div>`}function ki(t,e){const{chartRange:n,gameRange:s,boundsMin:a,boundsMax:r,rangeGames:o}=e,c=o.length?o:t.chartGames,l=t.chartGames.length>0?Dr(qt(c),"",n):'<p class="muted-text entity-report-empty">No games logged yet.</p>',i=Br({min:s.min,max:s.max,boundsMin:a,boundsMax:r,idPrefix:"entity-report"});return`
    <div class="entity-report-section entity-report-chart-section">
      <h4>Performance over time</h4>
      <div class="entity-report-chart-controls">
        <div class="entity-report-chart-controls-dates">${$i(n)}</div>
        <div class="entity-report-chart-controls-range">${i}</div>
      </div>
      <div class="entity-report-chart">${l}</div>
    </div>`}function vi(t,e,n="games",s,a,r={}){const{heroTab:o="overview",chartContext:c}=r,l=t.title,i=c??Or(t.chartGames,{start:null,end:null,customized:!1},{min:1,max:null,customized:!1}),d=bi(t,o,i),u=ki(t,i),f=fi(t,e,n,s,a);if(t.kind==="deck"){const g=uc(t.displayCommander||t.title,{escapeHtml:Q}),m=!t.playerScope&&t.pilots.length?`<div class="entity-report-section entity-report-pilots">
            <h4>Piloted by</h4>
            ${oi(t.pilots)}
          </div>`:"";return`
      <div class="modal-content modal-content-wide modal-content-report entity-report-deck" data-entity-report-root="${Q(l)}">
        <div class="entity-report-header">
          <h3 class="entity-report-title">${Q(t.title)}</h3>
        </div>

        <div class="entity-report-deck-hero">
          <div class="entity-report-deck-art">
            <div class="deck-commander-images entity-report-images">${g}</div>
          </div>
          <div class="entity-report-deck-stats">${d}</div>
        </div>

        ${m}
        ${u}
        ${f}
      </div>`}const p=t.deckList.length?`<div class="entity-report-section">
        <h4>Decks</h4>
        ${pi(t.deckList,e,t.title)}
      </div>`:"";return`
    <div class="modal-content modal-content-wide modal-content-report entity-report-player" data-entity-report-root="${Q(l)}">
      <div class="entity-report-header">
        <h3 class="entity-report-title">${Q(t.title)}</h3>
      </div>

      ${d}
      ${p}
      ${u}
      ${f}
    </div>`}const Si={opponent:t=>t.opponent,games:t=>t.games,wins:t=>t.wins,winRate:t=>t.winRate,matchupImpact:t=>t.matchupImpact,normalizedMatchupImpact:t=>t.normalizedMatchupImpact};function La(t,e,n,s){if(!t.length)return'<p class="muted-text entity-report-empty">No matchup data yet.</p>';const a=st(t,s,Si,wt);return`
    <table class="table compact entity-matchup-table sortable-table">
      <thead><tr>
        ${w(n,"opponent","Opponent",s)}
        ${w(n,"games","G",s)}
        ${w(n,"wins","W",s)}
        ${w(n,"winRate","WR",s)}
        ${w(n,"matchupImpact","MI",s)}
        ${w(n,"normalizedMatchupImpact","NMI",s)}
      </tr></thead>
      <tbody>
        ${a.map(r=>`
          <tr>
            <td>${e(r)}</td>
            <td>${r.games}</td>
            <td>${r.wins}</td>
            <td>${G(r.winRate)}</td>
            <td>${Ra(r.matchupImpact)}</td>
            <td>${Ra(r.normalizedMatchupImpact)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`}function wi(t=document){for(const s of t.querySelectorAll(".entity-deck-card-stats")){s.style.fontSize="14px";let a=14;for(;s.scrollWidth>s.clientWidth&&a>9.5;)a-=.5,s.style.fontSize=`${a}px`}}function Ia(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ci(t){const e=String(t||""),n=e.split(",").map(r=>r.trim());if(/,\s*$/.test(e))return{committed:n.filter(Boolean),query:""};if(!n.length)return{committed:[],query:""};const s=n[n.length-1]||"";return{committed:n.slice(0,-1).filter(Boolean),query:s}}function xi(t){const e=(t||[]).filter(Boolean);return e.length?`${e.join(", ")}, `:""}function Ri(t){return String(t||"").split(",").map(e=>e.trim()).filter(Boolean)}function Mi(t){const e=new Map;for(const n of t)for(const s of n.archetypes||[]){const a=String(s||"").trim();if(!a)continue;const r=a.toLowerCase();e.has(r)||e.set(r,a)}return[...e.values()].sort((n,s)=>n.localeCompare(s,void 0,{sensitivity:"base"}))}function Li(t,e,n){const s=new Set(n.map(o=>o.toLowerCase())),a=e.filter(o=>!s.has(o.toLowerCase())),r=t.trim().toLowerCase();return r?a.filter(o=>o.toLowerCase().startsWith(r)):a}function Ii(t,e){const n=t.value,s=n.lastIndexOf(","),a=s>=0?`${n.slice(0,s+1)} `:"";t.value=`${a}${e}, `,Ss(t),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}function Ss(t){t.style.height="auto",t.style.height=`${Math.max(t.scrollHeight,36)}px`}function Ei(t,e){if(!t)return;const n=t.querySelector(".deck-archetype-input"),s=t.querySelector(".deck-archetype-suggestions");if(!(n instanceof HTMLTextAreaElement)||!s)return;let a=-1,r=0,o=!0;const c=()=>Mi(e),l=()=>{s.hidden=!0,s.innerHTML="",a=-1},i=()=>{const{committed:$,query:h}=Ci(n.value),R=Li(h,c(),$);if(a=-1,!R.length){l();return}s.innerHTML=R.map(b=>`<li role="option" data-value="${Ia(b)}">${Ia(b)}</li>`).join(""),s.hidden=!1},d=()=>{i()},u=$=>{Ii(n,$),r=Date.now()+200,d()},f=$=>{const h=[...s.querySelectorAll('[role="option"]')];h.length&&(a=Math.max(0,Math.min($,h.length-1)),h.forEach((R,b)=>R.classList.toggle("active",b===a)),h[a].scrollIntoView({block:"nearest"}))};Ss(n);const p=n.closest(".deck-archetype-wrap"),g=t.closest(".modal-content")||t,m=$=>{if(!document.body.contains(n)){g.removeEventListener("mousedown",m,!0);return}p!=null&&p.contains($.target)||s.hidden||(l(),o=!1)};g.addEventListener("mousedown",m,!0),n.addEventListener("mousedown",()=>{o=!0}),n.addEventListener("click",()=>{if(!o){o=!0;return}d()}),n.addEventListener("input",()=>{Ss(n),d()}),n.addEventListener("focusout",()=>{setTimeout(()=>{Date.now()<r||p&&!p.contains(document.activeElement)&&l()},150)}),n.addEventListener("keydown",$=>{if(s.hidden)return;const h=[...s.querySelectorAll('[role="option"]')];h.length&&($.key==="ArrowDown"?($.preventDefault(),f(a+1)):$.key==="ArrowUp"?($.preventDefault(),f(a<=0?0:a-1)):$.key==="Enter"&&a>=0?($.preventDefault(),u(h[a].dataset.value||"")):$.key==="Escape"&&(l(),o=!1))}),s.addEventListener("mousedown",$=>{const h=$.target.closest('[role="option"]');h&&($.preventDefault(),u(h.dataset.value||""))})}const Wi=new Set(["add-game-form","deck-form","deck-list-form"]);function rs(t){return t instanceof HTMLFormElement&&Wi.has(t.id)}function Ti(t=document){t.addEventListener("submit",e=>{rs(e.target)&&e.preventDefault()},!0),t.addEventListener("click",e=>{const n=e.target.closest('button[type="submit"], input[type="submit"]');!n||!rs(n.form)||(e.ctrlKey||e.metaKey||e.shiftKey||e.button===1)&&e.preventDefault()},!0),t.addEventListener("auxclick",e=>{if(e.button!==1)return;const n=e.target.closest('button[type="submit"], input[type="submit"]');n&&rs(n.form)&&e.preventDefault()},!0)}function Ai(t){let e=null;document.addEventListener("mousedown",n=>{const s=n.target.closest(".modal:not(.hidden)");if(!s){e=null;return}e=n.target.closest(".modal-content")?null:s.id}),document.addEventListener("mouseup",n=>{var a,r,o,c,l;if(!e)return;if(n.target.closest(".modal-content")){e=null;return}const s=e;e=null,s==="deck-modal"?(a=t.deck)==null||a.call(t):s==="game-modal"?(r=t.game)==null||r.call(t):s==="game-detail-modal"?(o=t.gameDetail)==null||o.call(t):s==="entity-report-modal"?(c=t.entityReport)==null||c.call(t):s==="recovery-modal"&&((l=t.recovery)==null||l.call(t))})}const Bi="edhlog-data-v1",Ni=/^edhlog[-_]data(?:[-_]v\d+)?$/i,Di=/^edhlog:/i;function Pi(t){return Di.test(t)?!1:Ni.test(t)}function Ys(t){return!!t&&typeof t=="object"&&Array.isArray(t.games)&&Array.isArray(t.decks)}function Js(t){if(!t||typeof t!="string")return null;try{const e=JSON.parse(t);if(Ys(e))return e}catch{}return Gi(t)}function Gi(t){const e=t.indexOf('{"');if(e<0)return null;const n=t.slice(e);for(let s=n.length;s>n.length/2;s-=1)if(n[s-1]==="}")try{const a=JSON.parse(n.slice(0,s));if(Ys(a))return a}catch{}return null}function Xs(t){const n=[...t.games].sort(K).map(s=>T(s.date)||s.date).filter(Boolean);return{games:t.games.length,decks:t.decks.length,oldest:n[0]?X(n[0]):"—",newest:n.length?X(n[n.length-1]):"—"}}function zi(t,e){const n=new Set(t.games.map(c=>c.id)),s=new Set(t.games.map(c=>oa(c))),a=e.games.filter(c=>!n.has(c.id)&&!s.has(oa(c))),r=new Set(t.decks.map(c=>String(O(c)||c.name||c.id||"").trim())),o=e.decks.filter(c=>{const l=String(O(c)||c.name||c.id||"").trim();return l&&!r.has(l)});return{missingGames:a,missingDecks:o}}function Oi(t,e){const{missingGames:n,missingDecks:s}=zi(t,e);return{merged:{meta:{...t.meta||{}},decks:[...t.decks,...s.map(r=>({...r}))],games:[...t.games,...n.map(r=>({...r,source:r.source||"local"}))]},missingGames:n,missingDecks:s}}async function Ea(t,e){const n=[];for(let s=0;s<t.length;s+=1){const a=t.key(s);if(!a)continue;const r=t.getItem(a);if(!r)continue;const o=Js(r);if(o){n.push({id:`${e}:${a}`,label:a,detail:`${e} key`,source:e,data:o,stats:Xs(o),isActive:e==="localStorage"&&a===Bi});continue}Pi(a)&&n.push({id:`${e}:${a}`,label:a,detail:`${e} key (unreadable)`,source:e,data:null,stats:null,error:"Found EDHLOG storage data but could not parse JSON. Try a backup file instead."})}return n}function Fi(t){return new Promise(e=>{const n=[],s=indexedDB.open(t);s.onerror=()=>e([]),s.onsuccess=()=>{const a=s.result,r=[...a.objectStoreNames];if(!r.length){a.close(),e([]);return}let o=r.length;const c=()=>{o-=1,o<=0&&(a.close(),e(n))};for(const l of r)try{const u=a.transaction(l,"readonly").objectStore(l).openCursor();let f=0;u.onerror=c,u.onsuccess=()=>{const p=u.result;if(!p||f>=200){c();return}n.push(p.value),f+=1,p.continue()}}catch{c()}}})}async function ji(){const t=[];if(!indexedDB.databases)return t;try{const e=await indexedDB.databases();for(const n of e){if(!n.name)continue;(await Fi(n.name)).forEach((a,r)=>{const o=typeof a=="string"?Js(a):Ys(a)?a:null;o&&t.push({id:`indexeddb:${n.name}:${r}`,label:n.name,detail:"IndexedDB database",source:"IndexedDB",data:o,stats:Xs(o)})})}}catch{}return t}async function Hi(t){const e=[];for(const n of t)try{const s=await n.text(),a=Js(s);a?e.push({id:`file:${n.name}:${n.lastModified}`,label:n.name,detail:"Backup file",source:"File",data:a,stats:Xs(a)}):e.push({id:`file:${n.name}:${n.lastModified}`,label:n.name,detail:"Backup file (unreadable)",source:"File",data:null,stats:null,error:"Could not parse this JSON file as EDHLOG data."})}catch{e.push({id:`file:${n.name}:${n.lastModified}`,label:n.name,detail:"Backup file (unreadable)",source:"File",data:null,stats:null,error:"Could not read this file."})}return e}async function Hr(){const t=[...await Ea(localStorage,"localStorage"),...await Ea(sessionStorage,"sessionStorage"),...await ji()],e=new Set;return t.filter(n=>{var r,o,c;if(!n.data)return!0;const s=`${(r=n.stats)==null?void 0:r.games}:${(o=n.stats)==null?void 0:o.decks}:${(c=n.stats)==null?void 0:c.newest}`,a=`${n.label}:${s}`;return e.has(a)?!1:(e.add(a),!0)})}function qi(t,e){const n=t.filter(a=>a.data),s=t.filter(a=>!a.data);return`
    <div id="recovery-modal" class="modal">
      <div class="modal-content modal-content-wide recovery-modal">
        <h3>Recover data</h3>
        <p class="recovery-lead">
          Scans this browser profile for EDHLOG data on <strong>${gt(e.origin)}</strong>.
          Data logged on a different URL (localhost vs GitHub Pages) or another browser lives in a separate storage bucket.
        </p>
        <p class="recovery-meta">
          Current site data: <strong>${e.currentGames}</strong> games · <strong>${e.currentDecks}</strong> decks
        </p>
        <div class="recovery-actions-row">
          <button type="button" class="btn btn-ghost btn-sm" id="recovery-rescan-btn">Scan again</button>
          <label class="btn btn-ghost btn-sm recovery-file-btn">
            Add backup file
            <input type="file" id="recovery-file-input" accept=".json,application/json" multiple hidden />
          </label>
        </div>
        ${n.length?`<div class="recovery-section">
          <h4>Recoverable snapshots</h4>
          <div class="recovery-list">
            ${n.map(a=>`
              <article class="recovery-card${a.isActive?" recovery-card--active":""}">
                <div class="recovery-card-head">
                  <strong>${gt(a.label)}</strong>
                  <span class="recovery-source">${gt(a.source)}</span>
                </div>
                <p class="recovery-detail">${gt(a.detail)}${a.isActive?" · currently loaded":""}</p>
                <p class="recovery-stats">${a.stats.games} games · ${a.stats.decks} decks · ${gt(a.stats.oldest)} → ${gt(a.stats.newest)}</p>
                <div class="recovery-card-actions">
                  <button type="button" class="btn btn-sm" data-recovery-merge="${gt(a.id)}">Merge missing</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-recovery-replace="${gt(a.id)}">Replace all</button>
                </div>
              </article>`).join("")}
          </div>
        </div>`:'<p class="recovery-empty">No readable EDHLOG snapshots were found in this browser profile yet. Try adding backup JSON files from Downloads.</p>'}
        ${s.length?`<div class="recovery-section">
          <h4>Unreadable candidates</h4>
          <ul class="recovery-errors">
            ${s.map(a=>`<li><strong>${gt(a.label)}</strong> (${gt(a.source)}): ${gt(a.error||"Unreadable")}</li>`).join("")}
          </ul>
        </div>`:""}
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="recovery-close-btn">Close</button>
        </div>
      </div>
    </div>`}function Wa(t,e){return t.find(n=>n.id===e)||null}function gt(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}const hn=[{id:"decks",label:"Decks"},{id:"players",label:"Players"},{id:"colors",label:"Colors"},{id:"archetypes",label:"Archetypes"},{id:"seats",label:"Seats"},{id:"turns",label:"Turns"}];function nn(t){return String(t||"").trim().toLowerCase()}function Zs(t){return nn(t.player)===nn(lt)}function qr(t,e){const n=H(t).canonicalName;for(const s of e){if(H(O(s)).canonicalName===n)return s;for(const a of s.history||[])if(H(a.commander).canonicalName===n)return s}return null}function Qs(t,e){return t.didWin?"win":e.some(n=>n!==t&&n.didWin)?"loss":"shared"}function ta(t){return{...t,winRate:W(t.wins,t.games),normalizedWr:ft(t.wins,t.games)}}function ea(t){return t.sort((e,n)=>n.normalizedWr!==e.normalizedWr?n.normalizedWr-e.normalizedWr:n.games!==e.games?n.games-e.games:e.name.localeCompare(n.name,void 0,{numeric:!0}))}function _i(t,e,n={}){const{splitPartners:s=!1,excludeMyPlayer:a=!1}=n,r=it(e),o=new Map;for(const c of t){const l=q(c,e),i=mt(c,r);for(const d of l)if(!(a&&Zs(d))&&d.commander)for(const u of Mt(d.commander,{splitPartners:s})){const f=nn(u),p=o.get(f)??{key:f,name:u,games:0,wins:0,losses:0,sharedLosses:0,pilots:new Map,pilotBrackets:new Map,lastPlayed:null};p.games+=1;const g=Qs(d,l);if(g==="win"?p.wins+=1:g==="loss"?p.losses+=1:p.sharedLosses+=1,i&&d.player){const m=nn(d.player),$=p.pilotBrackets.get(m)??{total:0,count:0};$.total+=i,$.count+=1,p.pilotBrackets.set(m,$)}d.player&&p.pilots.set(d.player,(p.pilots.get(d.player)||0)+1),(!p.lastPlayed||c.date>p.lastPlayed)&&(p.lastPlayed=c.date),o.set(f,p)}}return ea([...o.values()].map(c=>{const l=qr(c.name,e),i=[...c.pilots.entries()].map(([f,p])=>({player:f,games:p})).sort((f,p)=>p.games-f.games||f.player.localeCompare(p.player)),d=[...c.pilotBrackets.values()].filter(f=>f.count>0).map(f=>f.total/f.count),u=d.length>0?Math.round(d.reduce((f,p)=>f+p,0)/d.length*10)/10:(l==null?void 0:l.bracket)??null;return ta({...c,colors:Be(c.name,{splitPartners:s,ownedDeck:l}),bracket:u,isOwned:!!l,pilots:i,pilotCount:i.length,pilotBrackets:void 0})}))}function Ki(t,e,n={}){var r;const{excludeMyPlayer:s=!1}=n,a=new Map;for(const o of t){const c=q(o,e);for(const l of c){if(s&&Zs(l))continue;const i=(r=l.player)==null?void 0:r.trim();if(!i)continue;const d=nn(i),u=a.get(d)??{key:d,name:i,games:0,wins:0,losses:0,sharedLosses:0,commanders:new Map,lastPlayed:null};u.games+=1;const f=Qs(l,c);f==="win"?u.wins+=1:f==="loss"?u.losses+=1:u.sharedLosses+=1;const p=H(l.commander).canonicalName;u.commanders.set(p,(u.commanders.get(p)||0)+1),(!u.lastPlayed||o.date>u.lastPlayed)&&(u.lastPlayed=o.date),a.set(d,u)}}return ea([...a.values()].map(o=>{const c=[...o.commanders.entries()].map(([l,i])=>({name:l,games:i})).sort((l,i)=>i.games-l.games||l.name.localeCompare(i.name));return ta({...o,commanders:c,commanderCount:c.length})}))}function Ui(t,e,n={}){const{splitPartners:s=!1,excludeMyPlayer:a=!1,view:r="exact",agg:o="exclusive"}=n,c=new Map;for(const l of t){const i=q(l,e);for(const d of i)if(!(a&&Zs(d))&&d.commander)for(const u of Mt(d.commander,{splitPartners:s})){const f=qr(u,e),p=Be(u,{splitPartners:s,ownedDeck:f}),g=gs(p,r,o);for(const m of g){const $=c.get(m)??{key:m,name:ps(m,r),displayColors:en(m),games:0,wins:0,losses:0,sharedLosses:0,commanders:new Set,players:new Set};$.games+=1;const h=Qs(d,i);h==="win"?$.wins+=1:h==="loss"?$.losses+=1:$.sharedLosses+=1,$.commanders.add(H(u).canonicalName),d.player&&$.players.add(d.player),c.set(m,$)}}}return ea([...c.values()].map(l=>ta({...l,commanderCount:l.commanders.size,playerCount:l.players.size,commanders:void 0,players:void 0})))}function Vi(t,e,n={}){const{bracketFilter:s="",...a}=n,r=jn(t,e,s);return{decks:_i(r,e,a),players:Ki(r,e,a),colors:Ui(r,e,a)}}function _r(t){return(t||[]).map(e=>String(e||"").trim()).filter(Boolean)}function na(t,e){const n=e.toLowerCase();return t.has(n)||t.set(n,e),t.get(n)||e}function ws(t,e){return[...t].map(n=>na(e,n)).sort((n,s)=>n.localeCompare(s,void 0,{sensitivity:"base"})).join(", ")}function Yi(t){const e=[],n=t.length;for(let s=1;s<1<<n;s++){const a=[];for(let r=0;r<n;r++)s&1<<r&&a.push(t[r]);e.push(a)}return e}function Ji(t,e,n){const s=_r(t);if(!s.length)return[];const a=s.map(r=>na(n,r));return e==="unique"?[...new Set(a.map(r=>r.toLowerCase()))].map(r=>n.get(r)||r):e==="exact"?[ws(a,n)]:Yi(a).map(r=>ws(r,n))}function Xi(t,e,n,s){const a=_r(t).map(o=>na(s,o));if(!a.length)return!1;if(n==="unique")return a.some(o=>o.toLowerCase()===String(e||"").trim().toLowerCase());if(n==="exact")return ws(a,s)===e;const r=String(e||"").split(",").map(o=>o.trim()).filter(Boolean);return r.length?r.every(o=>a.some(c=>c.localeCompare(o,void 0,{sensitivity:"base"})===0)):!1}function Ta(t){return t==="combined"?"Combined":t==="exact"?"Exact":"Unique"}function Zi(t){return t==="unique"?"combined":t==="combined"?"exact":"unique"}function Aa(t,e,{view:n}){const s=new Map,a=new Set;for(const r of e)for(const o of Ji(r.archetypes,n,s))a.add(o);return[...a].sort((r,o)=>r.localeCompare(o,void 0,{sensitivity:"base"})).map(r=>{let o=0,c=0;const l=new Set;for(const i of t){const d=et(e,i.deck);if(!d||!Xi(d.archetypes,r,n,s))continue;o+=1,i.result==="Win"&&(c+=1);const u=z(d);u&&l.add(u)}return{key:r,label:r,decks:l.size,games:o,wins:c,winRate:W(c,o),normalizedWr:ft(c,o)}})}function Ba(t){return String(t||"").trim().toLowerCase()}function Kr(t){return Ba(t.player)===Ba(lt)}function Qi(t,e){return t.didWin?"win":e.some(n=>n!==t&&n.didWin)?"loss":"shared"}function tl(t,e={}){const{decks:n=[],excludeMyPlayer:s=!1}=e;let a=[];for(const i of t){const d=Number(i.turn);!Number.isFinite(d)||d<=0||a.push({game:i,endTurn:d})}if(s&&(a=a.filter(({game:i})=>!q(i,n).some(Kr))),!a.length)return[];const r=a.length,o=Math.max(...a.map(i=>i.endTurn)),c=new Map;for(const{endTurn:i}of a)c.set(i,(c.get(i)||0)+1);const l=[];for(let i=1;i<=o;i+=1){const d=c.get(i)||0;l.push({turn:i,games:d,wins:0,losses:0,winRate:r?W(d,r):null,normalizedWr:r?ft(d,r):null})}return l}function el(t,e={}){const{allPlayers:n=!1,decks:s=[],excludeMyPlayer:a=!1}=e,r=[];for(const l of t){const i=Number(l.turn);!Number.isFinite(i)||i<=0||r.push({game:l,endTurn:i})}if(!r.length)return[];const o=Math.max(...r.map(l=>l.endTurn)),c=[];for(let l=1;l<=o;l+=1){let i=0,d=0,u=0;for(const{game:p,endTurn:g}of r)if(g>=l&&(i+=1),g===l)if(n){const m=q(p,s);for(const $ of m){if(a&&Kr($))continue;const h=Qi($,m);h==="win"?d+=1:h==="loss"&&(u+=1)}}else p.result==="Win"?d+=1:p.result==="Loss"&&(u+=1);const f=d+u;c.push({turn:l,games:i,wins:d,losses:u,winRate:f?W(d,f):null,normalizedWr:f?ft(d,f):null})}return c}const Cs=760,Cn=260,at={top:24,right:24,bottom:44,left:44};function $e(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function nl(t){return[0,.25,.5,.75,1].map(n=>{const s=at.top+t-n*t;return`<line class="trends-grid-line" x1="${at.left}" y1="${s}" x2="${Cs-at.right}" y2="${s}" />
        <text class="trends-axis-label" x="${at.left-8}" y="${s+4}" text-anchor="end">${Math.round(n*100)}%</text>`}).join("")}function xs(t,e,n,s){if(n<=e)return at.left+s/2;const a=(t-e)/(n-e);return at.left+a*s}function sl(t){if(!t.length)return"";if(t.length===1)return`M ${t[0].x} ${t[0].y}`;let e=`M ${t[0].x} ${t[0].y}`;for(let n=0;n<t.length-1;n+=1){const s=t[n-1]||t[n],a=t[n],r=t[n+1],o=t[n+2]||r,c=a.x+(r.x-s.x)/6,l=a.y+(r.y-s.y)/6,i=r.x-(o.x-a.x)/6,d=r.y-(o.y-a.y)/6;e+=` C ${c} ${l}, ${i} ${d}, ${r.x} ${r.y}`}return e}function al(t,e){if(!t.length)return"";const n=t[0].turn,s=t[t.length-1].turn,a=s-n;return(a<=24?t:t.filter((o,c)=>c%Math.ceil(a/24)===0||c===t.length-1)).map(o=>`<text class="trends-axis-label trends-x-label" x="${xs(o.turn,n,s,e)}" y="${Cn-10}" text-anchor="middle">${o.turn}</text>`).join("")}function Na(t,e={}){const{gradientId:n="turn-wr-fill-gradient",mode:s="player"}=e,a=Cs-at.left-at.right,r=Cn-at.top-at.bottom,o=at.top+r;if(!t.length)return'<div class="turn-wr-chart-wrap muted">No turn data yet — add an end turn when logging games.</div>';const c=t[0].turn,l=t[t.length-1].turn,i=t.map(g=>{const m=s==="distribution"?g.games:g.wins+g.losses,$=m?g.winRate:null;return{turn:g.turn,games:g.games,wins:g.wins,losses:g.losses,ended:m,winRate:$,x:xs(g.turn,c,l,a),y:$==null?null:at.top+r-$*r}}).filter(g=>g.y!=null),d=sl(i),u=i.length?`${d} L ${i[i.length-1].x} ${o} L ${i[0].x} ${o} Z`:"",f=t.map(g=>{const m=s==="distribution"?g.games:g.wins+g.losses;if(!m||g.winRate==null)return"";const $=xs(g.turn,c,l,a),h=at.top+r-g.winRate*r;return`
      <g class="turn-wr-point" data-turn="${g.turn}" data-wr="${g.winRate}" data-games="${g.games}" data-wins="${g.wins}" data-losses="${g.losses}" data-ended="${m}" data-mode="${s}">
        <circle class="turn-wr-point-hit" cx="${$}" cy="${h}" r="10" />
        <circle class="turn-wr-point-dot" cx="${$}" cy="${h}" r="3.5" />
      </g>`}).join("");return`
    <div class="turn-wr-chart-wrap">
      <svg class="trends-chart turn-wr-chart" viewBox="0 0 ${Cs} ${Cn}" role="img" aria-label="${s==="distribution"?"Share of games ending by turn":"Win rate by end turn"}">
        <defs>
          <linearGradient id="${n}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(91, 159, 212, 0.34)" />
            <stop offset="72%" stop-color="rgba(91, 159, 212, 0.12)" />
            <stop offset="100%" stop-color="rgba(91, 159, 212, 0.02)" />
          </linearGradient>
        </defs>
        ${nl(r)}
        ${u?`<path class="turn-wr-area" d="${u}" fill="url(#${n})" />`:""}
        ${d?`<path class="turn-wr-line" d="${d}" />`:""}
        ${f}
        ${al(t,a)}
        <text class="trends-axis-label" x="${at.left+a/2}" y="${Cn-28}" text-anchor="middle">Turn</text>
      </svg>
      <div class="turn-wr-chart-tip" hidden></div>
    </div>`}function rl(t=document){const e=t.querySelector(".turn-wr-chart-wrap"),n=e==null?void 0:e.querySelector(".turn-wr-chart-tip");if(!e||!n)return;const s=()=>{n.hidden=!0,e.querySelectorAll(".turn-wr-point.active").forEach(a=>a.classList.remove("active"))};e.querySelectorAll(".turn-wr-point").forEach(a=>{a.addEventListener("mouseenter",()=>{e.querySelectorAll(".turn-wr-point.active").forEach(u=>u.classList.remove("active")),a.classList.add("active");const r=a.getAttribute("data-turn"),o=Number(a.getAttribute("data-wr")),c=a.getAttribute("data-games"),l=a.getAttribute("data-wins"),i=a.getAttribute("data-losses");(a.getAttribute("data-mode")||"player")==="distribution"?n.innerHTML=`<strong>Turn ${$e(r)}</strong><br>${$e(c)} ended · ${pe(o)} of games`:n.innerHTML=`<strong>Turn ${$e(r)}</strong><br>${$e(l)}W / ${$e(i)}L · ${pe(o)}<br>${$e(c)} reached`,n.hidden=!1}),a.addEventListener("mousemove",r=>{const o=e.getBoundingClientRect();n.style.left=`${r.clientX-o.left}px`,n.style.top=`${r.clientY-o.top}px`}),a.addEventListener("mouseleave",s)}),e.addEventListener("mouseleave",s)}const Ot=["#ef4444","#7c3aed","#eab308","#3b82f6","#f97316","#4338ca","#facc15"],ol="#5b9fd4";function Da(t){const e=t.replace("#","");return{r:parseInt(e.slice(0,2),16),g:parseInt(e.slice(2,4),16),b:parseInt(e.slice(4,6),16)}}function cl(t,e,n){const s=a=>Math.max(0,Math.min(255,Math.round(a))).toString(16).padStart(2,"0");return`#${s(t)}${s(e)}${s(n)}`}function Kn(t,e,n){const s=Da(t),a=Da(e);return cl(s.r+(a.r-s.r)*n,s.g+(a.g-s.g)*n,s.b+(a.b-s.b)*n)}function il(t){const e=Ot;if(t<=0)return e[0];if(t>=e.length-1)return e[e.length-1];const n=Math.floor(t),s=t-n;return Kn(e[n],e[n+1],s)}const ll=()=>Kn(Ot[2],Ot[3],.25),dl=()=>Kn(Ot[2],Ot[3],.75),ul=()=>Kn(Ot[2],Ot[3],.5);function Ur(t){if(t<=0)return[];if(t===1)return[0];const e=[],n=new Set;let s=0,a=t-1;for(;n.has(s)||(e.push(s),n.add(s)),!(s===a||(n.has(a)||(e.push(a),n.add(a)),n.size>=t));){const r=s+2,o=a-2;if(r>o)break;s=r,a=o}for(s=0,a=t-1;s<=a;)n.has(s)||(e.push(s),n.add(s)),s!==a&&!n.has(a)&&(e.push(a),n.add(a)),s+=1,a-=1;return e}function ml(t){const e=Ot;if(t<=0)return[];if(t===1)return[e[0]];if(t===2)return[e[0],e[1]];if(t<=e.length)return e.slice(0,t);const n=Ur(t),s=new Array(t).fill(null),a=new Array(t).fill(null);s[n[0]]=e[0],a[n[0]]=0,s[n[1]]=e[1],a[n[1]]=1,t%2===0?(s[n[n.length-2]]=ll(),a[n[n.length-2]]=2.25,s[n[n.length-1]]=dl(),a[n[n.length-1]]=2.75):(s[n[n.length-1]]=ul(),a[n[n.length-1]]=2.5);const r=[];for(let o=0;o<t;o+=1)a[o]!=null&&r.push(o);for(let o=0;o<r.length-1;o+=1){const c=r[o],l=r[o+1],i=a[c],d=a[l],u=l-c-1;for(let f=1;f<=u;f+=1){const p=c+f,g=f/(u+1),m=i+(d-i)*g;s[p]=il(m)}}return s}function fl(t,e){const n=ml(e);return n[t]??n[n.length-1]??Ot[0]}function pl(t,e){for(const n of Ur(e))if(!t.has(n))return n;return 0}function ht(){return new Map}function Pa(t,e,n){const s=String(e);if(t.has(s))return t.delete(s),!1;const a=new Set(t.values());return t.set(s,pl(a,n)),!0}function bn(t,e,n){const s=t.get(String(e));return s==null?null:fl(s,n)}const $n={1:"#e6a756",2:"#5b9bd5",3:"#c75b5b",4:"#7bc96f"},os=["mine","opponents","total"],gl={mine:"Mine",opponents:"Opps",total:"Total"};function yl(t){return t.winnerSeat?Number(t.winnerSeat):t.mySeat&&t.result==="Win"?Number(t.mySeat):0}function Pt(t){const e=Number(t.mySeat)||0;return e>=1&&e<=4?e:0}function sa(t,e){return Pt(t)===e?!1:(t.opponents||[]).some(n=>Number(n.seat)===e)}function Vr(t,e){return Pt(t)===e||sa(t,e)}function Rs(t,e){if(!Vr(t,e))return null;const n=yl(t);if(n)return n===e?"win":"loss";if(Pt(t)===e){if(t.result==="Win")return"win";if(t.result==="Loss")return"loss"}return sa(t,e)&&Pt(t)&&t.result==="Win"?"loss":null}function Yr(t,e,n,s={}){const{excludeMySeat:a=!1}=s;return a&&Pt(t)===e?!1:n==="mine"?Pt(t)===e:n==="opponents"?sa(t,e):Vr(t,e)}function Ms(t,e="mine",n={}){const a=[...t].filter(r=>hl(r,e,n)).sort(K).map(r=>T(r.date)||r.date).filter(Boolean);if(!a.length){const r=new Date().toISOString().slice(0,10);return{min:r,max:r}}return{min:a[0],max:a[a.length-1]}}function hl(t,e,n={}){const{excludeMySeat:s=!1}=n;return e==="mine"?!!Pt(t):e==="opponents"?(t.opponents||[]).some(a=>{const r=Number(a.seat);return r>=1&&r<=4&&Pt(t)!==r}):s?(t.opponents||[]).some(a=>Number(a.seat)>=1&&Number(a.seat)<=4):Pt(t)?!0:(t.opponents||[]).some(a=>Number(a.seat)>=1&&Number(a.seat)<=4)}function bl(t){return`Longest Streak: ${t||0}`}function Ga(t,e="mine",n={}){const s=[1,2,3,4].map(r=>({seat:r,games:0,wins:0})),a=new Map([1,2,3,4].map(r=>[r,{running:0,longest:0}]));for(const r of[...t].sort(K))for(let o=1;o<=4;o+=1){if(!Yr(r,o,e,n))continue;const c=Rs(r,o);if(!c)continue;const l=s[o-1];l.games+=1,c==="win"&&(l.wins+=1);const i=a.get(o);c==="win"?(i.running+=1,i.longest=Math.max(i.longest,i.running)):i.running=0}return s.map(r=>{var o;return{...r,label:`Seat ${r.seat}`,winRate:W(r.wins,r.games),longestWinStreak:((o=a.get(r.seat))==null?void 0:o.longest)??0}})}function za(t,e,n,s,a="mine",r={}){const o=T(n)||n,c=T(s)||s;return[...t].sort(K).filter(l=>{if(!Yr(l,e,a,r))return!1;const i=T(l.date)||l.date;return i<o||i>c?!1:Rs(l,e)!==null}).map(l=>({date:l.date,deck:"",result:Rs(l,e)==="win"?"Win":"Loss"}))}const $l=[{id:"stats",label:"Stats"},{id:"decks",label:"Decks"},{id:"games",label:"Games"}],Jr=[{id:"overview",label:"Overview"},{id:"brackets",label:"Brackets"},{id:"colors",label:"Colors"},{id:"archetypes",label:"Archetypes"},{id:"seats",label:"Seats"},{id:"turns",label:"Turns"},{id:"trends",label:"Trends"},{id:"matchups",label:"Matchups"},{id:"totals",label:"Totals"}],kl=[{id:"active",label:"Active"},{id:"retired",label:"Retired"},{id:"all",label:"All"}];let y=null,Y="stats",E="overview",J="",le=null,Yt="players",Dn="",sn="wubrgc",an="inclusive",rn=!1,Jt=!1,Ut=!1,U="decks",Pn="",gn=!1,de=!1,Pe="",on="exact",cn="exclusive",P={kind:"all"},Wt=[],Tt=[],At="mine",Xt={start:null,end:null,customized:!1},Je="active",Nt=!1,ne=!1,Zt=null,Z=null,He=!1,kt=null,te=-1,F=null,Un="games",ue={players:{col:"normalizedMatchupImpact",dir:"desc"},decks:{col:"normalizedMatchupImpact",dir:"desc"}},ln={col:"date",dir:"desc"},Vn="overview",We={start:null,end:null,customized:!1},dn={min:1,max:null,customized:!1},oe=[],V="normWr",Te="desc",Xe="",Bt={deck:"",bracket:"",result:"",year:""},Ge="wubrgc",ze="inclusive",un="wubrgc",me="unique",dt="all",yt=new Set,Ze={start:null,end:null,customized:!1},Ct=ht(),Qe={start:null,end:null,customized:!1},rt=ht(),ae=new Map,Gt={start:null,end:null,customized:!1},fe={min:1,max:null,customized:!1},Oa=0,Fa=0,Ls="",Is="",S={"color-stats":{col:"colorOrder",dir:"asc"},"archetype-stats":{col:"label",dir:"asc"},"turn-stats":{col:"turn",dir:"asc"},"bracket-stats":{col:"bracket",dir:"asc"},"trends-windows":{col:"rangeStart",dir:"asc"},"trends-cumulative":{col:"games",dir:"asc"},"decks-main":{col:"normWr",dir:"desc"},"game-log":{col:"date",dir:"desc"},matchups:{col:"normalizedMatchupImpact",dir:"desc"},"totals-decks":{col:"normalizedWr",dir:"desc"},"totals-players":{col:"normalizedWr",dir:"desc"},"totals-colors":{col:"normalizedWr",dir:"desc"}};function vl(){J="",dt="all"}function Ke(t){vl(),t==="overview"||(t==="colors"?(Ge="wubrgc",ze="inclusive",un="wubrgc",yt=new Set,Ze={start:null,end:null,customized:!1},Ls="",S["color-stats"]={col:"colorOrder",dir:"asc"}):t==="brackets"?(le=null,Ct=ht(),Qe={start:null,end:null,customized:!1},Is="",S["bracket-stats"]={col:"bracket",dir:"asc"}):t==="trends"?(P={kind:"all"},rt=ht(),ae=new Map,Gt={start:null,end:null,customized:!1},fe={min:1,max:null,customized:!1},S["trends-windows"]={col:"rangeStart",dir:"asc"},S["trends-cumulative"]={col:"games",dir:"asc"}):t==="archetypes"?(me="unique",S["archetype-stats"]={col:"label",dir:"asc"}):t==="turns"?S["turn-stats"]={col:"turn",dir:"asc"}:t==="seats"?(Wt=[],At="mine",Xt={start:null,end:null,customized:!1}):t==="matchups"?(Yt="players",Dn="",sn="wubrgc",an="inclusive",rn=!1,Jt=!1,Ut=!1,S.matchups={col:"normalizedMatchupImpact",dir:"desc"}):t==="totals"&&(U="decks",Pn="",gn=!1,de=!1,Tt=[],Pe="",on="exact",cn="exclusive",S["totals-decks"]={col:"normalizedWr",dir:"desc"},S["totals-players"]={col:"normalizedWr",dir:"desc"},S["totals-colors"]={col:"normalizedWr",dir:"desc"},S["turn-stats"]={col:"turn",dir:"asc"}))}function ja(){Jr.forEach(t=>Ke(t.id))}function Ha(){Je="active",Xe="",V="normWr",Te="desc",ye(),S["decks-main"]={col:"normWr",dir:"desc"}}function qa(){Nt=!1,Z=null,Zt=null,Bt={deck:"",bracket:"",result:"",year:""},S["game-log"]={col:"date",dir:"desc"}}function _a(){F=null,Un="games",Vn="overview",We={start:null,end:null,customized:!1},dn={min:1,max:null,customized:!1},ue={players:{col:"normalizedMatchupImpact",dir:"desc"},decks:{col:"normalizedMatchupImpact",dir:"desc"}},ln={col:"date",dir:"desc"},Lt()}function Sl(t,e){return vt(t,e,{label:t})}function wl(t,e){return Jt&&t.opponentPlayer?vt(t.opponent,e,{label:`${t.opponentPlayer} · ${t.opponent}`,playerScope:t.opponentPlayer}):vt(t.opponent,e,{label:t.opponent})}function Cl(t,e,n=null,s=null){ne&&ye(),F={kind:t,key:e,playerScope:n,deckSlotId:s},Un="games",Vn="overview",We={start:null,end:null,customized:!1},dn={min:1,max:null,customized:!1},ue={players:{col:"normalizedMatchupImpact",dir:"desc"},decks:{col:"normalizedMatchupImpact",dir:"desc"}},ln={col:"date",dir:"desc"},Lt()}function xl(t){if(!F||!["overview","seats"].includes(t))return;Vn=t;const e=document.getElementById("entity-report-modal");e&&(e.querySelectorAll("[data-entity-hero-tab]").forEach(n=>{const s=n.dataset.entityHeroTab===t;n.classList.toggle("active",s),n.setAttribute("aria-selected",s?"true":"false")}),e.querySelectorAll("[data-entity-hero-panel]").forEach(n=>{n.hidden=n.dataset.entityHeroPanel!==t}))}function Rl(){dn={min:1,max:null,customized:!1}}function Ml(t){if(!F||!["games","decks","players"].includes(t))return;Un=t;const e=document.getElementById("entity-report-modal");e&&(e.querySelectorAll("[data-entity-report-tab]").forEach(n=>{const s=n.dataset.entityReportTab===t;n.classList.toggle("active",s),n.setAttribute("aria-selected",s?"true":"false")}),e.querySelectorAll("[data-entity-report-panel]").forEach(n=>{n.hidden=n.dataset.entityReportPanel!==t}))}function _t(){const t=eo(y.decks,dt),e=jn(no(y.games,y.decks,dt),y.decks,J),n=Ln(dt==="all"?y.decks:t,e);return{statsDecks:t,statsGames:e,filteredDeckStats:n}}function Ll(){return jn(y.games,y.decks,Pe)}function Il(t){return`<div class="turn-stats-grid">${t.map(e=>{const n=e.wins+e.losses;return`
          <div class="turn-stat-box${e.games?"":" turn-stat-box-empty"}">
            <div class="turn-stat-label">Turn ${e.turn}</div>
            <div class="turn-stat-gwl">
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">G</span><strong>${e.games}</strong></div>
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">W</span><strong>${e.wins}</strong></div>
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">L</span><strong>${e.losses}</strong></div>
            </div>
            <div class="turn-stat-wr">
              <div><span class="turn-stat-metric-label">WR</span><strong>${n?G(e.winRate):"—"}</strong></div>
              <div><span class="turn-stat-metric-label">Norm WR</span><strong>${n?G(e.normalizedWr):"—"}</strong></div>
            </div>
          </div>`}).join("")}</div>`}function El(t){return`<div class="turn-stats-grid">${t.map(e=>`
          <div class="turn-stat-box${e.games?"":" turn-stat-box-empty"}">
            <div class="turn-stat-label">Turn ${e.turn}</div>
            <div class="turn-stat-gwl turn-stat-gw">
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">G</span><strong>${e.games}</strong></div>
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">WR</span><strong>${e.games?G(e.winRate):"—"}</strong></div>
            </div>
          </div>`).join("")}</div>`}function Xr(t,e,n,{bracketFilter:s=!1,deckFilter:a=!1,extra:r=""}={}){return`
    <div class="filters inline stats-range-toolbar seat-range-filters">
      ${s?Se("stats-bracket-filter-toggle",J):""}
      ${a?Ue():""}
      ${r}
      <div class="stats-range-dates">
        <label>From <input type="date" id="${t}-range-start" min="${e.min}" max="${e.max}" value="${n.start}" /></label>
        <label>To <input type="date" id="${t}-range-end" min="${e.min}" max="${e.max}" value="${n.end}" /></label>
      </div>
    </div>`}function kn(t,e,n,s={}){return Xr(t,e,n,s)}function Ue(){return`<button type="button" class="btn btn-ghost btn-sm stats-deck-filter-toggle" id="stats-deck-filter-toggle">${_l(dt)}</button>`}function Se(t,e){return`<button type="button" class="btn btn-ghost btn-sm bracket-filter-btn ${!!e?"active":""}" id="${t}">${Lo(e)}</button>`}function cs(t){return t?` style="--series-color:${t}"`:""}function ke(t,e){return`
    <div class="chart-section">
      <div class="chart-clear-row">
        <button type="button" class="btn btn-ghost btn-sm" id="${e}">Clear Selection</button>
      </div>
      ${t}
    </div>`}async function Gn(){await Promise.all([kc(ba(y.games)),Rc([...Lc(y.games),...ba(y.games),...Cc(y.decks)])]),xc(y.decks)&&ct(y),!ne&&x()}function Wl(){const t=document.querySelector(".footer-actions");if(!t||document.getElementById("recover-btn"))return;const e=document.getElementById("reset-btn"),n=document.createElement("button");n.type="button",n.className="btn btn-ghost",n.id="recover-btn",n.textContent="Recover data",e?t.insertBefore(n,e):t.appendChild(n)}async function Tl(){sessionStorage.removeItem("edhlog-stale-reload"),y=await $o();const t=lo();Wl(),Al(),Zr(),x(),setTimeout(()=>{Gn()},0),Ai({deck:()=>{ye(),x()},game:()=>{Z=null,Nt=!1,x()},gameDetail:()=>{Zt=null,x()},entityReport:()=>{F=null,Lt()},recovery:Ae}),t&&(t.removed>0?D(`Removed ${t.removed} duplicate games — now at ${t.games+t.keptLocal} total`):t.keptLocal>0?D(`Synced ${t.games} games from spreadsheet (${t.keptLocal} local-only kept)`):D(`Synced ${t.games} games from spreadsheet`))}function Al(){var t;Ti(),document.addEventListener("click",e=>{const n=e.target.closest("[data-entity-report]");if(n){Cl(n.dataset.entityReport,n.dataset.entityKey,n.dataset.entityPlayerScope||null,n.dataset.entityDeckSlot||null);return}const s=e.target.closest("[data-entity-report-tab]");if(s&&F){Ml(s.dataset.entityReportTab);return}const a=e.target.closest("[data-entity-hero-tab]");if(a&&F){xl(a.dataset.entityHeroTab);return}}),document.getElementById("nav").addEventListener("click",e=>{const n=e.target.closest("[data-view]");if(!n)return;const s=Y;Y=n.dataset.view,s==="stats"&&Y!=="stats"&&ja(),s==="decks"&&Y!=="decks"&&Ha(),s==="games"&&Y!=="games"&&qa(),Y==="stats"&&(E="overview",ja()),Y==="decks"&&Ha(),Y==="games"&&qa(),Y!=="decks"&&ye(),_a(),Zr(),x()}),document.getElementById("main").addEventListener("input",e=>{var n,s,a,r,o,c,l,i,d,u;e.target.id==="matchup-search"?(Dn=e.target.value,x()):e.target.id==="totals-search"?(Pn=e.target.value,x()):e.target.id==="seats-range-start"||e.target.id==="seats-range-end"?(Xt.customized=!0,Xt.start=((n=document.getElementById("seats-range-start"))==null?void 0:n.value)||null,Xt.end=((s=document.getElementById("seats-range-end"))==null?void 0:s.value)||null,x()):e.target.id==="colors-range-start"||e.target.id==="colors-range-end"?(Ze.customized=!0,Ze.start=((a=document.getElementById("colors-range-start"))==null?void 0:a.value)||null,Ze.end=((r=document.getElementById("colors-range-end"))==null?void 0:r.value)||null,x()):e.target.id==="brackets-range-start"||e.target.id==="brackets-range-end"?(Qe.customized=!0,Qe.start=((o=document.getElementById("brackets-range-start"))==null?void 0:o.value)||null,Qe.end=((c=document.getElementById("brackets-range-end"))==null?void 0:c.value)||null,x()):e.target.id==="trends-range-start"||e.target.id==="trends-range-end"?(Gt.customized=!0,Gt.start=((l=document.getElementById("trends-range-start"))==null?void 0:l.value)||null,Gt.end=((i=document.getElementById("trends-range-end"))==null?void 0:i.value)||null,Ht(),x()):(e.target.id==="entity-report-range-start"||e.target.id==="entity-report-range-end")&&(We.customized=!0,We.start=((d=document.getElementById("entity-report-range-start"))==null?void 0:d.value)||null,We.end=((u=document.getElementById("entity-report-range-end"))==null?void 0:u.value)||null,Rl(),Lt())}),document.getElementById("main").addEventListener("click",e=>{var k,M;const n=e.target.closest("[data-sort-table]");if(n){const C=n.getAttribute("data-sort-table"),L=n.getAttribute("data-sort-col");S[C]=Sn(S[C],L),C==="decks-main"&&(V=L,Te=S[C].dir,L==="lastPlayed"?V="recent":L==="createdAt"&&(V="newest")),x();return}if(e.target.id==="stats-deck-filter-toggle"){dt=dt==="all"?"active":dt==="active"?"retired":"all",E==="colors"&&(yt=new Set),E==="brackets"&&(Ct=ht()),E==="trends"&&Ht(),x();return}if(e.target.id==="matchup-combine-decks"){Ut=e.target.checked,x();return}if(e.target.id==="matchup-split-partners"){rn=e.target.checked,x();return}if(e.target.id==="matchup-split-players"){Jt=e.target.checked,x();return}if(e.target.id==="totals-split-partners"){gn=e.target.checked,x();return}if(e.target.id==="totals-exclude-me"){de=e.target.checked,x();return}if(e.target.id==="totals-color-view-toggle"){on=ts(on),x();return}if(e.target.id==="totals-color-agg-toggle"){cn=cn==="inclusive"?"exclusive":"inclusive",x();return}if(e.target.id==="matchup-color-view-toggle"){sn=ts(sn),x();return}if(e.target.id==="matchup-color-agg-toggle"){an=an==="inclusive"?"exclusive":"inclusive",x();return}if(e.target.id==="color-order-toggle"){un=un==="wubrgc"?"cgrbuw":"wubrgc",S["color-stats"]={col:"colorOrder",dir:"asc"},x();return}if(e.target.id==="color-view-toggle"){Ge=ts(Ge),yt=new Set,x();return}if(e.target.id==="color-agg-toggle"){ze=ze==="inclusive"?"exclusive":"inclusive",yt=new Set,x();return}if(e.target.id==="archetype-view-toggle"){me=Zi(me),x();return}if(e.target.id==="overview-bracket-filter-toggle"||e.target.id==="stats-bracket-filter-toggle"){J=ca(J),E==="brackets"&&(Ct=ht(),le=J?"filter":null),E==="colors"&&(yt=new Set),E==="trends"&&Ht(),x();return}if(e.target.id==="totals-bracket-filter-toggle"){Pe=ca(Pe),x();return}const s=e.target.closest("[data-trends-cumulative]");if(s){rt=ht(),ae=new Map,qe(),Ht(),P={kind:"cumulative",rangeEnd:Number(s.dataset.rangeEnd)},x();return}const a=e.target.closest("[data-trends-year]");if(a){rt=ht(),ae=new Map,qe(),Ht(),P={kind:"year",year:a.dataset.trendsYear},x();return}if(e.target.closest("[data-trends-all]")){rt=ht(),ae=new Map,qe(),Ht(),P={kind:"all"},x();return}const o=e.target.closest("[data-matchup-tab]");if(o){const C=o.getAttribute("data-matchup-tab");C!==Yt&&Ke("matchups"),Yt=C,x();return}const c=e.target.closest("[data-totals-tab]");if(c){const C=c.getAttribute("data-totals-tab");C!==U&&Ke("totals"),U=C,x();return}const l=e.target.closest("[data-stats-tab]");if(l){const C=l.getAttribute("data-stats-tab");C!==E&&(Ke(E),Ke(C),_a()),E=C,x();return}if(e.target.id==="clear-colors-chart"){yt=new Set,x();return}if(e.target.id==="clear-brackets-chart"){Ct=ht(),le=null,x();return}if(e.target.id==="clear-trends-chart"){rt=ht(),ae=new Map,qe(),Ht(),x();return}if(e.target.id==="clear-seats-chart"){Wt=[],x();return}if(e.target.id==="clear-totals-seats-chart"){Tt=[],x();return}const i=e.target.closest("[data-color-chart-row]");if(i&&E==="colors"){const C=i.dataset.colorChartRow;yt.has(C)?yt.delete(C):yt.add(C),x();return}const d=e.target.closest("[data-bracket-chart-row]");if(d&&E==="brackets"){const C=Number(d.dataset.bracketChartRow),L=String(C),_=Oe().bracketStats.filter(A=>A.games>0).length;J="",le="table",Pa(Ct,L,_),Ct.size||(le=null),x();return}const u=e.target.closest("[data-trends-window-toggle]");if(u){const C=Number(u.dataset.rangeStart),L=Number(u.dataset.rangeEnd),_=`${C}-${L}`,A=Oe().rolling.windows.length;P={kind:"all"},qe(),Ht(),rt.has(_)?(rt.delete(_),ae.delete(_)):(Pa(rt,_,A),ae.set(_,{rangeStart:C,rangeEnd:L,label:u.dataset.label||`${C}-${L}`})),x();return}const f=e.target.closest("[data-seat-toggle]");if(f){const C=Number(f.dataset.seatToggle);Wt.includes(C)?Wt=Wt.filter(L=>L!==C):Wt=[...Wt,C].sort((L,_)=>L-_),x();return}const p=e.target.closest("[data-totals-seat-toggle]");if(p){const C=Number(p.dataset.totalsSeatToggle);Tt.includes(C)?Tt=Tt.filter(L=>L!==C):Tt=[...Tt,C].sort((L,_)=>L-_),x();return}if(e.target.closest("[data-seat-view-cycle]")){const C=os.indexOf(At);At=os[(C+1)%os.length],Xt={start:null,end:null,customized:!1},x();return}if(e.target.closest("#add-game-btn")){e.preventDefault(),Z=null,Zt=null,Nt=!0,x();return}if(e.target.closest("#save-game-btn")){e.preventDefault();const C=document.getElementById("add-game-form");if(!C)return;C.querySelectorAll('[name="result"]').forEach(L=>{L.disabled=!1}),Za(new FormData(C));return}if(e.target.closest("#save-deck-btn")){e.preventDefault();const C=document.getElementById("deck-form");C&&Ua(C);return}if(e.target.id==="delete-game-modal"){if(!Z||!confirm("Delete this game?"))return;y.games=y.games.filter(C=>C.id!==Z),Z=null,Nt=!1,ct(y),x(),D("Deleted");return}if(e.target.closest(".game-detail-step")){const C=e.target.closest(".game-detail-step");if(C.disabled||!C.dataset.id)return;Zt=C.dataset.id,x();return}const $=e.target.closest(".view-game");if($){Zt=$.dataset.id,Nt=!1,Z=null,x();return}if(e.target.id==="add-deck-btn"){kt=null,te=-1,F=null,Lt(),ne=!0,x();return}if(e.target.id==="delete-deck-modal"){const C=(M=(k=document.getElementById("deck-form"))==null?void 0:k.querySelector('[name="originalId"]'))==null?void 0:M.value,L=String(C||kt||"").trim();if(!L||!confirm("Delete this deck?"))return;const _=et(y.decks,L);_&&rr(y,_),y.decks=y.decks.filter(A=>z(A)!==L),y.games=y.games.filter(A=>A.deck!==L),((F==null?void 0:F.deckSlotId)===L||(F==null?void 0:F.key)===L)&&(F=null,Lt()),ye(),ct(y),x(),D("Deleted");return}const h=e.target.closest(".edit-deck");if(h){const C=h.dataset.name,L=et(y.decks,C);L&&Xl(L)&&ct(y),te=L?y.decks.indexOf(L):-1,kt=L?z(L):C,F=null,Lt(),ne=!0,x();return}const R=e.target.closest(".edit-game");if(R){Z=R.dataset.id,Zt=null,Nt=!0,x();return}const b=e.target.closest(".quick-win"),v=e.target.closest(".quick-loss");if(b||v){vd({deck:(b||v).dataset.deck,result:b?"Win":"Loss"});return}e.target.closest(".result-toggle.result-locked")&&(e.preventDefault(),Me())}),document.getElementById("main").addEventListener("change",e=>{var r,o,c,l,i;const{id:n,value:s,checked:a}=e.target;if(n==="deck-status")Je=s,x();else if(n==="deck-bracket")Xe=s,x();else if(n==="deck-sort"){V=s;let d=s,u=Te;s==="recent"?(d="lastPlayed",u="desc"):s==="newest"&&(d="createdAt",u="desc"),S["decks-main"]={col:d,dir:u},Te=u,x()}else if(e.target.name==="deck")aa();else if(e.target.name==="mySeat")ra(),Me();else if(e.target.name==="winnerSeat")Me();else if(e.target.name==="result"){const d=document.getElementById("add-game-form");(Number((r=d==null?void 0:d.querySelector('[name="winnerSeat"]'))==null?void 0:r.value)||0)>0&&Me()}else(n==="filter-deck"||n==="filter-bracket"||n==="filter-result"||n==="filter-year")&&(Bt={deck:((o=document.getElementById("filter-deck"))==null?void 0:o.value)||"",bracket:((c=document.getElementById("filter-bracket"))==null?void 0:c.value)||"",result:((l=document.getElementById("filter-result"))==null?void 0:l.value)||"",year:((i=document.getElementById("filter-year"))==null?void 0:i.value)||""},so())}),document.getElementById("main").addEventListener("submit",e=>{e.target.id==="add-game-form"?(e.preventDefault(),e.target.querySelectorAll('[name="result"]').forEach(n=>{n.disabled=!1}),Za(new FormData(e.target))):e.target.id==="deck-form"&&(e.preventDefault(),Ua(e.target))}),document.getElementById("export-btn").addEventListener("click",vo),(t=document.getElementById("recover-btn"))==null||t.addEventListener("click",()=>{Ul()}),document.getElementById("import-btn").addEventListener("click",()=>{document.getElementById("import-file").click()}),document.getElementById("import-file").addEventListener("change",async e=>{var s;const n=(s=e.target.files)==null?void 0:s[0];if(n){try{y=await wo(n),x(),D("Data imported")}catch{D("Import failed — check the JSON file",!0)}e.target.value=""}}),document.getElementById("reset-btn").addEventListener("click",async()=>{confirm("Delete all games, decks, and recorded players? Export a backup first if you want to keep your data.")&&(y=await ko(),x(),D("Site reset"))})}function Zr(){const t=document.getElementById("nav");t.innerHTML=$l.map(e=>`<button type="button" class="nav-btn ${e.id===Y?"active":""}" data-view="${e.id}">${e.label}</button>`).join("")}function ve(t,e,n){return`<div class="sub-tabs" role="tablist">${t.map(s=>`<button type="button" role="tab" aria-selected="${s.id===e}" class="sub-tab ${s.id===e?"active":""}" data-${n}="${s.id}">${s.label}</button>`).join("")}</div>`}function qe(){Gt={start:null,end:null,customized:!1}}function Ht(){fe={min:1,max:null,customized:!1}}function Bl(t,e){if(!e.length)return[];const n=new Set(e.map(a=>a.id)),s=[];return t.forEach((a,r)=>{n.has(a.id)&&s.push(r+1)}),s}function Nl(t,e){return rt.size&&(e!=null&&e.length)?e.filter(n=>rt.has(`${n.rangeStart}-${n.rangeEnd}`)).flatMap(n=>t.slice(n.rangeStart-1,n.rangeEnd)):Gl(t)}function Qr(t,e){const n=[...t].sort(K),s=n.length;let a=Nl(n,e);const r=_n(a.length?a:n);if(Gt.customized){const p=De(a.length?a:n,Gt);a=Er(a,p)}const o=Bl(n,a),c=o.length?Math.min(...o):1,l=o.length?Math.max(...o):Math.max(1,s),i=Dl(c,l),d=Pl(n,i),u=d.length?d:a.length?a:n,f=De(u,Gt);return{sorted:n,poolGames:a,filterBounds:r,boundsMin:c,boundsMax:l,gameRange:i,rangeGames:d,chartRange:f}}function Dl(t,e){if(t>e)return{min:e,max:e};const n=fe.customized?fe.min??t:t,s=fe.customized?fe.max??e:e;return Us(n,s,t,e)}function Pl(t,e){return[...t].sort(K).slice(e.min-1,e.max)}function Gl(t){const e=[...t].sort(K);return P.kind==="all"?e:P.kind==="window"?e.slice(P.rangeStart-1,P.rangeEnd):P.kind==="cumulative"?e.slice(0,P.rangeEnd):P.kind==="year"?e.filter(n=>mn(n.date)===P.year):e}function is(){return P.kind==="all"?"":P.kind==="window"?`Games ${P.rangeStart}–${P.rangeEnd}`:P.kind==="cumulative"?`Games 1–${P.rangeEnd}`:P.kind==="year"?P.year:""}function zl(t){return P.kind==="cumulative"&&P.rangeEnd===t.games}function Ol(t){return P.kind==="year"&&P.year===t.year}let to=[];function Fl(t){const e=Ms(t,At);if(!Xt.customized)return{start:e.min,end:e.max,bounds:e};const n=Xt.start||e.min,s=Xt.end||e.max;return{start:n<e.min?e.min:n,end:s>e.max?e.max:s,bounds:e}}function jl(t,e,n){t&&e.forEach(s=>{const a=n(s);if(!a)return;const r=o=>{t.hidden=!1,t.innerHTML=a,t.style.left=`${o.clientX+12}px`,t.style.top=`${o.clientY+12}px`};s.addEventListener("mouseenter",r),s.addEventListener("mousemove",r),s.addEventListener("mouseleave",()=>{t.hidden=!0})})}function Hl(t){return t!=null&&t.length?t.map(e=>`${N(e.player)}: ${e.games}`).join("<br>"):""}function ql(){const t=document.getElementById("matchup-deck-tip");t&&jl(t,document.querySelectorAll(".matchup-pop-trigger"),e=>{const n=to[Number(e.dataset.matchupRowIndex)];return Hl(n==null?void 0:n.opponentPlayerBreakdown)})}function _l(t){return t==="active"?"Active":t==="retired"?"Retired":"All Decks"}function eo(t,e){return e==="active"?t.filter(n=>!n.retired):e==="retired"?t.filter(n=>n.retired):t}function no(t,e,n){if(n==="all")return t;const s=it(e);return t.filter(a=>{var o;const r=((o=s.get(a.deck))==null?void 0:o.retired)??!1;return n==="retired"?r:!r})}function Oe(){const t=Ln(y.decks,y.games),e=eo(y.decks,dt),n=jn(no(y.games,y.decks,dt),y.decks,J),s=Ln(dt==="all"?y.decks:e,n).map(r=>({...r,colors:pn(r)})),a=ur(n);return{deckStats:t,overview:a,colorStats:Qo(s,{view:Ge,agg:ze,sortOrder:un,bracketFilter:J}),bracketStats:Io(n,s),yearStats:Eo(n),rolling:Wo(n),matchups:Ac(n,{splitPartners:rn,splitPlayers:Jt,combineDecks:Ut,colorOptions:{decks:y.decks,deckFilter:dt,bracketFilter:J,view:sn,agg:an}}),totals:Vi(y.games,y.decks,{splitPartners:gn,excludeMyPlayer:de,view:on,agg:cn,bracketFilter:Pe})}}function Kl(t){if(!F)return;const e=t.target.closest("th[data-sort-col]");if(!e)return;const n=e.getAttribute("data-sort-table"),s=e.getAttribute("data-sort-col");if(!(!n||!s)){if(n==="entity-games")ln=Sn(ln,s);else if(n==="entity-matchups-players")ue.players=Sn(ue.players,s);else if(n==="entity-matchups-decks")ue.decks=Sn(ue.decks,s);else return;Lt()}}function Ae(){var t;(t=document.getElementById("recovery-modal"))==null||t.remove()}async function Ul(){Ae(),oe=await Hr(),Es()}function Es(){Ae();const t=document.createElement("div");t.innerHTML=qi(oe,{currentGames:y.games.length,currentDecks:y.decks.length,origin:window.location.origin+window.location.pathname});const e=t.firstElementChild;e&&(document.body.appendChild(e),Vl(e))}function Vl(t){var e,n,s;(e=t.querySelector("#recovery-close-btn"))==null||e.addEventListener("click",Ae),(n=t.querySelector("#recovery-rescan-btn"))==null||n.addEventListener("click",async()=>{oe=await Hr(),Es(),D("Scan complete")}),(s=t.querySelector("#recovery-file-input"))==null||s.addEventListener("change",async a=>{const r=[...a.target.files||[]];r.length&&(oe=[...oe,...await Hi(r)],Es(),a.target.value="")}),t.querySelectorAll("[data-recovery-merge]").forEach(a=>{a.addEventListener("click",()=>{const r=Wa(oe,a.getAttribute("data-recovery-merge"));if(!(r!=null&&r.data))return;const{merged:o,missingGames:c,missingDecks:l}=Oi(y,r.data);if(!c.length&&!l.length){D("Nothing new to merge from that snapshot");return}if(!ct(o)){D("Recovery merge failed — storage may be full",!0);return}y=o,Ae(),x(),D(`Recovered ${c.length} games and ${l.length} decks`)})}),t.querySelectorAll("[data-recovery-replace]").forEach(a=>{a.addEventListener("click",()=>{var o,c;const r=Wa(oe,a.getAttribute("data-recovery-replace"));if(r!=null&&r.data&&confirm(`Replace all current data with this snapshot (${((o=r.stats)==null?void 0:o.games)||0} games, ${((c=r.stats)==null?void 0:c.decks)||0} decks)? Export a backup first if you are unsure.`)){if(!ct(r.data)){D("Recovery replace failed — storage may be full",!0);return}y=r.data,Ae(),x(),D("Data restored from snapshot")}})})}function Lt(){let t=document.getElementById("entity-report-modal");if(!F||ne){t==null||t.remove();return}const e=ci(y.games,y.decks,{kind:F.kind,key:F.key,playerScope:F.playerScope,deckSlotId:F.deckSlotId,splitPartners:gn}),n=Or(e.chartGames,We,dn);t||(t=document.createElement("div"),t.id="entity-report-modal",t.className="modal",t.addEventListener("click",Kl),document.body.appendChild(t)),t.classList.remove("hidden");const s=t.querySelector(".modal-content-report"),a=(s==null?void 0:s.scrollTop)??0;t.innerHTML=vi(e,y.decks,Un,ue,ln,{heroTab:Vn,chartContext:n});const r=t.querySelector(".modal-content-report");r&&a>0&&(r.scrollTop=a),Pr(),Nr(n.boundsMin,n.boundsMax,({min:o,max:c})=>{dn={min:o,max:c,customized:!0},Lt()},"entity-report"),wi(t),fc(e.title)}function Yl(){return te>=0&&y.decks[te]?y.decks[te]:kt?y.decks.find(t=>z(t)===kt)||et(y.decks,kt):null}function Jl(t){if(!t)return-1;const e=y.decks.findIndex(s=>z(s)===t);if(e>=0)return e;const n=et(y.decks,t);return n?y.decks.indexOf(n):-1}function Xl(t){return t.id?!1:(t.id=ls(y),!0)}function Zl(t){return{commander:O(t),name:String(t.name||""),bracket:t.bracket??4,colors:[...t.colors||[]],changedAt:ee()}}function Ql(t,e){const n=H(O(t)).canonicalName,s=H(e.commander).canonicalName;return n!==s}function td(t,e,n=-1){const s=H(e).canonicalName;return t.filter((a,r)=>r!==n&&H(O(a)).canonicalName===s)}function Ka(t,e,n,s=-1){const a=td(t,e,s);if(!a.length)return null;const r=String(n||"").trim();if(!r)return"Give this deck a name — another deck already uses this commander";const o=r.toLowerCase();return a.some(c=>String(c.name||"").trim().toLowerCase()===o)?"Another deck with this commander already uses that name":null}function ed(t){const e=z(t);if(!e)return!1;let n=!1;for(const s of y.games){if(s.deck!==e)continue;const a=As(t,s.date);a&&s.myCommander!==a&&(s.myCommander=a,n=!0)}return n}function ye(){ne=!1,kt=null,te=-1}function Ua(t=null){const e=t||document.getElementById("deck-form");if(!e){D("Could not save deck — form missing",!0);return}const n=new FormData(e),s=String(n.get("commander")||"").trim();if(!s){D("Commander is required",!0);return}let a=n.getAll("color");a.length||(a=qn(s));const r={name:String(n.get("name")||"").trim(),commander:s,bracket:Number(n.get("bracket"))||4,colors:a,archetypes:Ri(n.get("archetypes")),retired:n.get("retired")==="on",createdAt:T(String(n.get("createdAt")||""))||ee()},o=String(n.get("originalId")||"").trim(),c=te>=0?te:o?y.decks.findIndex(i=>z(i)===o):kt?Jl(kt):-1;if(c>=0){const i=y.decks[c];if(!i){D("Deck not found",!0);return}const d=z(i)||o||ls(y),u=Ka(y.decks,s,r.name,c);if(u){D(u,!0);return}const f=[...i.history||[]],p=Ql(i,r);if(p&&(f.push(Zl(i)),sr(y,d,O(i))),y.decks[c]={...i,...r,id:d,history:f,createdAt:r.createdAt||i.createdAt||ee()},p&&ed(y.decks[c]),!ct(y)){D("Failed to save deck — storage may be full",!0);return}ye(),D("Deck saved"),x(),Gn();return}const l=Ka(y.decks,s,r.name);if(l){D(l,!0);return}if(y.decks.push({...r,id:ls(y),history:[]}),!ct(y)){y.decks.pop(),D("Failed to add deck — storage may be full",!0);return}ye(),D(`Added ${B(r)}`),x(),Gn()}function x(){var r,o;const t=((r=document.activeElement)==null?void 0:r.id)==="matchup-search",e=t?document.activeElement.selectionStart:null,n=((o=document.activeElement)==null?void 0:o.id)==="totals-search",s=n?document.activeElement.selectionStart:null,a=document.getElementById("main");if(Y==="stats"?a.innerHTML=rd():Y==="decks"?a.innerHTML=od():a.innerHTML=cd(),Y==="games"&&so(),Uo(),Y==="stats"&&(E==="trends"||E==="seats"||E==="colors"||E==="brackets"||E==="totals"&&U==="seats")&&(Pr(),E==="trends")){const{statsGames:c}=_t(),{boundsMin:l,boundsMax:i}=Qr(c,Oe().rolling.windows);Nr(l,i,({min:d,max:u})=>{fe={min:d,max:u,customized:!0},x()})}if(Y==="stats"&&(E==="turns"||E==="totals"&&U==="turns")&&rl(),Y==="stats"&&E==="matchups"&&Yt==="decks"&&ql(),Nt){ra(),Me(),aa();const c=Z?y.decks:y.decks.filter(l=>!l.retired);ic(document.getElementById("add-game-form"),y.games,c)}if(Lt(),t){const c=document.getElementById("matchup-search");c&&(c.focus(),e!=null&&c.setSelectionRange(e,e))}if(n){const c=document.getElementById("totals-search");c&&(c.focus(),s!=null&&c.setSelectionRange(s,s))}if(Y==="decks"&&ne){Ei(document.getElementById("deck-form"),y.decks);const c=document.querySelector('#deck-form input[name="name"]');c==null||c.focus(),kt&&(c==null||c.select())}}function so(){const{deck:t,bracket:e,result:n,year:s}=Bt,a=document.getElementById("filter-count");if(!a)return;let r=0;document.querySelectorAll("#game-log-table tbody tr").forEach(o=>{const c=(!t||o.dataset.deck===t)&&(!e||o.dataset.bracket===e)&&(!n||o.dataset.result===n)&&(!s||o.dataset.year===s);o.hidden=!c,c&&r++}),a.textContent=`${r} games`}function Re(t,e,n=!1){const s=n?G(e):`<span class="stat-value">${e}</span>`;return`<div class="stat-card"><span class="stat-label">${t}</span>${s}</div>`}function vn(t,e=""){const n=Ir(t),s=e?` title="${N(e)}"`:"";return`<span class="impact-cell ${n}"${s}>${Lr(t)}</span>`}function nd(t,e=Ts){if(!t.length)return"";const n=["1st","2nd","3rd"];return`<div class="podium">${t.map((s,a)=>`
      <div class="podium-slot podium-${a+1}">
        <span class="podium-rank">${n[a]}</span>
        <strong class="podium-name">${vt(O(s),y.decks,{label:e(s),playerScope:lt,deckSlotId:z(s)})}</strong>
        <span class="podium-meta">${s.wins}W · ${s.games}G · ${pe(s.normalizedWr)} norm</span>
      </div>`).join("")}</div>`}function sd(t){const e=t.avgTurnWin!=null?t.avgTurnWin.toFixed(1):"—",n=t.avgTurnLoss!=null?t.avgTurnLoss.toFixed(1):"—";return`
      <div class="stat-grid stat-grid-compact">
        ${Re("Avg Turn (Win)",e)}
        ${Re("Avg Turn (Loss)",n)}
      </div>`}function ad(t){return t.filter(e=>e.value>0).map(e=>`${e.value}:${e.key??""}:${e.bracket??""}:${(e.colors||[]).join("")}`).sort().join("|")}function Va(t,e){const n=ad(t);if(e==="colors"){const a=n!==Ls;return a&&(Ls=n,Oa+=1),{key:Oa,animate:a}}const s=n!==Is;return s&&(Is=n,Fa+=1),{key:Fa,animate:s}}function rd(){var n,s;const t=Oe();let e="";if(E==="overview"){const{statsDecks:a,statsGames:r}=_t(),o=dt==="all"?y.decks:a,c=Mo(r,o,J);e=`
      <div class="filters inline overview-toolbar">
        ${Ue()}
        ${Se("overview-bracket-filter-toggle",J)}
      </div>
      <div class="stat-grid">
        ${Re("Games",c.overview.games)}
        ${Re("Wins",c.overview.wins)}
        ${Re("Losses",c.overview.losses)}
        ${Re("Win Rate",c.overview.winRate,!0)}
      </div>
      ${sd(c)}
      <h3 class="section-sub">Top Decks</h3>
      ${nd(c.podium,B)}
      `}else if(E==="colors"){const{statsDecks:a,statsGames:r}=_t(),o=((n=S["color-stats"])==null?void 0:n.col)||"colorOrder",c=st(t.colorStats,S["color-stats"],{colorOrder:m=>m.colorOrder,name:m=>m.name,decks:m=>m.decks,games:m=>m.games,wins:m=>m.wins,winRate:m=>m.winRate},wt),l=ua(c,o,m=>({colors:m.displayColors,color:m.key!=="C"&&m.displayColors.length===1?m.displayColors[0]:void 0,key:m.key})),i=Et(c,"games"),d=Et(c,"wins"),u=Et(c,"decks"),f=De(r,Ze),p=je(c.map((m,$)=>({c:m,index:$})).filter(({c:m})=>yt.has(m.key)).map(({c:m,index:$})=>({id:m.key,label:m.key==="C"?"Colorless":m.key,color:ms(la(m),$),series:qt(Bc(r,a,m.key,Ge==="exact"?"exclusive":ze,f.start,f.end))})),f),g=Va(l,"colors");e=`
      ${Xr("colors",f.bounds,f,{bracketFilter:!0,deckFilter:!0,extra:`
        <button type="button" class="btn btn-ghost btn-sm" id="color-view-toggle">${Qn(Ge)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="color-agg-toggle">${ze==="inclusive"?"Inclusive":"Exclusive"}</button>`})}
      <div class="chart-table-row">
        <div class="chart-table-grow">
          <table class="table compact sortable-table">
            <thead><tr>
              <th class="sortable col-color-order" id="color-order-toggle">${tc(un)}</th>
              ${w("color-stats","decks","Decks",S["color-stats"])}
              ${w("color-stats","games","G",S["color-stats"])}
              ${w("color-stats","wins","W",S["color-stats"])}
              ${w("color-stats","winRate","WR",S["color-stats"])}
            </tr></thead>
            <tbody>
              ${c.map((m,$)=>{const h=yt.has(m.key)?ms(la(m),$):null;return`
                <tr class="chart-series-selectable${h?" active":""}" data-color-chart-row="${m.key}"${cs(h)}>
                  <td><span class="color-label">${Kt(m.displayColors)}</span></td>
                  <td>${m.key==="C"?m.decks:It(m.decks,u)}</td>
                  <td>${m.key==="C"?m.games:It(m.games,i)}</td>
                  <td>${m.key==="C"?m.wins:It(m.wins,d)}</td>
                  <td>${m.games?G(m.winRate):"—"}</td>
                </tr>`}).join("")}
            </tbody>
          </table>
        </div>
        ${da(l,g.key,{animate:g.animate})}
      </div>
      ${ke(p,"clear-colors-chart")}`}else if(E==="brackets"){const{statsDecks:a,statsGames:r}=_t(),o=((s=S["bracket-stats"])==null?void 0:s.col)||"bracket",c=st(t.bracketStats.filter(p=>p.games>0),S["bracket-stats"],{bracket:p=>p.bracket,games:p=>p.games,wins:p=>p.wins,winRate:p=>p.winRate},wt),l=ua(c,o,p=>({bracket:p.bracket})),i=De(r,Qe),d=Va(l,"brackets");let u=[];if(le==="filter"&&J){const p=c.find(g=>String(g.bracket)===J);p&&(u=[{id:p.bracket,label:`Bracket ${p.bracket}`,color:ol,series:qt(va(r,a,p.bracket,i.start,i.end))}])}else le==="table"&&Ct.size&&(u=c.filter(p=>Ct.has(String(p.bracket))).map(p=>({id:p.bracket,label:`Bracket ${p.bracket}`,color:bn(Ct,p.bracket,c.length),series:qt(va(r,a,p.bracket,i.start,i.end))})));const f=je(u,i);e=`
      ${kn("brackets",i.bounds,i,{deckFilter:!0})}
      <div class="chart-table-row">
        <div class="chart-table-grow">
          <table class="table compact sortable-table">
            <thead><tr>
              ${w("bracket-stats","bracket","Brkt",S["bracket-stats"])}
              ${w("bracket-stats","games","G",S["bracket-stats"])}
              ${w("bracket-stats","wins","W",S["bracket-stats"])}
              ${w("bracket-stats","winRate","WR",S["bracket-stats"])}
            </tr></thead>
            <tbody>
              ${c.map(p=>{const g=bn(Ct,p.bracket,c.length);return`
                <tr class="chart-series-selectable${g?" active":""}" data-bracket-chart-row="${p.bracket}"${cs(g)}>
                  <td><span class="bracket-pill" style="background:${zs(p.bracket)}">${p.bracket}</span></td><td>${p.games}</td><td>${p.wins}</td>
                  <td>${G(p.winRate)}</td>
                </tr>`}).join("")}
            </tbody>
          </table>
        </div>
        ${da(l,d.key,{animate:d.animate})}
      </div>
      ${ke(f,"clear-brackets-chart")}`}else if(E==="trends"){const{statsGames:a}=_t(),r=t.rolling.windows.length?st(t.rolling.windows,S["trends-windows"],{label:b=>b.label,rangeStart:b=>b.rangeStart,games:b=>b.games,winRate:b=>b.winRate}):[],{filterBounds:o,boundsMin:c,boundsMax:l,gameRange:i,rangeGames:d,chartRange:u}=Qr(a,r),f=d.filter(b=>b.result==="Win").length,p=d.length?W(f,d.length):null,g=Fc({title:is(),winRate:p,gameCount:d.length,min:i.min,max:i.max,boundsMin:c,boundsMax:l}),m=Er(a,u);let $="current";if(P.kind!=="all")$="hidden";else{const b=_n(a).max;Gt.customized&&u.end<b&&($="at-end")}const h=Uc(_c(m),{streakMode:$});let R="";if(rt.size&&r.length){const b=new Set(d.map(v=>v.id));R=je(r.filter(v=>rt.has(`${v.rangeStart}-${v.rangeEnd}`)).map(v=>{const k=`${v.rangeStart}-${v.rangeEnd}`,M=Nc(a,v.rangeStart,v.rangeEnd).filter(C=>b.has(C.id));return{id:k,label:v.label,color:bn(rt,k,r.length),series:qt(M)}}),u,is(),g)}else R=Dr(qt(d),is(),u,g);if(!t.rolling.windows.length)e=`${kn("trends",o,u,{bracketFilter:!0,deckFilter:!0})}${h}${ke(R,"clear-trends-chart")}`;else{const b=r,v=st(t.rolling.cumulative,S["trends-cumulative"],{label:k=>k.label,games:k=>k.games,winRate:k=>k.winRate});e=`
        ${kn("trends",o,u,{bracketFilter:!0,deckFilter:!0})}
        ${h}
        <h3 class="section-sub">By Year</h3>
        <div class="year-row">
          <button type="button" class="year-chip trends-selectable ${P.kind==="all"?"active":""}" data-trends-all>
            <strong>All Time</strong>
            <span>${t.overview.games}g · ${t.overview.wins}w · ${G(t.overview.winRate)}</span>
          </button>
          ${t.yearStats.map(k=>`
            <button type="button" class="year-chip trends-selectable ${Ol(k)?"active":""}"
              data-trends-year="${k.year}">
              <strong>${k.year}</strong>
              <span>${k.games}g · ${k.wins}w · ${G(k.winRate)}</span>
            </button>`).join("")}
        </div>
        ${ke(R,"clear-trends-chart")}
        <div class="two-col">
          <div>
            <h3 class="section-sub">Per 100 Games</h3>
            <table class="table compact sortable-table trends-table">
              <thead><tr>
                ${w("trends-windows","rangeStart","Games",S["trends-windows"])}
                ${w("trends-windows","winRate","WR",S["trends-windows"])}
              </tr></thead>
              <tbody>
                ${b.map(k=>{const M=`${k.rangeStart}-${k.rangeEnd}`,C=bn(rt,M,b.length);return`
                  <tr class="chart-series-selectable trends-selectable${C?" active":""}"
                    data-trends-window-toggle data-label="${N(k.label)}"
                    data-range-start="${k.rangeStart}" data-range-end="${k.rangeEnd}"${cs(C)}>
                    <td>${k.label}</td>
                    <td>${G(k.winRate)}</td>
                  </tr>`}).join("")}
              </tbody>
            </table>
          </div>
          <div>
            <h3 class="section-sub">Cumulative</h3>
            <table class="table compact sortable-table trends-table">
              <thead><tr>
                ${w("trends-cumulative","games","Games",S["trends-cumulative"])}
                ${w("trends-cumulative","winRate","WR",S["trends-cumulative"])}
              </tr></thead>
              <tbody>
                ${v.map(k=>`
                  <tr class="trends-selectable ${zl(k)?"active":""}"
                    data-trends-cumulative data-range-end="${k.games}">
                    <td>${k.label}</td>
                    <td>${G(k.winRate)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>`}}else if(E==="archetypes"){const{statsGames:a}=_t(),r=st(Aa(a,y.decks,{view:me}),S["archetype-stats"],{label:i=>i.label,decks:i=>i.decks,games:i=>i.games,wins:i=>i.wins,winRate:i=>i.winRate,normalizedWr:i=>i.normalizedWr},wt),o=Et(r,"games"),c=Et(r,"wins"),l=Et(r,"decks");e=`
      <div class="filters inline archetype-toolbar">
        ${Ue()}
        ${Se("stats-bracket-filter-toggle",J)}
        <button type="button" class="btn btn-ghost btn-sm" id="archetype-view-toggle">${Ta(me)}</button>
      </div>
      <table class="table compact sortable-table">
        <thead><tr>
          ${w("archetype-stats","label","Archetype",S["archetype-stats"])}
          ${w("archetype-stats","decks","Decks",S["archetype-stats"])}
          ${w("archetype-stats","games","G",S["archetype-stats"])}
          ${w("archetype-stats","wins","W",S["archetype-stats"])}
          ${w("archetype-stats","winRate","WR",S["archetype-stats"])}
          ${w("archetype-stats","normalizedWr","Norm WR",S["archetype-stats"])}
        </tr></thead>
        <tbody>
          ${r.length?r.map(i=>`
            <tr>
              <td>${N(i.label)}</td>
              <td>${It(i.decks,l)}</td>
              <td>${It(i.games,o)}</td>
              <td>${It(i.wins,c)}</td>
              <td>${i.games?G(i.winRate):"—"}</td>
              <td>${i.games?G(i.normalizedWr):"—"}</td>
            </tr>`).join(""):'<tr><td colspan="6">No archetype data yet — add archetypes to your decks.</td></tr>'}
        </tbody>
      </table>`}else if(E==="turns"){const{statsGames:a}=_t(),r=el(a),o=st(r,S["turn-stats"],{turn:l=>l.turn,games:l=>l.games,wins:l=>l.wins,losses:l=>l.losses,winRate:l=>l.winRate??-1,normalizedWr:l=>l.normalizedWr??-1},wt),c=Na(r);e=`
      <div class="filters inline turns-toolbar">
        ${Ue()}
        ${Se("stats-bracket-filter-toggle",J)}
      </div>
      <table class="table compact sortable-table turn-stats-sort">
        <thead><tr>
          ${w("turn-stats","turn","Turn",S["turn-stats"])}
          ${w("turn-stats","games","Games",S["turn-stats"])}
          ${w("turn-stats","wins","Wins",S["turn-stats"])}
          ${w("turn-stats","losses","Losses",S["turn-stats"])}
          ${w("turn-stats","winRate","WR",S["turn-stats"])}
          ${w("turn-stats","normalizedWr","Norm WR",S["turn-stats"])}
        </tr></thead>
      </table>
      ${r.length?`${Il(o)}
          ${c}`:'<p class="muted">No turn data yet — add an end turn when logging games.</p>'}`}else if(E==="seats"){const{statsGames:a}=_t(),r=Ms(a,At),o=Fl(a),c=Ga(a,At),l=je(Wt.map(i=>({id:i,label:`Seat ${i}`,color:$n[i],series:qt(za(a,i,o.start,o.end,At))})),o);e=`
      ${kn("seats",r,o,{bracketFilter:!0,deckFilter:!0})}
      <div class="seat-toggle-row">
        <button type="button" class="seat-toggle seat-view-toggle" data-seat-view-cycle title="Cycle seat perspective">
          <strong>${gl[At]}</strong>
        </button>
        ${c.map(i=>`
          <button type="button" class="seat-toggle ${Wt.includes(i.seat)?"active":""}"
            data-seat-toggle="${i.seat}" style="--seat-color:${$n[i.seat]}">
            <div class="seat-toggle-header">
              <strong>${i.label}</strong>
              ${At==="mine"?`<em class="seat-longest-streak">${bl(i.longestWinStreak)}</em>`:""}
            </div>
            <span>${i.games}G · ${i.wins}W · ${i.games?G(i.winRate):"—"}</span>
          </button>`).join("")}
      </div>
      ${ke(l,"clear-seats-chart")}`}else if(E==="matchups"){const a=Yt==="decks",r=Yt==="colors",o=Dn.trim().toLowerCase(),i=st(t.matchups[Yt]||[],S.matchups,{subject:m=>m.subject,opponent:m=>m.opponent,games:m=>m.games,wins:m=>m.wins,opponentCount:m=>m.opponentCount??0,winRate:m=>m.winRate,matchupImpact:m=>m.matchupImpact,normalizedMatchupImpact:m=>m.normalizedMatchupImpact,opponentMatchupImpact:m=>m.opponentMatchupImpact,opponentNormalizedMatchupImpact:m=>m.opponentNormalizedMatchupImpact,outcomeTieRank:m=>m.sharedLosses-m.losses},{...wt,matchupImpact:["outcomeTieRank","games"],normalizedMatchupImpact:["outcomeTieRank","games"],opponentMatchupImpact:"games",opponentNormalizedMatchupImpact:"games"}).map((m,$)=>({...m,rank:$+1})).filter(m=>o?a?Ut?m.opponent.toLowerCase().includes(o)||m.opponentPlayer&&m.opponentPlayer.toLowerCase().includes(o):m.opponent.toLowerCase().includes(o)||m.subject.toLowerCase().includes(o)||m.opponentPlayer&&m.opponentPlayer.toLowerCase().includes(o):r?Jo(m,o):m.opponent.toLowerCase().includes(o):!0);to=a?i:[];const d=a?Ut?"Search opponent decks":"Search my or opponent decks":r?'Search Color: "WUB"':"Search opponents",u=r?`<button type="button" class="btn btn-ghost btn-sm" id="matchup-color-view-toggle">${Qn(sn)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="matchup-color-agg-toggle">${an==="inclusive"?"Inclusive":"Exclusive"}</button>
        <label class="checkbox matchup-split-partners">
          <input type="checkbox" id="matchup-split-partners" ${rn?"checked":""} />
          Split partners
        </label>`:"",f=a?`<label class="checkbox matchup-combine-decks">
          <input type="checkbox" id="matchup-combine-decks" ${Ut?"checked":""} />
          Combine Decks
        </label>
        <label class="checkbox matchup-split-partners">
          <input type="checkbox" id="matchup-split-partners" ${rn?"checked":""} />
          Split partners
        </label>
        <label class="checkbox matchup-split-players">
          <input type="checkbox" id="matchup-split-players" ${Jt?"checked":""} />
          Split Players
        </label>`:"",p=a&&!Ut?w("matchups","subject","Deck",S.matchups):r?w("matchups","subject","My Colors",S.matchups):"",g=w("matchups","opponent",a?"Opponent Deck":r?"Opponent Colors":"Opponent",S.matchups);e=`
      ${ve(Mc,Yt,"matchup-tab")}
      <div class="filters inline matchup-filters">
        ${Se("stats-bracket-filter-toggle",J)}
        ${Ue()}
        ${u}
        ${f}
        <input type="search" id="matchup-search" class="input matchup-search" placeholder="${d}" value="${N(Dn)}" />
      </div>
      <table class="table compact sortable-table matchup-table">
        <thead><tr>
          <th class="col-rank">#</th>
          ${p}
          ${g}
          ${w("matchups","games","G",S.matchups)}
          ${w("matchups","wins","W",S.matchups)}
          ${a&&!Jt?w("matchups","opponentCount","Pop",S.matchups):""}
          ${w("matchups","winRate","WR",S.matchups)}
          ${w("matchups","matchupImpact","MI",S.matchups)}
          ${w("matchups","normalizedMatchupImpact","NMI",S.matchups)}
          ${w("matchups","opponentMatchupImpact","Opp MI",S.matchups)}
          ${w("matchups","opponentNormalizedMatchupImpact","Opp NMI",S.matchups)}
        </tr></thead>
        <tbody>
          ${i.map((m,$)=>`
            <tr>
              <td class="col-rank">${m.rank}</td>
              ${a&&!Ut?`<td class="matchup-deck-col">${Sl(m.subject,y.decks)}</td>`:r?`<td class="matchup-color-col"><span class="color-label">${Kt(m.subjectColors||[])}</span></td>`:""}
              ${a?`<td class="matchup-deck-col">${wl(m,y.decks)}</td>`:r?`<td class="matchup-color-col"><span class="color-label">${Kt(m.opponentColors||[])}</span></td>`:`<td>${ge(m.opponent)}</td>`}
              <td>${m.games}</td>
              <td>${m.wins}</td>
              ${a&&!Jt?`<td class="matchup-pop-col">${m.opponentCount?`<span class="matchup-pop-trigger has-tip" data-matchup-row-index="${$}">${m.opponentCount}</span>`:"—"}</td>`:""}
              <td>${G(m.winRate)}</td>
              <td>${vn(m.matchupImpact)}</td>
              <td>${vn(m.normalizedMatchupImpact)}</td>
              <td>${vn(m.opponentMatchupImpact)}</td>
              <td>${vn(m.opponentNormalizedMatchupImpact)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      ${a&&!Jt?'<div id="matchup-deck-tip" class="deck-opponent-tip" hidden></div>':""}`}else if(E==="totals"){const a=U==="decks",r=U==="players",o=U==="colors",c=U==="archetypes",l=U==="seats",i=U==="turns",d=Ll(),u=Se("totals-bracket-filter-toggle",Pe),f=`<label class="checkbox totals-exclude-me">
      <input type="checkbox" id="totals-exclude-me" ${de?"checked":""} />
      Exclude my data
    </label>`;if(c){const p=de?[]:st(Aa(d,y.decks,{view:me}),S["archetype-stats"],{label:h=>h.label,decks:h=>h.decks,games:h=>h.games,wins:h=>h.wins,winRate:h=>h.winRate,normalizedWr:h=>h.normalizedWr},wt),g=Et(p,"games"),m=Et(p,"wins"),$=Et(p,"decks");e=`
      ${ve(hn,U,"totals-tab")}
      <div class="filters inline totals-filters archetype-toolbar">
        ${u}
        ${f}
        <button type="button" class="btn btn-ghost btn-sm" id="archetype-view-toggle">${Ta(me)}</button>
      </div>
      <table class="table compact sortable-table">
        <thead><tr>
          ${w("archetype-stats","label","Archetype",S["archetype-stats"])}
          ${w("archetype-stats","decks","Decks",S["archetype-stats"])}
          ${w("archetype-stats","games","G",S["archetype-stats"])}
          ${w("archetype-stats","wins","W",S["archetype-stats"])}
          ${w("archetype-stats","winRate","WR",S["archetype-stats"])}
          ${w("archetype-stats","normalizedWr","Norm WR",S["archetype-stats"])}
        </tr></thead>
        <tbody>
          ${p.length?p.map(h=>`
            <tr>
              <td>${N(h.label)}</td>
              <td>${It(h.decks,$)}</td>
              <td>${It(h.games,g)}</td>
              <td>${It(h.wins,m)}</td>
              <td>${h.games?G(h.winRate):"—"}</td>
              <td>${h.games?G(h.normalizedWr):"—"}</td>
            </tr>`).join(""):`<tr><td colspan="6">${de?"No archetype data when excluding your decks.":"No archetype data yet — add archetypes to your decks."}</td></tr>`}
        </tbody>
      </table>`}else if(l){const p={excludeMySeat:de},g=Ms(d,"total",p),m={start:g.min,end:g.max},$=Ga(d,"total",p),h=je(Tt.map(R=>({id:R,label:`Seat ${R}`,color:$n[R],series:qt(za(d,R,m.start,m.end,"total",p))})),m);e=`
      ${ve(hn,U,"totals-tab")}
      <div class="filters inline totals-filters">
        ${u}
        ${f}
      </div>
      <div class="seat-toggle-row seat-toggle-row--four">
        ${$.map(R=>`
          <button type="button" class="seat-toggle ${Tt.includes(R.seat)?"active":""}"
            data-totals-seat-toggle="${R.seat}" style="--seat-color:${$n[R.seat]}">
            <div class="seat-toggle-header"><strong>${R.label}</strong></div>
            <span>${R.games}G · ${R.wins}W · ${R.games?G(R.winRate):"—"}</span>
          </button>`).join("")}
      </div>
      ${ke(h,"clear-totals-seats-chart")}`}else if(i){const p=tl(d,{decks:y.decks}),g=st(p,S["turn-stats"],{turn:$=>$.turn,games:$=>$.games,winRate:$=>$.winRate??-1},wt),m=Na(p,{gradientId:"totals-turn-wr-fill-gradient",mode:"distribution"});e=`
      ${ve(hn,U,"totals-tab")}
      <div class="filters inline totals-filters">
        ${u}
      </div>
      <table class="table compact sortable-table turn-stats-sort">
        <thead><tr>
          ${w("turn-stats","turn","Turn",S["turn-stats"])}
          ${w("turn-stats","games","Games",S["turn-stats"])}
          ${w("turn-stats","winRate","WR",S["turn-stats"])}
        </tr></thead>
      </table>
      ${p.length?`${El(g)}
          ${m}`:'<p class="muted">No turn data yet — add an end turn when logging games.</p>'}`}else{const p=Pn.trim().toLowerCase(),g=`totals-${U}`,m=st(t.totals[U]||[],S[g],{name:k=>k.name,colors:k=>us(k.colors||[]),pilotCount:k=>k.pilotCount??0,commanderCount:k=>k.commanderCount??0,playerCount:k=>k.playerCount??0,games:k=>k.games,wins:k=>k.wins,winRate:k=>k.winRate,normalizedWr:k=>k.normalizedWr,bracket:k=>k.bracket??null},wt).map((k,M)=>({...k,rank:M+1})).filter(k=>!p||k.name.toLowerCase().includes(p)),$=a?"Deck":r?"Player":"Colors",h=a||o?`<label class="checkbox totals-split-partners">
          <input type="checkbox" id="totals-split-partners" ${gn?"checked":""} />
          Split partners
        </label>`:"",R=`<input type="search" id="totals-search" class="input totals-search" placeholder="Search ${$.toLowerCase()}" value="${N(Pn)}" />`,b=o?`<div class="filters inline totals-filters totals-color-toolbar">
        ${u}
        <button type="button" class="btn btn-ghost btn-sm" id="totals-color-view-toggle">${Qn(on)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="totals-color-agg-toggle">${cn==="inclusive"?"Inclusive":"Exclusive"}</button>
        ${h}
        ${f}
        ${R}
      </div>`:`<div class="filters inline totals-filters">
        ${u}
        ${h}
        ${f}
        ${R}
      </div>`,v=a?w(g,"pilotCount","Pilots",S[g]):r?w(g,"commanderCount","Decks",S[g]):`${w(g,"playerCount","Pilots",S[g])}${w(g,"commanderCount","Decks",S[g])}`;e=`
      ${ve(hn,U,"totals-tab")}
      ${b}
      <table class="table compact sortable-table totals-table">
        <thead><tr>
          <th class="col-rank">#</th>
          ${w(g,"name",$,S[g])}
          ${a?w(g,"colors","Color Identity",S[g],"totals-ci-col"):""}
          ${a?w(g,"bracket","Bracket",S[g]):""}
          ${v}
          ${w(g,"games","G",S[g])}
          ${w(g,"wins","W",S[g])}
          ${w(g,"winRate","WR",S[g])}
          ${w(g,"normalizedWr","Norm WR",S[g])}
        </tr></thead>
        <tbody>
          ${m.map(k=>`
            <tr>
              <td class="col-rank">${k.rank}</td>
              ${a?`<td class="totals-name-col">${vt(k.name,y.decks,{label:k.name})}</td><td class="totals-color-col"><span class="color-label">${Kt(k.colors||[])}</span></td><td>${k.bracket??"—"}</td>`:o?`<td class="totals-color-col"><span class="color-label">${Kt(k.displayColors||[])}</span></td>`:`<td>${ge(k.name)}</td>`}
              ${a?`<td>${k.pilotCount||"—"}</td>`:r?`<td>${k.commanderCount||"—"}</td>`:`<td>${k.playerCount||"—"}</td><td>${k.commanderCount||"—"}</td>`}
              <td>${k.games}</td>
              <td>${k.wins}</td>
              <td>${G(k.winRate)}</td>
              <td>${G(k.normalizedWr)}</td>
            </tr>`).join("")}
        </tbody>
      </table>`}}return`<section class="section">${ve(Jr,E,"stats-tab")}${e}</section>`}function N(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function od(){const{deckStats:t}=Oe();let e=t;Je==="active"?e=e.filter(i=>!i.retired):Je==="retired"&&(e=e.filter(i=>i.retired)),Xe&&(e=e.filter(i=>String(i.bracket)===Xe));const n=S["decks-main"]||{col:V,dir:Te};V=n.col,Te=n.dir,n.col==="lastPlayed"?V="recent":n.col==="createdAt"?V="newest":n.col==="colors"&&(V="colors"),e=Ps(e,n.col,n.dir);const s=V==="recent"||n.col==="lastPlayed",a=s?"lastPlayed":"createdAt",r=s?"Played":"Added",o=i=>s?i.lastPlayed?X(i.lastPlayed):"—":X(i.createdAt),c=kt?Yl():null,l=c!=null&&c.createdAt&&T(c.createdAt)||ee();return`
    <section class="section">
      <div class="section-header">
        <div class="filters inline">
          <label>Status <select id="deck-status">${kl.map(i=>`<option value="${i.id}" ${Je===i.id?"selected":""}>${i.label}</option>`).join("")}</select></label>
          <label>Bracket <select id="deck-bracket"><option value="">All</option>${[1,2,3,4,5].map(i=>`<option value="${i}" ${Xe===String(i)?"selected":""}>${i}</option>`).join("")}</select></label>
          <label>Sort <select id="deck-sort">
            <option value="normWr" ${V==="normWr"?"selected":""}>Norm WR</option>
            <option value="games" ${V==="games"?"selected":""}>Most games</option>
            <option value="wr" ${V==="wr"?"selected":""}>Win rate</option>
            <option value="newest" ${V==="newest"?"selected":""}>Newest</option>
            <option value="recent" ${V==="recent"?"selected":""}>Most recent</option>
            <option value="name" ${V==="name"?"selected":""}>Name</option>
          </select></label>
        </div>
        <button type="button" class="btn btn-primary" id="add-deck-btn">+ Deck</button>
      </div>
      <div class="table-wrap">
        <table class="table sortable-table decks-table">
          <colgroup>
            <col class="decks-col-date" />
            <col class="decks-col-name" />
            <col class="decks-col-colors" />
            <col class="decks-col-bracket" />
            <col class="decks-col-games" />
            <col class="decks-col-wins" />
            <col class="decks-col-stat" />
            <col class="decks-col-stat" />
            <col class="decks-col-actions" />
          </colgroup>
          <thead><tr>
            ${w("decks-main",a,r,n,"deck-date-col")}
            ${w("decks-main","name","Deck",n,"deck-name-col")}
            ${w("decks-main","colors","Color Identity",n,"deck-colors-col")}
            ${w("decks-main","bracket","Bracket",n,"deck-tight-col")}
            ${w("decks-main","games","Games",n,"deck-tight-col")}
            ${w("decks-main","wins","Wins",n,"deck-tight-col")}
            ${w("decks-main","winRate","Win Rate",n,"deck-stat-col")}
            ${w("decks-main","normWr","Norm WR",n,"deck-stat-col")}
            <th class="row-actions-col"></th>
          </tr></thead>
          <tbody>
            ${e.length?e.map(i=>`<tr><td class="deck-date">${o(i)}</td><td class="deck-name">${vt(O(i),y.decks,{label:B(i),deckSlotId:z(i)})}</td><td class="deck-colors">${Kt(pn(i))}</td><td class="deck-tight">${i.bracket}</td><td class="deck-tight">${i.games}</td><td class="deck-tight">${i.wins}</td><td class="deck-stat">${i.games?G(i.winRate):"—"}</td><td class="deck-stat">${i.games?G(i.normalizedWr):"—"}</td><td class="row-actions"><button type="button" class="btn-icon edit-deck" data-name="${N(z(i)||Fe(i))}" title="Edit deck">✎</button></td></tr>`).join(""):'<tr><td colspan="9"></td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
    <div id="deck-modal" class="modal${ne?"":" hidden"}">
      <div class="modal-content modal-content-deck">
        <h3>${c?"Edit Deck":"Add Deck"}</h3>
        <form id="deck-form" class="deck-form" novalidate>
          ${c?`<input type="hidden" name="originalId" value="${N(z(c))}" />`:""}
          <label>Name<input name="name" placeholder="Optional deck name" value="${c?N(c.name||""):""}" /></label>
          <label>Commander<input name="commander" value="${c?N(Ts(c)):""}" /></label>
          <label>Created<input type="date" name="createdAt" value="${l}" /></label>
          <label>Bracket<select name="bracket">${[1,2,3,4,5].map(i=>`<option value="${i}" ${(c?c.bracket:4)===i?"selected":""}>${i}</option>`).join("")}</select></label>
          <label>Archetypes
            <div class="deck-archetype-wrap opponent-input-wrap">
              <textarea name="archetypes" class="deck-archetype-input opponent-input" rows="1" placeholder="Turbo, Storm, …" autocomplete="off">${c?N(xi(c.archetypes)):""}</textarea>
              <ul class="opponent-suggestions deck-archetype-suggestions" hidden role="listbox"></ul>
            </div>
          </label>
          <fieldset class="color-fieldset"><legend>Colors</legend>
            ${["W","U","B","R","G"].map(i=>{var d;return`<label class="checkbox mana-check"><input type="checkbox" name="color" value="${i}" ${(d=c==null?void 0:c.colors)!=null&&d.includes(i)?"checked":""} />${Kt([i])}</label>`}).join("")}
          </fieldset>
          <label class="checkbox"><input type="checkbox" name="retired" ${c!=null&&c.retired?"checked":""} /> Retired</label>
          <div class="form-actions${c?" form-actions--split":""}">
            ${c?'<button type="button" class="btn btn-danger" id="delete-deck-modal">Delete</button>':""}
            <button type="button" class="btn btn-primary" id="save-deck-btn">${c?"Save":"Add Deck"}</button>
          </div>
        </form>
      </div>
    </div>`}function cd(){let t=[...y.games];t=st(t,S["game-log"],{date:o=>zt(o),deck:o=>o.deck,bracket:o=>mt(o,new Map(y.decks.map(c=>[z(c),c]))),mySeat:o=>o.mySeat||0,turn:o=>Number(o.turn)>0?Number(o.turn):null,result:o=>o.result==="Win"?1:0});const e=[...y.decks].sort((o,c)=>B(o).localeCompare(B(c))).map(o=>z(o)),n=[...new Set(y.games.map(o=>mn(o.date)))].sort(),s=S["game-log"],a=Z?y.games.find(o=>o.id===Z):null,r=Zt?y.games.find(o=>o.id===Zt):null;return`
    <section class="section">
      <div class="section-header">
        <div class="filters inline game-log-filters">
          <label class="game-log-filter-deck">Deck<select id="filter-deck" class="game-log-filter-deck-select"><option value="">All</option>${e.map(o=>`<option value="${N(o)}" ${Bt.deck===o?"selected":""}>${N(On(o,y.decks))}</option>`).join("")}</select></label>
          <label>Bracket<select id="filter-bracket"><option value="">All</option>${[1,2,3,4,5].map(o=>`<option value="${o}" ${String(Bt.bracket)===String(o)?"selected":""}>${o}</option>`).join("")}</select></label>
          <label>Result<select id="filter-result"><option value="">All</option><option value="Win" ${Bt.result==="Win"?"selected":""}>Wins</option><option value="Loss" ${Bt.result==="Loss"?"selected":""}>Losses</option></select></label>
          <label>Year<select id="filter-year"><option value="">All</option>${n.map(o=>`<option value="${o}" ${Bt.year===o?"selected":""}>${o}</option>`).join("")}</select></label>
          <span class="filter-count" id="filter-count">${t.length} games</span>
        </div>
        <button type="button" class="btn btn-primary" id="add-game-btn">+ Game</button>
      </div>
      <div class="table-wrap">
        <table class="table sortable-table" id="game-log-table">
          <thead><tr>
            ${w("game-log","date","Date",s)}
            ${w("game-log","deck","Deck",s)}
            ${w("game-log","bracket","Bracket",s)}
            ${w("game-log","mySeat","Seat",s)}
            ${w("game-log","turn","End Turn",s)}
            ${w("game-log","result","Result",s)}
            <th class="row-actions-col"></th>
          </tr></thead>
          <tbody>${t.map(o=>bd(o)).join("")}</tbody>
        </table>
      </div>
    </section>
    <div id="game-modal" class="modal ${Nt?"":"hidden"}">
      <div class="modal-content modal-content-wide">
        <h3>${a?"Edit Game":"Log Game"}</h3>
        ${hd()}
      </div>
    </div>
    <div id="game-detail-modal" class="modal ${r?"":"hidden"}">
      <div class="modal-content modal-content-wide">
        <h3>Game Details</h3>
        ${r?pd(r):""}
      </div>
    </div>`}function Ya(t=""){return[1,2,3,4].map(e=>`<option value="${e}" ${String(t)===String(e)?"selected":""}>${e}</option>`).join("")}function ao(t,e){if(!(t!=null&&t.opponents))return"";const n=t.opponents.find(s=>s.seat===e);return(n==null?void 0:n.name)||""}function ro(t,e){var s;if(!t)return"";if(t.mySeat===e&&t.myPlayer)return t.myPlayer;const n=(s=t.opponents)==null?void 0:s.find(a=>a.seat===e);return(n==null?void 0:n.player)||""}function Ve(t,e="—"){const n=t!=null&&t!==""?String(t):e;return`<span class="field-value">${N(n)}</span>`}function Ja(t,e="player",n=null,s=null){if(t==null||t==="")return Ve("—");if(e==="player")return`<span class="field-value">${ge(t)}</span>`;const a=n&&s?oo(n,s):null;return`<span class="field-value">${vt(t,y.decks,{label:t,playerScope:a})}</span>`}function oo(t,e){return Number(t.mySeat)===e?lt:ro(t,e)}function id(t,e){return Number(t.mySeat)===e?zn(t,y.decks):ao(t,e)}function ld(t){return t.winnerSeat?Number(t.winnerSeat):t.mySeat&&t.result==="Win"?Number(t.mySeat):0}function dd(t,e){const n=ld(t);return n?e===n?"pod-seat-win":"pod-seat-loss":Number(t.mySeat)===e&&t.result==="Loss"?"pod-seat-loss":""}function ud(){let t=[...y.games];t=st(t,S["game-log"],{date:o=>zt(o),deck:o=>o.deck,bracket:o=>mt(o,it(y.decks)),mySeat:o=>o.mySeat||0,turn:o=>Number(o.turn)>0?Number(o.turn):null,result:o=>o.result==="Win"?1:0});const{deck:e,bracket:n,result:s,year:a}=Bt,r=it(y.decks);return t.filter(o=>!(e&&o.deck!==e||n&&String(mt(o,r))!==String(n)||s&&o.result!==s||a&&mn(o.date)!==a))}function md(t){const e=ud(),n=e.findIndex(s=>s.id===t);return{prev:n>0?e[n-1].id:null,next:n>=0&&n<e.length-1?e[n+1].id:null,index:n,total:e.length}}function fd(t){const{prev:e,next:n,index:s,total:a}=md(t),r=s>=0?`${s+1} / ${a}`:"";return`
    <div class="game-detail-nav">
      <button type="button" class="btn btn-ghost game-detail-step" id="game-detail-prev" ${e?`data-id="${N(e)}"`:"disabled"} aria-label="Previous game">←</button>
      <span class="game-detail-position">${r}</span>
      <button type="button" class="btn btn-ghost game-detail-step" id="game-detail-next" ${n?`data-id="${N(n)}"`:"disabled"} aria-label="Next game">→</button>
    </div>`}function pd(t){const e=mt(t,it(y.decks)),n=Number(t.turn)>0?String(t.turn):"—";return`
    <div class="game-form game-form-readonly game-detail-view">
      <div class="game-form-row game-form-row-split">
        <label>Date${Ve(X(t.date))}</label>
        <label>Time${Ve(t.time)}</label>
      </div>
      <div class="game-form-row game-form-row-split">
        <label>Bracket${Ve(e)}</label>
        <label>Turn Ended${Ve(n)}</label>
      </div>
      <fieldset class="pod-fieldset">
        <legend>Pod</legend>
        ${[1,2,3,4].map(s=>`
          <div class="pod-seat-row ${dd(t,s)}">
            <label class="pod-player">Player ${s}${Ja(oo(t,s))}</label>
            <label class="pod-commander">Commander${Ja(id(t,s),"deck",t,s)}</label>
          </div>`).join("")}
      </fieldset>
      ${fd(t.id)}
    </div>`}function gd(t){var e;return((e=et(y.decks,t))==null?void 0:e.bracket)??4}function yd(t,e=5){const n=[...y.games].sort((r,o)=>K(o,r)),s=new Set,a=[];for(const r of n){if(!r.deck||s.has(r.deck))continue;const o=t.find(c=>z(c)===r.deck&&!c.retired);if(o&&(s.add(r.deck),a.push(o),a.length>=e))break}return a}function hd(){const{deckStats:t}=Oe(),e=Z?y.games.find(u=>u.id===Z):null,n=e?t:t.filter(u=>!u.retired),s=Ps(n,"recent","desc"),a=yd(t,5),r=ee(),o=(e==null?void 0:e.date)||r,c=(e==null?void 0:e.time)??(e?"":co()),l=!e||e.result==="Win",i=(e==null?void 0:e.result)==="Loss",d=(e==null?void 0:e.bracket)??(e!=null&&e.deck?gd(e.deck):"");return`
    <form id="add-game-form" class="game-form">
      ${e?`<input type="hidden" name="gameId" value="${N(e.id)}" />`:""}
      <div class="game-form-row game-form-row-split">
        <label>Date<input type="date" name="date" value="${o}" required /></label>
        <label>Time<input type="time" name="time" value="${N(c)}" /></label>
      </div>
      <div class="game-form-row game-form-row-split">
        <label>Bracket<select name="bracket"><option value="" ${d?"":"selected"}>—</option>${[1,2,3,4,5].map(u=>`<option value="${u}" ${String(d)===String(u)?"selected":""}>${u}</option>`).join("")}</select></label>
        <label>Turn ended<input type="number" name="turn" min="0" step="1" placeholder="Optional (blank or 0 = none)" value="${(e==null?void 0:e.turn)??""}" /></label>
      </div>
      <label>My deck<select name="deck" required><option value="">Select…</option>${s.map(u=>`<option value="${N(z(u))}" data-bracket="${u.bracket}" ${(e==null?void 0:e.deck)===z(u)?"selected":""}>${N(B(u))}</option>`).join("")}</select></label>
      <label>My seat<select name="mySeat"><option value="">—</option>${Ya(e==null?void 0:e.mySeat)}</select></label>
      <label>Winning seat<select name="winnerSeat"><option value="">—</option>${Ya(e==null?void 0:e.winnerSeat)}</select></label>
      <fieldset class="pod-fieldset">
        <legend>Pod</legend>
        ${[1,2,3,4].map(u=>`
          <div class="pod-seat-row" data-opponent-seat="${u}">
            <label class="pod-player">Player ${u}
              <div class="opponent-input-wrap">
                <input type="text" class="player-input" name="player-${u}" value="${N(ro(e,u))}" placeholder="Player name" autocomplete="off" />
                <ul class="opponent-suggestions" hidden role="listbox"></ul>
              </div>
            </label>
            <label class="pod-commander">Commander
              <div class="opponent-input-wrap">
                <input type="text" class="opponent-input" name="opponent-${u}" value="${N(ao(e,u))}" placeholder="Commander name" autocomplete="off" />
                <ul class="opponent-suggestions" hidden role="listbox"></ul>
              </div>
            </label>
          </div>`).join("")}
      </fieldset>
      <label>Result
        <div class="result-toggle">
          <label class="radio-card"><input type="radio" name="result" value="Win" ${l?"checked":""} /><span>Win</span></label>
          <label class="radio-card loss"><input type="radio" name="result" value="Loss" ${i?"checked":""} /><span>Loss</span></label>
        </div>
      </label>
      <div class="form-actions${e?" form-actions--split":""}">
        ${e?'<button type="button" class="btn btn-danger" id="delete-game-modal">Delete</button>':""}
        <button type="button" class="btn btn-primary btn-lg" id="save-game-btn">${e?"Save":"Save Game"}</button>
      </div>
    </form>
    <div class="quick-log">
      <h3>Quick fill</h3>
      <div class="quick-grid">
        ${a.map(u=>`
          <div class="quick-deck">
            <span class="quick-name">${Kt(pn(u))} ${N(B(u))}</span>
            <button type="button" class="btn btn-sm win quick-win" data-deck="${N(z(u))}">W</button>
            <button type="button" class="btn btn-sm loss quick-loss" data-deck="${N(z(u))}">L</button>
          </div>`).join("")}
      </div>
    </div>`}function bd(t){const e=t.result==="Win"?"win":"loss",n=et(y.decks,t.deck),s=n?B(n):On(t.deck,y.decks),a=vt(n?O(n):zn(t,y.decks),y.decks,{label:s,playerScope:lt,deckSlotId:t.deck}),r=mt(t,new Map(y.decks.map(o=>[z(o),o])));return`<tr data-deck="${N(t.deck)}" data-bracket="${r}" data-result="${t.result}" data-year="${mn(t.date)}">
    <td><button type="button" class="link-btn view-game" data-id="${t.id}">${X(t.date)}</button></td><td class="deck-name">${a}</td>
    <td>${r}</td><td>${t.mySeat||"—"}</td><td>${t.turn||"—"}</td>
    <td><span class="result-pill ${e}">${t.result}</span></td>
    <td class="row-actions">
      <button type="button" class="btn-icon edit-game" data-id="${t.id}" title="Edit game">✎</button>
    </td></tr>`}function $d(t){const e=t.get("mySeat"),n=e?Number(e):0,s=[1,2,3,4].flatMap(d=>{if(n&&d===n)return[];const u=String(t.get(`opponent-${d}`)||"").trim(),f=String(t.get(`player-${d}`)||"").trim();return!u&&!f?[]:[{seat:d,name:u,...f?{player:f}:{}}]}),a=t.get("winnerSeat"),r=t.get("turn"),o=t.get("time"),c={date:t.get("date"),deck:t.get("deck"),result:t.get("result"),source:"local"},l=tr(String(o||""));l&&(c.time=l);const i=t.get("bracket");if(i){const d=Number(i);!Number.isNaN(d)&&d>=1&&d<=5&&(c.bracket=d)}if(e){c.mySeat=Number(e),c.opponents=s;const d=String(t.get(`player-${n}`)||"").trim();d&&(c.myPlayer=d)}if(a&&(c.winnerSeat=Number(a),e&&(c.result=Number(a)===Number(e)?"Win":"Loss")),r!==null&&String(r).trim()!==""){const d=Number(r);!Number.isNaN(d)&&d>0&&(c.turn=d)}return c}function kd(t,e=null){const n=et(y.decks,t.deck);if((e==null?void 0:e.deck)===t.deck&&e.myCommander){t.myCommander=e.myCommander;return}n&&(t.myCommander=O(n))}function Xa(t,e,n=null){kd(t,n);const s={id:e,date:t.date,deck:t.deck,result:t.result,source:"local"};return t.myCommander&&(s.myCommander=t.myCommander),t.mySeat&&(s.mySeat=t.mySeat,s.opponents=t.opponents||[],t.myPlayer&&(s.myPlayer=t.myPlayer)),t.winnerSeat&&(s.winnerSeat=t.winnerSeat),t.turn&&(s.turn=t.turn),t.time&&(s.time=t.time),t.bracket&&(s.bracket=t.bracket),s}function Za(t){if(He)return;const e=$d(t);if(!e.deck)return D("Pick a deck",!0);const n=String(t.get("gameId")||Z||"").trim();if(He=!0,n){const s=y.games.findIndex(a=>a.id===n);if(s<0)return He=!1,D("Game not found",!0);y.games[s]=Xa(e,n,y.games[s])}else{const s=Co(y.games);y.games.push(Xa(e,s))}if(!ct(y)){n||y.games.pop(),He=!1,D("Failed to save game — storage may be full",!0);return}Z=null,Nt=!1,So(y),D(n?"Game saved":`${e.result} logged`),x(),He=!1,Gn()}function vd({deck:t,result:e}){var o,c;Z=null;const n=document.getElementById("add-game-form");if(!n)return;const s=n.querySelector('[name="deck"]'),a=n.querySelector(`[name="result"][value="${e}"]`),r=Number((o=n.querySelector('[name="winnerSeat"]'))==null?void 0:o.value)||0;s&&(s.value=t),aa(),r===0&&a&&(a.checked=!0),(c=n.querySelector('[name="date"]'))==null||c.focus(),ra(),Me()}function Me(){var c,l;const t=document.getElementById("add-game-form");if(!t)return;const e=Number((c=t.querySelector('[name="mySeat"]'))==null?void 0:c.value)||0,n=Number((l=t.querySelector('[name="winnerSeat"]'))==null?void 0:l.value)||0,s=t.querySelector('[name="result"][value="Win"]'),a=t.querySelector('[name="result"][value="Loss"]'),r=t.querySelector(".result-toggle"),o=n>0;if(r&&r.classList.toggle("result-locked",o),s&&(s.disabled=o),a&&(a.disabled=o),o&&e>0){const i=n===e;s&&(s.checked=i),a&&(a.checked=!i)}}function aa(){const t=document.getElementById("add-game-form");if(!t)return;const e=t.querySelector('[name="deck"]'),n=t.querySelector('[name="bracket"]');if(!e||!n)return;const s=e.selectedOptions[0],a=s==null?void 0:s.dataset.bracket;a&&(n.value=a)}function ra(){var s;const t=document.getElementById("add-game-form");if(!t)return;const e=Number((s=t.querySelector('[name="mySeat"]'))==null?void 0:s.value)||0,n=t.querySelector(".pod-fieldset");n&&(n.hidden=e===0),t.querySelectorAll("[data-opponent-seat]").forEach(a=>{var c,l,i,d;const r=Number(a.dataset.opponentSeat),o=e>0&&r===e;if(a.hidden=o,o){const u=a.querySelector(".player-input"),f=a.querySelector(".opponent-input");u&&(u.value="",(l=(c=u.closest(".opponent-input-wrap"))==null?void 0:c.querySelector(".opponent-suggestions"))==null||l.setAttribute("hidden","")),f&&(f.value="",(d=(i=f.closest(".opponent-input-wrap"))==null?void 0:i.querySelector(".opponent-suggestions"))==null||d.setAttribute("hidden",""))}})}function D(t,e=!1){const n=document.createElement("div");n.className=`toast ${e?"error":""}`,n.textContent=t,document.body.appendChild(n),requestAnimationFrame(()=>n.classList.add("show")),setTimeout(()=>{n.classList.remove("show"),setTimeout(()=>n.remove(),300)},2200)}Tl();
