import { initCloud, getIdeas, addIdea, cloudEnabled, getMindmap, saveMindmap } from './cloud.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let data;
let currentDocId;
let ideas = [];
let activeMap = null;
let saveMapTimer = null;
let currentLang = 'ja';
let guideStep = 0;
let spriteFrame = 0;

const UI = {
  ja: {
    pageDescription: '九大祭広報チームの企画ノート', navLabel: 'メインナビゲーション', languageLabel: '表示言語',
    nav: ['01 企画・資料', '02 アイデア', '03 マインドマップ', '04 決定事項'],
    countdownKicker: '九大祭まであと', countdownUnit: '日', datePrefix: '開催日：',
    planHeading: '企画・資料', planDescription: '資料を「ファイルの山」ではなく、読みやすいページとして共有する場所。',
    ideasHeading: 'アイデアボード', ideasDescription: '完成していなくて大丈夫。思いついた段階で共有して、みんなで育てよう。',
    mindmapHeading: 'マインドマップ', mindmapDescription: 'カードをドラッグして移動。「子アイデアを追加」で枝を伸ばせます。共有モードなら、全員で同じマップを編集できます。',
    decisionsHeading: '決定事項', decisionsDescription: '会議やLINEで決まったことを短く記録。「結局どうなった？」を防ぐためのページです。',
    titleLabel: 'アイデアのタイトル', titlePlaceholder: '例：練習ミニVlog', categoryLabel: 'カテゴリー', textLabel: 'どんなアイデア？', textPlaceholder: '短くてOK。どんな内容？', authorLabel: '名前 <span style="font-weight:400">（任意）</span>', authorPlaceholder: '匿名', postIdea: 'アイデアを投稿 →',
    filter: '絞り込み', categories: { ALL: 'すべて', INSTAGRAM: 'Instagram', X: 'X', VIDEO: '動画', 'POSTER / FLYER': 'ポスター・チラシ', 'ON CAMPUS': '学内企画', OTHER: 'その他' },
    checkingMode: '共有モードを確認中…', sharedMode: '<strong>共有モード：</strong> アイデアとマインドマップはFirebaseでチームに共有されます。', localMode: '<strong>ローカル体験モード：</strong> 投稿はこのブラウザにのみ保存されます。チームで共有するには <code>assets/js/config.js</code> でFirebaseを有効にしてください。',
    noIdeas: 'このカテゴリーにはまだアイデアがありません。', anonymous: '匿名', ideaPosted: 'アイデアをチームに共有しました。', ideaSaved: 'アイデアをこのブラウザに保存しました。', ideaFailed: '投稿できませんでした。共有設定を確認してください。',
    addRoot: '+ 単独アイデア', resetMap: '初期状態に戻す', mapHelp: 'ヒント：スマホでもカードをドラッグできます。枝を削除すると、その下の子アイデアもまとめて削除されます。', resetConfirm: 'マインドマップを初期状態に戻しますか？', newIdeaPrompt: '新しい単独アイデア', childPrompt: '子アイデア', editPrompt: 'テキストを編集', childAction: '+ 子アイデア', editAction: '編集', mapSaved: 'マインドマップを保存しました。', mapFailed: 'マインドマップを保存できませんでした。',
    noDecisions: 'まだ決定事項はありません。', updated: '更新', guideTitle: 'HARMOQ ガイド', guideNext: '次へ →', guideRestart: '最初へ ↺', guideHide: 'ガイドを隠す', guideShow: '💡 使い方ガイドを表示',
    guideSteps: ['ここは、思いつきを気軽に持ち寄る場所だよ。完成していなくても大丈夫！', '左のフォームにタイトルと内容を書いて、「アイデアを投稿」を押してね。名前は空欄でもOK。', '「絞り込み」を使うと、SNSや動画などカテゴリー別にアイデアを見られるよ。', 'まずは小さなひらめきから。みんなのアイデアを組み合わせて、九大祭の魅力を育てよう！'],
    loadErrorTitle: 'ノートを読み込めませんでした', loadErrorHelp: 'GitHub PagesなどのHTTPサーバーから開いてください。index.htmlを直接開くと、JSONの読み込みがブロックされることがあります。'
  },
  en: {
    pageDescription: 'Kyudai Festival publicity team planning notebook', navLabel: 'Main navigation', languageLabel: 'Display language', nav: ['01 PLAN / DOCS', '02 IDEAS', '03 MINDMAP', '04 DECISIONS'], countdownKicker: 'FESTIVAL COUNTDOWN', countdownUnit: 'DAYS', datePrefix: 'until ',
    planHeading: 'Plan / Docs', planDescription: 'A place to share materials as readable pages, rather than as a pile of files.', ideasHeading: 'Idea Wall', ideasDescription: 'Ideas do not have to be finished. Share a spark now, then help it grow together.', mindmapHeading: 'Mindmap', mindmapDescription: 'Drag cards to move them. Use “+ child idea” to grow a branch. In shared mode, everyone can edit the same map.', decisionsHeading: 'Decisions', decisionsDescription: 'Keep a short record of what was decided in meetings or on LINE, so nobody has to ask, “What did we decide?”',
    titleLabel: 'IDEA TITLE', titlePlaceholder: 'e.g. Rehearsal mini-vlog', categoryLabel: 'CATEGORY', textLabel: "WHAT'S THE IDEA?", textPlaceholder: 'A short description is enough.', authorLabel: 'YOUR NAME <span style="font-weight:400">(optional)</span>', authorPlaceholder: 'anonymous', postIdea: 'POST IDEA →', filter: 'FILTER', categories: { ALL: 'ALL', INSTAGRAM: 'INSTAGRAM', X: 'X', VIDEO: 'VIDEO', 'POSTER / FLYER': 'POSTER / FLYER', 'ON CAMPUS': 'ON CAMPUS', OTHER: 'OTHER' },
    checkingMode: 'Checking sharing mode…', sharedMode: '<strong>Shared mode:</strong> Ideas and mindmaps sync through Firebase.', localMode: '<strong>Local demo mode:</strong> submissions are saved only in this browser. Enable Firebase in <code>assets/js/config.js</code> for team-wide sharing.', noIdeas: 'No ideas in this category yet.', anonymous: 'anonymous', ideaPosted: 'Idea shared with the team.', ideaSaved: 'Idea saved in this browser.', ideaFailed: 'Could not post the idea. Please check the sharing setup.',
    addRoot: '+ Floating idea', resetMap: 'Reset starter map', mapHelp: 'Tip: You can drag cards on a phone too. Deleting a branch also removes all of its child ideas.', resetConfirm: 'Reset the mindmap to the starter version?', newIdeaPrompt: 'New floating idea', childPrompt: 'Child idea', editPrompt: 'Edit text', childAction: '+ child idea', editAction: 'edit', mapSaved: 'Mindmap saved.', mapFailed: 'Mindmap save failed.', noDecisions: 'No decisions yet.', updated: 'UPDATED',
    guideTitle: 'HARMOQ GUIDE', guideNext: 'NEXT →', guideRestart: 'START OVER ↺', guideHide: 'Hide guide', guideShow: '💡 Show the Ideas guide', guideSteps: ['This is a place to share quick sparks. Your idea does not have to be finished!', 'Add a title and short description in the form, then select “Post idea.” You can leave your name blank.', 'Use the filter to browse ideas by category, such as social media, video, or on-campus activities.', 'Start with one small thought. Combine everyone’s ideas and grow new reasons to visit Kyudai Festival!'],
    loadErrorTitle: 'Could not load the notebook', loadErrorHelp: 'Open the site through an HTTP server such as GitHub Pages. Opening index.html directly may block the JSON file.'
  }
};

