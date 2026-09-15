import { APP_CONFIG } from './config.js';

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const clone = x => structuredClone(x);
const esc = (s='') => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
let data = null;
let activePanel = 'settings';
let editingDocId = null;
let fileHandle = null;

function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');clearTimeout(e.t);e.t=setTimeout(()=>e.classList.remove('show'),2200)}
async function hashHex(value){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}

async function unlock(){
  const root=$('#lockRoot');
  if(!APP_CONFIG.adminPinHash){ $('#adminRoot').hidden=false; return; }
  root.innerHTML=`<div class="lock-screen"><div class="doc-eyebrow">ADMIN</div><h1>Editor lock</h1><p style="color:var(--muted)">This PIN only hides the editor UI; it is not server-side security.</p><div class="form-row"><label>PIN</label><input id="pinInput" type="password" autocomplete="current-password"></div><button id="unlockBtn" class="btn primary">OPEN EDITOR</button><p id="pinError" style="color:#a43c2a"></p></div>`;
  $('#unlockBtn').onclick=async()=>{const h=await hashHex($('#pinInput').value);if(h===APP_CONFIG.adminPinHash){root.innerHTML='';$('#adminRoot').hidden=false}else $('#pinError').textContent='Incorrect PIN.'};
}

async function loadDeployed(){const r=await fetch('./data/site-data.json',{cache:'no-store'});if(!r.ok)throw new Error('Could not load site-data.json');data=await r.json();editingDocId=null;renderPanel();}

function initNav(){ $$('.admin-sidebar button[data-panel]').forEach(b=>b.onclick=()=>{syncCurrentForm();activePanel=b.dataset.panel;$$('.admin-sidebar button[data-panel]').forEach(x=>x.classList.toggle('active',x===b));editingDocId=null;renderPanel();}); }
function renderPanel(){ if(!data)return; if(activePanel==='settings')renderSettings(); if(activePanel==='documents')renderDocuments(); if(activePanel==='decisions')renderDecisions(); if(activePanel==='json')renderRaw(); }

function renderSettings(){
  const s=data.site||{};
  $('#adminPanel').innerHTML=`<h2>Site settings</h2>
  ${row('Title',`<input id="sTitle" value="${esc(s.title||'')}">`)}
  ${row('Subtitle',`<input id="sSubtitle" value="${esc(s.subtitle||'')}">`)}
  ${row('Tagline',`<input id="sTagline" value="${esc(s.tagline||'')}">`)}
  ${row('Phase stamp',`<input id="sPhase" value="${esc(s.phase||'')}">`)}
  ${row('Festival date',`<input id="sDate" type="date" value="${esc(s.festivalDate||'')}">`)}
  ${row('Accent',`<div style="display:flex;gap:8px"><input id="sAccent" type="color" value="${esc(s.accent||'#f0642b')}" style="width:70px"><input id="sAccentText" value="${esc(s.accent||'#f0642b')}"></div>`)}
  ${row('GitHub repo URL',`<input id="sRepo" value="${esc(s.repoUrl||'')}" placeholder="https://github.com/you/repo">`)}
  <div class="toolbar" style="margin-top:20px"><button class="btn primary" id="saveSettings">Save settings</button></div>`;
  $('#sAccent').oninput=e=>$('#sAccentText').value=e.target.value;
  $('#sAccentText').oninput=e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value))$('#sAccent').value=e.target.value};
  $('#saveSettings').onclick=()=>{data.site={...data.site,title:$('#sTitle').value,subtitle:$('#sSubtitle').value,tagline:$('#sTagline').value,phase:$('#sPhase').value,festivalDate:$('#sDate').value,accent:$('#sAccentText').value,repoUrl:$('#sRepo').value};toast('Settings saved in editor.');};
}

function row(label,control){return `<div class="admin-row"><label>${label}</label><div>${control}</div></div>`}