const EN_CONTENT = {
  site: { subtitle: 'Festival Notebook', tagline: 'Create a reason to visit Kyudai Festival.', phase: 'IDEAS → PLANNING' },
  documents: [
    { id:'start-here', title:'Start Here', eyebrow:'00 / GUIDE', summary:'This shared notebook keeps the publicity team’s thinking, decisions, and materials in one place.', updated:'2026-09-15', tags:['guide','team'], blocks:[{type:'callout',title:'Core idea',text:'Create a reason to visit Kyudai Festival.'},{type:'text',title:'How to use this space',body:'Read current thinking and materials in Plan / Docs. Share quick thoughts in Ideas. Connect ideas in the Mindmap. Record clear outcomes in Decisions.'},{type:'cards',items:[{title:'PLAN / DOCS',text:'Organize thinking, direction, and reference materials.'},{title:'IDEAS',text:'A place to share an idea in 30 seconds.'},{title:'MINDMAP',text:'Explore a plan by branching and connecting ideas.'},{title:'DECISIONS',text:'Keep a short record of what was decided.'}]}]},
    { id:'koho-plan', title:'Where publicity stands', eyebrow:'01 / CURRENT DIRECTION', summary:'This is not a finished strategy. It is a page for sharing our current working assumptions.', updated:'2026-09-15', tags:['plan','publicity'], blocks:[{type:'text',title:"What we're trying to achieve",body:'Give people who do not know HarmoQ yet a reason to think, “I’d like to see that,” at Kyudai Festival. Creating a reason to attend matters more than simply increasing the number of posts.'},{type:'split',left:{title:'Instagram',text:'Atmosphere / people / photos / Reels / posts worth saving'},right:{title:'X',text:'Announcements / updates / reminders / real-time information on the day'}},{type:'checklist',title:'Open questions',items:[{text:'What format should we use to introduce each band?',done:false},{text:'How much English should we include?',done:false},{text:'Should we make countdown posts?',done:false},{text:'Should we show behind-the-scenes rehearsal moments?',done:false}]},{type:'timeline',title:'Simple working rhythm',items:[{date:'NOW',title:'Collect',text:'Gather ideas.'},{date:'NEXT',title:'Choose',text:'Narrow them down to the plans we will make.'},{date:'THEN',title:'Create',text:'Produce visuals, copy, and posts.'},{date:'FESTIVAL',title:'Share',text:'Keep communicating through festival day.'}]}]}
  ],
  decisions: [{date:'2026-09-15',title:'Use Festival Notebook as the publicity team’s shared workspace',detail:'Start with four sections: Plan / Docs, Ideas, Mindmap, and Decisions.'}],
  starterIdeas: {'starter-1':{title:'Rehearsal mini-vlogs',text:'Share 15–25 second vertical clips from rehearsals. Show the atmosphere of preparation, not only the finished performance.',author:'sample'},'starter-2':{title:'One reason to watch each band',text:'Go beyond a biography and add one memorable detail that gives people a reason to see the band.',author:'sample'}},
  mapNodes: {
    root:{ja:'九大祭に来たくなる理由',en:'A reason to visit Kyudai Festival'},
    n1:{ja:'出演者の魅力',en:'People'}, n2:{ja:'パフォーマンス',en:'Performance'},
    n3:{ja:'九大祭の雰囲気',en:'Festival mood'}, n4:{ja:'役立つ情報',en:'Useful info'}
  }
};

const html = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const t = () => UI[currentLang];

function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(el._timer); el._timer=setTimeout(()=>el.classList.remove('show'),2200); }
async function loadData() { const response=await fetch('./data/site-data.json',{cache:'no-store'}); if(!response.ok) throw new Error('Could not load site data'); return response.json(); }
function localizedSite() { return currentLang==='en'?{...data.site,...EN_CONTENT.site}:data.site; }
function localizedDocuments() { return currentLang==='en'?EN_CONTENT.documents:data.documents; }
function localizedDecisions() { return currentLang==='en'?EN_CONTENT.decisions:data.decisions; }
function localizedIdea(idea) { return currentLang==='en'&&EN_CONTENT.starterIdeas[idea.id]?{...idea,...EN_CONTENT.starterIdeas[idea.id]}:idea; }
function localizedMapText(node) {
  const translation=EN_CONTENT.mapNodes[node.id];
  return translation&&[translation.ja,translation.en].includes(node.text)?translation[currentLang]:node.text;
}

function setTheme() {
  const site=localizedSite();
  if(data.site?.accent) document.documentElement.style.setProperty('--accent',data.site.accent);
  document.title=`${site.title} — ${site.subtitle}`;
  $('#brandTitle').textContent=site.title; $('#brandSubtitle').textContent=site.subtitle; $('#phaseStamp').textContent=site.phase; $('#heroTitle').textContent=site.title; $('#heroTagline').textContent=site.tagline;
  renderCountdown();
}