function renderDocuments(){
  if(editingDocId){renderDocEditor(data.documents.find(d=>d.id===editingDocId));return;}
  $('#adminPanel').innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2 style="margin-bottom:5px">Documents</h2><p style="color:var(--muted);margin-top:0">Pages shown in PLAN / DOCS.</p></div><button id="newDocBtn" class="btn primary">+ New document</button></div><div class="admin-list" id="docAdminList"></div>`;
  $('#docAdminList').innerHTML=(data.documents||[]).map(d=>`<div class="admin-item"><div class="meta"><strong>${esc(d.title)}</strong><span>${esc(d.eyebrow||'')} · ${esc(d.updated||'')}</span></div><div class="admin-actions"><button class="btn small ghost" data-edit="${esc(d.id)}">Edit</button><button class="btn small ghost" data-del="${esc(d.id)}">Delete</button></div></div>`).join('')||'<div class="empty">No documents.</div>';
  $$('[data-edit]').forEach(b=>b.onclick=()=>{editingDocId=b.dataset.edit;renderDocuments()});
  $$('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Delete this document?')){data.documents=data.documents.filter(d=>d.id!==b.dataset.del);renderDocuments();}});
  $('#newDocBtn').onclick=()=>{const id=`doc-${Date.now()}`;data.documents.push({id,title:'New document',eyebrow:'NEW / DOC',summary:'',updated:new Date().toISOString().slice(0,10),tags:[],blocks:[]});editingDocId=id;renderDocuments();};
}

function renderDocEditor(doc){
  if(!doc){editingDocId=null;return renderDocuments();}
  $('#adminPanel').innerHTML=`<div class="toolbar" style="margin-bottom:18px"><button id="backDocs" class="btn ghost">← Documents</button><button id="saveDoc" class="btn primary">Save document</button></div>
    <h2>Edit document</h2>
    ${row('Title',`<input id="dTitle" value="${esc(doc.title)}">`)}
    ${row('Eyebrow',`<input id="dEyebrow" value="${esc(doc.eyebrow||'')}">`)}
    ${row('Summary',`<textarea id="dSummary">${esc(doc.summary||'')}</textarea>`)}
    ${row('Updated',`<input id="dUpdated" type="date" value="${esc(doc.updated||'')}">`)}
    ${row('Tags',`<input id="dTags" value="${esc((doc.tags||[]).join(', '))}" placeholder="plan, koho">`)}
    <hr style="border:0;border-top:1px solid var(--line);margin:24px 0">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h3>Blocks</h3><p style="color:var(--muted);margin-top:-6px">Reorder and edit the visual blocks on this page.</p></div><select id="newBlockType" class="btn ghost"><option value="text">Text</option><option value="callout">Callout</option><option value="checklist">Checklist</option><option value="timeline">Timeline</option><option value="cards">Cards</option><option value="split">Split</option><option value="links">Links</option><option value="quote">Quote</option></select></div>
    <div id="blocksEditor"></div><button id="addBlockBtn" class="btn">+ Add selected block</button>`;
  renderBlocks(doc);
  $('#backDocs').onclick=()=>{editingDocId=null;renderDocuments()};
  $('#saveDoc').onclick=()=>{doc.title=$('#dTitle').value;doc.eyebrow=$('#dEyebrow').value;doc.summary=$('#dSummary').value;doc.updated=$('#dUpdated').value;doc.tags=$('#dTags').value.split(',').map(x=>x.trim()).filter(Boolean);readAllBlocks(doc);toast('Document saved in editor.');};
  $('#addBlockBtn').onclick=()=>{readAllBlocks(doc);doc.blocks.push(blankBlock($('#newBlockType').value));renderDocEditor(doc);};
}

function blankBlock(type){
  if(type==='text')return{type,title:'Section title',body:'Write here.'};
  if(type==='callout'||type==='quote')return{type,title:type==='quote'?'Quote':'Core idea',text:'Write here.'};
  if(type==='checklist')return{type,title:'Checklist',items:[{text:'New item',done:false}]};
  if(type==='timeline')return{type,title:'Timeline',items:[{date:'DATE',title:'Step',text:'Details'}]};
  if(type==='cards')return{type,title:'Cards',items:[{title:'Card',text:'Details'}]};
  if(type==='split')return{type,left:{title:'Left',text:'Details'},right:{title:'Right',text:'Details'}};
  if(type==='links')return{type,title:'Links',items:[{label:'Link',url:'https://',note:''}]};
  return{type};
}

function renderBlocks(doc){
  const host=$('#blocksEditor');
  host.innerHTML=(doc.blocks||[]).map((b,i)=>`<section class="block-editor" data-index="${i}" data-type="${esc(b.type)}"><header><strong>${esc(b.type)}</strong><div class="admin-actions"><button class="btn small ghost" data-up>↑</button><button class="btn small ghost" data-down>↓</button><button class="btn small ghost" data-remove>Delete</button></div></header>${blockFields(b)}</section>`).join('')||'<div class="empty">No blocks yet.</div>';
  $$('.block-editor').forEach(el=>{
    const i=Number(el.dataset.index);
    $('[data-up]',el).onclick=()=>{readAllBlocks(doc);if(i>0){[doc.blocks[i-1],doc.blocks[i]]=[doc.blocks[i],doc.blocks[i-1]];renderDocEditor(doc)}};
    $('[data-down]',el).onclick=()=>{readAllBlocks(doc);if(i<doc.blocks.length-1){[doc.blocks[i+1],doc.blocks[i]]=[doc.blocks[i],doc.blocks[i+1]];renderDocEditor(doc)}};
    $('[data-remove]',el).onclick=()=>{readAllBlocks(doc);doc.blocks.splice(i,1);renderDocEditor(doc)};
  });
}

function blockFields(b){
  if(b.type==='text')return fields([['Title','title',b.title],['Body','body',b.body,true]]);
  if(b.type==='callout'||b.type==='quote')return fields([['Title','title',b.title],['Text','text',b.text,true]]);
  if(b.type==='checklist')return fields([['Title','title',b.title],['Items: one per line; use [x] or [ ]','itemsText',(b.items||[]).map(i=>`${i.done?'[x]':'[ ]'} ${i.text}`).join('\n'),true]]);
  if(b.type==='timeline')return fields([['Title','title',b.title],['Items: DATE | TITLE | TEXT','timelineText',(b.items||[]).map(i=>`${i.date} | ${i.title} | ${i.text}`).join('\n'),true]]);
  if(b.type==='cards')return fields([['Section title','title',b.title],['Cards: TITLE | TEXT','cardsText',(b.items||[]).map(i=>`${i.title} | ${i.text}`).join('\n'),true]]);
  if(b.type==='split')return fields([['Left title','leftTitle',b.left?.title],['Left text','leftText',b.left?.text,true],['Right title','rightTitle',b.right?.title],['Right text','rightText',b.right?.text,true]]);
  if(b.type==='links')return fields([['Title','title',b.title],['Links: LABEL | URL | NOTE','linksText',(b.items||[]).map(i=>`${i.label} | ${i.url} | ${i.note||''}`).join('\n'),true]]);
  return '<p>Unknown block type. Use Raw JSON to edit it.</p>';
}
function fields(items){return items.map(([label,name,value,multi])=>`<div class="form-row"><label>${esc(label)}</label>${multi?`<textarea data-field="${name}">${esc(value||'')}</textarea>`:`<input data-field="${name}" value="${esc(value||'')}">`}</div>`).join('')}

function readAllBlocks(doc){
  const els=$$('.block-editor');
  if(!els.length)return;
  doc.blocks=els.map(el=>{
    const type=el.dataset.type, v=n=>($(`[data-field="${n}"]`,el)?.value||'').trim();
    if(type==='text')return{type,title:v('title'),body:v('body')};
    if(type==='callout'||type==='quote')return{type,title:v('title'),text:v('text')};
    if(type==='checklist')return{type,title:v('title'),items:v('itemsText').split('\n').filter(Boolean).map(line=>({done:/^\s*\[x\]/i.test(line),text:line.replace(/^\s*\[[x ]\]\s*/i,'')}))};
    if(type==='timeline')return{type,title:v('title'),items:v('timelineText').split('\n').filter(Boolean).map(line=>{const [date='',title='',...rest]=line.split('|').map(x=>x.trim());return{date,title,text:rest.join(' | ')}})};
    if(type==='cards')return{type,title:v('title'),items:v('cardsText').split('\n').filter(Boolean).map(line=>{const [title='',...rest]=line.split('|').map(x=>x.trim());return{title,text:rest.join(' | ')}})};
    if(type==='split')return{type,left:{title:v('leftTitle'),text:v('leftText')},right:{title:v('rightTitle'),text:v('rightText')}};
    if(type==='links')return{type,title:v('title'),items:v('linksText').split('\n').filter(Boolean).map(line=>{const [label='',url='',...rest]=line.split('|').map(x=>x.trim());return{label,url,note:rest.join(' | ')}})};
    return {type};
  });
}

function renderDecisions(){
  $('#adminPanel').innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2>Decisions</h2><p style="color:var(--muted)">Short, final-ish outcomes from meetings or LINE.</p></div><button id="addDecision" class="btn primary">+ Decision</button></div><div id="decisionEditor"></div>`;
  $('#decisionEditor').innerHTML=(data.decisions||[]).map((d,i)=>`<section class="block-editor" data-decision="${i}"><header><strong>${esc(d.date||'')}</strong><button class="btn small ghost" data-del>Delete</button></header>${fields([['Date','date',d.date],['Title','title',d.title],['Detail','detail',d.detail,true]])}</section>`).join('')||'<div class="empty">No decisions yet.</div>';
  $$('[data-decision]').forEach(el=>{const i=Number(el.dataset.decision);$('[data-del]',el).onclick=()=>{readDecisions();data.decisions.splice(i,1);renderDecisions()};});
  $('#addDecision').onclick=()=>{readDecisions();data.decisions.unshift({date:new Date().toISOString().slice(0,10),title:'New decision',detail:''});renderDecisions()};
}
function readDecisions(){const els=$$('[data-decision]');if(!els.length)return;data.decisions=els.map(el=>({date:$('[data-field="date"]',el).value,title:$('[data-field="title"]',el).value,detail:$('[data-field="detail"]',el).value}))}

function renderRaw(){
  if(activePanel==='decisions')readDecisions();
  $('#adminPanel').innerHTML=`<h2>Raw JSON</h2><p style="color:var(--muted)">Power-user escape hatch. Apply validates JSON before replacing the editor data.</p><textarea class="json-box" id="rawJson">${esc(JSON.stringify(data,null,2))}</textarea><div class="toolbar" style="margin-top:10px"><button id="applyRaw" class="btn primary">Apply JSON</button></div>`;
  $('#applyRaw').onclick=()=>{try{data=JSON.parse($('#rawJson').value);toast('JSON applied.')}catch(e){alert(`Invalid JSON: ${e.message}`)}};
}

function syncCurrentForm(){
  if(activePanel==='settings' && $('#sTitle')){data.site={...data.site,title:$('#sTitle').value,subtitle:$('#sSubtitle').value,tagline:$('#sTagline').value,phase:$('#sPhase').value,festivalDate:$('#sDate').value,accent:$('#sAccentText').value,repoUrl:$('#sRepo').value};}
  if(activePanel==='documents'&&editingDocId){const doc=data.documents.find(d=>d.id===editingDocId);if(doc){doc.title=$('#dTitle')?.value||doc.title;doc.eyebrow=$('#dEyebrow')?.value||'';doc.summary=$('#dSummary')?.value||'';doc.updated=$('#dUpdated')?.value||'';doc.tags=($('#dTags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);readAllBlocks(doc);}}
  if(activePanel==='decisions')readDecisions();
}

function downloadData(){syncCurrentForm();const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='site-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Downloaded site-data.json');}

async function openJsonFile(){
  if(!window.showOpenFilePicker){alert('Direct file editing is not supported in this browser. Use Download JSON instead.');return;}
  [fileHandle]=await window.showOpenFilePicker({types:[{description:'JSON',accept:{'application/json':['.json']}}],multiple:false});
  const file=await fileHandle.getFile();
  data=JSON.parse(await file.text());
  $('#saveFileBtn').disabled=false;editingDocId=null;renderPanel();toast(`Opened ${file.name}`);
}
async function saveJsonFile(){
  if(!fileHandle)return;
  syncCurrentForm();
  const writable=await fileHandle.createWritable();await writable.write(JSON.stringify(data,null,2)+'\n');await writable.close();toast('Saved directly to opened JSON file.');
}

async function main(){
  await unlock();
  await loadDeployed();
  initNav();
  $('#downloadBtn').onclick=downloadData;
  $('#openFileBtn').onclick=()=>openJsonFile().catch(e=>{console.error(e);toast('Open cancelled or failed.')});
  $('#saveFileBtn').onclick=()=>saveJsonFile().catch(e=>{console.error(e);toast('Save failed.')});
  $('#reloadStarterBtn').onclick=()=>{if(confirm('Discard unsaved edits and reload deployed data?'))loadDeployed()};
}
main().catch(e=>{console.error(e);document.body.innerHTML=`<div class="lock-screen"><h1>Admin failed to load</h1><p>${esc(e.message)}</p></div>`});