function renderCountdown() {
  const target=new Date(`${data.site.festivalDate}T00:00:00`); const days=Math.max(0,Math.ceil((target-new Date())/86400000));
  const date=Number.isNaN(target.getTime())?data.site.festivalDate:new Intl.DateTimeFormat(currentLang==='ja'?'ja-JP':'en-US',{year:'numeric',month:'long',day:'numeric'}).format(target);
  const unit=currentLang==='en'&&days===1?'DAY':t().countdownUnit;
  $('#countdownBox').innerHTML=`<div class="kicker">${t().countdownKicker}</div><div class="countdown">${Number.isFinite(days)?days:'—'} ${unit}</div><div class="small">${t().datePrefix}${html(date)}</div>`;
}

function initLanguageToggle() { $$('.language-toggle button').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.lang))); }
function setLanguage(lang) {
  currentLang=lang==='en'?'en':'ja'; document.documentElement.lang=currentLang; $('meta[name="description"]').content=t().pageDescription; $('.nav').setAttribute('aria-label',t().navLabel); $('.language-toggle').setAttribute('aria-label',t().languageLabel);
  $$('.language-toggle button').forEach(button=>{const active=button.dataset.lang===currentLang;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  $$('.nav button').forEach((button,index)=>{button.textContent=t().nav[index];});
  const textValues={planHeading:'planHeading',ideasHeading:'ideasHeading',ideasDescription:'ideasDescription',mindmapHeading:'mindmapHeading',mindmapDescription:'mindmapDescription',decisionsHeading:'decisionsHeading',decisionsDescription:'decisionsDescription',ideaTitleLabel:'titleLabel',ideaCategoryLabel:'categoryLabel',ideaTextLabel:'textLabel',postIdeaBtn:'postIdea',ideaFilterLabel:'filter',addRootBtn:'addRoot',resetMapBtn:'resetMap',mapHelp:'mapHelp'};
  Object.entries(textValues).forEach(([id,key])=>{$(`#${id}`).textContent=t()[key];});
  $('#view-plan .section-head p').textContent=t().planDescription; $('#ideaTitle').placeholder=t().titlePlaceholder; $('#ideaText').placeholder=t().textPlaceholder; $('#ideaAuthorLabel').innerHTML=t().authorLabel; $('#ideaAuthor').placeholder=t().authorPlaceholder;
  ['ideaCategory','ideaFilter'].forEach(id=>$(`#${id}`).querySelectorAll('option').forEach(option=>{option.textContent=t().categories[option.value];}));
  setTheme(); renderGuide();
  if(data){renderDocList();renderIdeas();renderDecisions();renderMindmap();updateSyncMode();}
}

function initGuide() {
  const frames=Array.from({length:6},(_,index)=>`./assets/dialogueAni1/harmoq_cat_0${index+1}.png`);
  frames.forEach(src=>{const image=new Image();image.src=src;});
  setInterval(()=>{spriteFrame=(spriteFrame+1)%frames.length;$('#ideaGuideSprite').src=frames[spriteFrame];},170);
  $('#ideaGuideNext').addEventListener('click',()=>{guideStep=(guideStep+1)%t().guideSteps.length;renderGuide();});
  $('#ideaGuideClose').addEventListener('click',()=>{$('#ideaGuide').hidden=true;$('#ideaGuideShow').hidden=false;});
  $('#ideaGuideShow').addEventListener('click',()=>{$('#ideaGuide').hidden=false;$('#ideaGuideShow').hidden=true;});
  renderGuide();
}
function renderGuide() { const steps=t().guideSteps;guideStep%=steps.length;$('#ideaGuideTitle').textContent=t().guideTitle;$('#ideaGuideText').textContent=steps[guideStep];$('#ideaGuideProgress').textContent=`${guideStep+1} / ${steps.length}`;$('#ideaGuideNext').textContent=guideStep===steps.length-1?t().guideRestart:t().guideNext;$('#ideaGuideClose').setAttribute('aria-label',t().guideHide);$('#ideaGuideShow').textContent=t().guideShow; }

function initTabs() {
  $$('.nav button').forEach(btn=>btn.addEventListener('click',()=>{$$('.nav button').forEach(item=>item.classList.toggle('active',item===btn));$$('.view').forEach(view=>view.classList.remove('active'));$(`#view-${btn.dataset.view}`).classList.add('active');history.replaceState(null,'',`#${btn.dataset.view}`);if(btn.dataset.view==='mindmap')requestAnimationFrame(renderMindmap);}));
  const target=$(`.nav button[data-view="${location.hash.replace('#','')}"]`);if(target)target.click();
}

function renderDocList() { const documents=localizedDocuments();$('#docList').innerHTML=documents.map(doc=>`<button data-doc="${html(doc.id)}">${html(doc.eyebrow||'')}<br><strong>${html(doc.title)}</strong></button>`).join('');$$('#docList button').forEach(btn=>btn.addEventListener('click',()=>selectDoc(btn.dataset.doc)));currentDocId=currentDocId||documents[0]?.id;selectDoc(currentDocId); }
function selectDoc(id) { currentDocId=id;$$('#docList button').forEach(button=>button.classList.toggle('active',button.dataset.doc===id));const doc=localizedDocuments().find(item=>item.id===id);if(doc)$('#docPage').innerHTML=renderDocument(doc); }
function renderDocument(doc) { return `<div class="doc-eyebrow">${html(doc.eyebrow||'')}</div><h2>${html(doc.title)}</h2><div class="doc-summary">${html(doc.summary||'')}</div><div class="doc-meta">${(doc.tags||[]).map(tag=>`<span class="tag">${html(tag)}</span>`).join('')}${doc.updated?`<span class="tag">${t().updated} ${html(doc.updated)}</span>`:''}</div>${(doc.blocks||[]).map(renderBlock).join('')}`; }
function renderBlock(block) {
  if(block.type==='text')return`<section class="block"><h3>${html(block.title||'')}</h3><p>${html(block.body||'').replaceAll('\n','<br>')}</p></section>`;
  if(block.type==='callout')return`<section class="block callout"><h3>${html(block.title||'')}</h3><p>${html(block.text||'')}</p></section>`;
  if(block.type==='split')return`<section class="block split"><div class="split-card"><h3>${html(block.left?.title||'')}</h3><p>${html(block.left?.text||'')}</p></div><div class="split-card"><h3>${html(block.right?.title||'')}</h3><p>${html(block.right?.text||'')}</p></div></section>`;
  if(block.type==='cards')return`<section class="block cards-grid">${(block.items||[]).map(item=>`<div class="mini-card"><h4>${html(item.title)}</h4><p>${html(item.text)}</p></div>`).join('')}</section>`;
  if(block.type==='checklist')return`<section class="block"><h3>${html(block.title||'')}</h3><div class="checklist">${(block.items||[]).map(item=>`<div class="checkitem ${item.done?'done':''}"><span class="checkbox"></span><span>${html(item.text)}</span></div>`).join('')}</div></section>`;
  if(block.type==='timeline')return`<section class="block"><h3>${html(block.title||'')}</h3><div class="timeline">${(block.items||[]).map(item=>`<div class="timeline-item"><div class="date">${html(item.date||'')}</div><strong>${html(item.title||'')}</strong><p>${html(item.text||'')}</p></div>`).join('')}</div></section>`;
  if(block.type==='quote')return`<section class="block callout" style="background:var(--accent-soft)"><h3>${html(block.title||'')}</h3><p>${html(block.text||'')}</p></section>`;
  if(block.type==='links')return`<section class="block"><h3>${html(block.title||'')}</h3><div class="admin-list">${(block.items||[]).map(item=>`<a class="admin-item" href="${html(item.url)}" target="_blank" rel="noopener"><div class="meta"><strong>${html(item.label)}</strong><span>${html(item.note||'')}</span></div><span>↗</span></a>`).join('')}</div></section>`;
  return'';
}

function localIdeaKey(){return'festivalNotebookIdeasV1';}
function loadLocalIdeas(){try{return JSON.parse(localStorage.getItem(localIdeaKey())||'[]');}catch{return[];}}
function saveLocalIdeas(items){localStorage.setItem(localIdeaKey(),JSON.stringify(items));}
async function initIdeas(){const cloud=await initCloud();if(cloud.enabled){const cloudIdeas=await getIdeas();ideas=[...(data.starterIdeas||[]),...(cloudIdeas||[])];const cloudMap=await getMindmap('main');activeMap=cloudMap||structuredClone(data.mindmaps?.[0]||{id:'main',title:'Mindmap',nodes:[]});if(!cloudMap)await saveMindmap(activeMap);}else{ideas=[...(data.starterIdeas||[]),...loadLocalIdeas()];activeMap=loadLocalMindmap()||structuredClone(data.mindmaps?.[0]||{id:'main',title:'Mindmap',nodes:[]});}updateSyncMode();renderIdeas();bindIdeaForm();}
function updateSyncMode(){if($('#syncMode'))$('#syncMode').innerHTML=cloudEnabled()?t().sharedMode:t().localMode;}
function renderIdeas(){const category=$('#ideaFilter')?.value||'ALL';const list=category==='ALL'?ideas:ideas.filter(idea=>idea.category===category);$('#ideaGrid').innerHTML=list.length?list.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(raw=>{const idea=localizedIdea(raw);return`<article class="idea-card"><div class="cat">${html(t().categories[idea.category]||idea.category||'IDEA')}</div><h3>${html(idea.title)}</h3><p>${html(idea.text||'')}</p><footer><span>${html(idea.author||t().anonymous)}</span><span>${html(String(idea.createdAt||'').slice(0,10))}</span></footer></article>`;}).join(''):`<div class="empty">${t().noIdeas}</div>`;}
function bindIdeaForm(){$('#ideaFilter').addEventListener('change',renderIdeas);$('#ideaForm').addEventListener('submit',async event=>{event.preventDefault();const form=new FormData(event.currentTarget);const idea={title:String(form.get('title')||'').trim(),category:String(form.get('category')||'OTHER'),text:String(form.get('text')||'').trim(),author:String(form.get('author')||'').trim(),createdAt:new Date().toISOString()};if(!idea.title||!idea.text)return;try{if(cloudEnabled()){ideas.push(await addIdea(idea));toast(t().ideaPosted);}else{idea.id=crypto.randomUUID();const local=loadLocalIdeas();local.push(idea);saveLocalIdeas(local);ideas.push(idea);toast(t().ideaSaved);}event.currentTarget.reset();renderIdeas();}catch(error){console.error(error);toast(t().ideaFailed);}});}
function renderDecisions(){const decisions=localizedDecisions()||[];$('#decisions').innerHTML=decisions.length?decisions.map(item=>`<article class="decision"><div class="date">${html(item.date)}</div><div><h3>${html(item.title)}</h3><p>${html(item.detail||'')}</p></div></article>`).join(''):`<div class="empty">${t().noDecisions}</div>`;}

function localMapKey(){return'festivalNotebookMindmapV1';}
function loadLocalMindmap(){try{return JSON.parse(localStorage.getItem(localMapKey())||'null');}catch{return null;}}
function saveLocalMindmap(map){localStorage.setItem(localMapKey(),JSON.stringify(map));}
function bindMindmapToolbar(){$('#resetMapBtn').addEventListener('click',async()=>{if(!confirm(t().resetConfirm))return;activeMap=structuredClone(data.mindmaps?.[0]||{id:'main',title:'Mindmap',nodes:[]});await persistMap(true);renderMindmap();});$('#addRootBtn').addEventListener('click',async()=>{const text=prompt(t().newIdeaPrompt);if(!text)return;activeMap.nodes.push({id:crypto.randomUUID(),parentId:null,text,x:80+Math.random()*500,y:80+Math.random()*350});await persistMap();renderMindmap();});}
function scheduleMapSave(){clearTimeout(saveMapTimer);saveMapTimer=setTimeout(()=>persistMap(),450);}
async function persistMap(forceToast=false){try{if(cloudEnabled())await saveMindmap(activeMap);else saveLocalMindmap(activeMap);if(forceToast)toast(t().mapSaved);}catch(error){console.error(error);toast(t().mapFailed);}}
function renderMindmap(){if(!activeMap)return;const canvas=$('#mindmapCanvas');$$('.map-node',canvas).forEach(item=>item.remove());activeMap.nodes.forEach(node=>{const element=document.createElement('div');element.className=`map-node ${node.id==='root'?'root':''}`;element.dataset.id=node.id;element.style.left=`${node.x}px`;element.style.top=`${node.y}px`;element.innerHTML=`<strong>${html(localizedMapText(node))}</strong><div class="node-actions"><button data-action="child">${t().childAction}</button><button data-action="edit">${t().editAction}</button>${node.id!=='root'?'<button data-action="delete">×</button>':''}</div>`;canvas.appendChild(element);makeDraggable(element,node);element.querySelectorAll('button').forEach(button=>button.addEventListener('pointerdown',event=>event.stopPropagation()));element.addEventListener('click',async event=>{const action=event.target?.dataset?.action;if(!action)return;event.stopPropagation();if(action==='child'){const text=prompt(t().childPrompt);if(!text)return;activeMap.nodes.push({id:crypto.randomUUID(),parentId:node.id,text,x:node.x+220,y:node.y+20+Math.random()*120});}if(action==='edit'){const text=prompt(t().editPrompt,node.text);if(!text)return;node.text=text;}if(action==='delete'){const descendants=collectDescendants(node.id);activeMap.nodes=activeMap.nodes.filter(item=>![node.id,...descendants].includes(item.id));}await persistMap();renderMindmap();});});requestAnimationFrame(drawLines);}
function collectDescendants(id){const output=[];const walk=parent=>activeMap.nodes.filter(node=>node.parentId===parent).forEach(node=>{output.push(node.id);walk(node.id);});walk(id);return output;}
function drawLines(){if(!activeMap)return;const svg=$('#mindmapLines'),wrap=$('#mindmapCanvas'),wrapRect=wrap.getBoundingClientRect();svg.innerHTML='';activeMap.nodes.filter(node=>node.parentId).forEach(node=>{const child=$(`.map-node[data-id="${CSS.escape(node.id)}"]`,wrap),parent=$(`.map-node[data-id="${CSS.escape(node.parentId)}"]`,wrap);if(!child||!parent)return;const a=parent.getBoundingClientRect(),b=child.getBoundingClientRect(),x1=a.left-wrapRect.left+a.width/2,y1=a.top-wrapRect.top+a.height/2,x2=b.left-wrapRect.left+b.width/2,y2=b.top-wrapRect.top+b.height/2,dx=Math.max(40,Math.abs(x2-x1)*.45),direction=x2>=x1?1:-1,path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${x1} ${y1} C ${x1+dx*direction} ${y1}, ${x2-dx*direction} ${y2}, ${x2} ${y2}`);path.setAttribute('fill','none');path.setAttribute('stroke','#716c63');path.setAttribute('stroke-width','2');path.setAttribute('stroke-dasharray','5 5');svg.appendChild(path);});}
function makeDraggable(element,node){let start=null;element.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;start={px:event.clientX,py:event.clientY,x:node.x,y:node.y};element.setPointerCapture(event.pointerId);});element.addEventListener('pointermove',event=>{if(!start)return;node.x=Math.max(0,start.x+event.clientX-start.px);node.y=Math.max(0,start.y+event.clientY-start.py);element.style.left=`${node.x}px`;element.style.top=`${node.y}px`;drawLines();});element.addEventListener('pointerup',()=>{if(start)scheduleMapSave();start=null;});element.addEventListener('pointercancel',()=>{start=null;});}

async function main(){try{data=await loadData();initLanguageToggle();initTabs();initGuide();bindMindmapToolbar();setLanguage('ja');$('#syncMode').innerHTML=t().checkingMode;await initIdeas();renderMindmap();window.addEventListener('resize',drawLines);}catch(error){console.error(error);document.body.innerHTML=`<div class="lock-screen"><h1>${t().loadErrorTitle}</h1><p>${html(error.message)}</p><p>${t().loadErrorHelp}</p></div>`;}}
main();
