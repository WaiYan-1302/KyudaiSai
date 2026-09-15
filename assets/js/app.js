import { APP_CONFIG } from './config.js';
import { initCloud, getIdeas, addIdea, cloudEnabled, getMindmap, saveMindmap } from './cloud.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let data;
let currentDocId;
let ideas = [];
let activeMap = null;
let saveMapTimer = null;

const html = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

async function loadData() {
  const res = await fetch('./data/site-data.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load site data');
  return res.json();
}

function setTheme() {
  if (data.site?.accent) document.documentElement.style.setProperty('--accent', data.site.accent);
  document.title = `${data.site.title} — ${data.site.subtitle}`;
  $('#brandTitle').textContent = data.site.title;
  $('#brandSubtitle').textContent = data.site.subtitle;
  $('#phaseStamp').textContent = data.site.phase;
  $('#heroTitle').textContent = data.site.title;
  $('#heroTagline').textContent = data.site.tagline;
  renderCountdown();
}

function renderCountdown() {
  const box = $('#countdownBox');
  const target = new Date(`${data.site.festivalDate}T00:00:00`);
  const now = new Date();
  const days = Math.max(0, Math.ceil((target - now) / 86400000));
  box.innerHTML = `
    <div class="kicker">FESTIVAL COUNTDOWN</div>
    <div class="countdown">${Number.isFinite(days) ? days : '—'} DAYS</div>
    <div class="small">until ${html(data.site.festivalDate || '')}</div>`;
}

function initTabs() {
  $$('.nav button').forEach(btn => btn.addEventListener('click', () => {
    $$('.nav button').forEach(b => b.classList.toggle('active', b === btn));
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#view-${btn.dataset.view}`).classList.add('active');
    history.replaceState(null, '', `#${btn.dataset.view}`);
    if (btn.dataset.view === 'mindmap') requestAnimationFrame(renderMindmap);
  }));
  const wanted = location.hash.replace('#', '');
  const target = $(`.nav button[data-view="${wanted}"]`);
  if (target) target.click();
}

function renderDocList() {
  const list = $('#docList');
  list.innerHTML = data.documents.map(doc => `
    <button data-doc="${html(doc.id)}">${html(doc.eyebrow || '')}<br><strong>${html(doc.title)}</strong></button>
  `).join('');
  $$('#docList button').forEach(btn => btn.addEventListener('click', () => selectDoc(btn.dataset.doc)));
  currentDocId = currentDocId || data.documents[0]?.id;
  selectDoc(currentDocId);
}

function selectDoc(id) {
  currentDocId = id;
  $$('#docList button').forEach(b => b.classList.toggle('active', b.dataset.doc === id));
  const doc = data.documents.find(d => d.id === id);
  if (!doc) return;
  $('#docPage').innerHTML = renderDocument(doc);
}

function renderDocument(doc) {
  return `
    <div class="doc-eyebrow">${html(doc.eyebrow || '')}</div>
    <h2>${html(doc.title)}</h2>
    <div class="doc-summary">${html(doc.summary || '')}</div>
    <div class="doc-meta">
      ${(doc.tags || []).map(t => `<span class="tag">${html(t)}</span>`).join('')}
      ${doc.updated ? `<span class="tag">UPDATED ${html(doc.updated)}</span>` : ''}
    </div>
    ${(doc.blocks || []).map(renderBlock).join('')}
  `;
}

function renderBlock(block) {
  if (block.type === 'text') return `<section class="block"><h3>${html(block.title || '')}</h3><p>${html(block.body || '').replaceAll('\n','<br>')}</p></section>`;
  if (block.type === 'callout') return `<section class="block callout"><h3>${html(block.title || 'NOTE')}</h3><p>${html(block.text || '')}</p></section>`;
  if (block.type === 'split') return `<section class="block split">
      <div class="split-card"><h3>${html(block.left?.title || '')}</h3><p>${html(block.left?.text || '')}</p></div>
      <div class="split-card"><h3>${html(block.right?.title || '')}</h3><p>${html(block.right?.text || '')}</p></div>
    </section>`;
  if (block.type === 'cards') return `<section class="block cards-grid">${(block.items || []).map(i => `<div class="mini-card"><h4>${html(i.title)}</h4><p>${html(i.text)}</p></div>`).join('')}</section>`;
  if (block.type === 'checklist') return `<section class="block"><h3>${html(block.title || '')}</h3><div class="checklist">${(block.items || []).map(i => `<div class="checkitem ${i.done ? 'done':''}"><span class="checkbox"></span><span>${html(i.text)}</span></div>`).join('')}</div></section>`;
  if (block.type === 'timeline') return `<section class="block"><h3>${html(block.title || '')}</h3><div class="timeline">${(block.items || []).map(i => `<div class="timeline-item"><div class="date">${html(i.date || '')}</div><strong>${html(i.title || '')}</strong><p>${html(i.text || '')}</p></div>`).join('')}</div></section>`;
  if (block.type === 'quote') return `<section class="block callout" style="background:var(--accent-soft)"><h3>${html(block.title || 'QUOTE')}</h3><p>${html(block.text || '')}</p></section>`;
  if (block.type === 'links') return `<section class="block"><h3>${html(block.title || 'Links')}</h3><div class="admin-list">${(block.items || []).map(i => `<a class="admin-item" href="${html(i.url)}" target="_blank" rel="noopener"><div class="meta"><strong>${html(i.label)}</strong><span>${html(i.note || '')}</span></div><span>↗</span></a>`).join('')}</div></section>`;
  return '';
}

function localIdeaKey() { return 'festivalNotebookIdeasV1'; }
function loadLocalIdeas() {
  try { return JSON.parse(localStorage.getItem(localIdeaKey()) || '[]'); }
  catch { return []; }
}
function saveLocalIdeas(items) { localStorage.setItem(localIdeaKey(), JSON.stringify(items)); }

async function initIdeas() {
  const cloud = await initCloud();
  const mode = $('#syncMode');
  if (cloud.enabled) {
    mode.innerHTML = '<strong>Shared mode:</strong> Ideas and mindmaps sync through Firebase.';
    const cloudIdeas = await getIdeas();
    ideas = [...(data.starterIdeas || []), ...(cloudIdeas || [])];
    const cloudMap = await getMindmap('main');
    activeMap = cloudMap || structuredClone(data.mindmaps?.[0] || { id:'main', title:'Mindmap', nodes:[] });
    if (!cloudMap) await saveMindmap(activeMap);
  } else {
    mode.innerHTML = '<strong>Local demo mode:</strong> submissions are saved only in this browser. Enable Firebase in <code>assets/js/config.js</code> for team-wide sharing.';
    ideas = [...(data.starterIdeas || []), ...loadLocalIdeas()];
    activeMap = loadLocalMindmap() || structuredClone(data.mindmaps?.[0] || { id:'main', title:'Mindmap', nodes:[] });
  }
  renderIdeas();
  bindIdeaForm();
}

function renderIdeas() {
  const category = $('#ideaFilter')?.value || 'ALL';
  const list = category === 'ALL' ? ideas : ideas.filter(i => i.category === category);
  $('#ideaGrid').innerHTML = list.length ? list
    .slice()
    .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(i => `<article class="idea-card">
      <div class="cat">${html(i.category || 'IDEA')}</div>
      <h3>${html(i.title)}</h3>
      <p>${html(i.text || '')}</p>
      <footer><span>${html(i.author || 'anonymous')}</span><span>${html(String(i.createdAt || '').slice(0,10))}</span></footer>
    </article>`).join('') : '<div class="empty">No ideas in this category yet.</div>';
}

function bindIdeaForm() {
  $('#ideaFilter').addEventListener('change', renderIdeas);
  $('#ideaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const idea = {
      title: String(fd.get('title') || '').trim(),
      category: String(fd.get('category') || 'OTHER'),
      text: String(fd.get('text') || '').trim(),
      author: String(fd.get('author') || '').trim() || 'anonymous',
      createdAt: new Date().toISOString()
    };
    if (!idea.title || !idea.text) return;
    try {
      if (cloudEnabled()) {
        const created = await addIdea(idea);
        ideas.push(created);
        toast('Shared idea posted.');
      } else {
        idea.id = crypto.randomUUID();
        const local = loadLocalIdeas();
        local.push(idea);
        saveLocalIdeas(local);
        ideas.push(idea);
        toast('Idea saved in this browser.');
      }
      e.currentTarget.reset();
      renderIdeas();
    } catch (err) {
      console.error(err);
      toast('Could not post idea. Check cloud setup.');
    }
  });
}

function renderDecisions() {
  $('#decisions').innerHTML = (data.decisions || []).length ? data.decisions.map(d => `
    <article class="decision">
      <div class="date">${html(d.date)}</div>
      <div><h3>${html(d.title)}</h3><p>${html(d.detail || '')}</p></div>
    </article>`).join('') : '<div class="empty">No decisions yet.</div>';
}

function localMapKey() { return 'festivalNotebookMindmapV1'; }
function loadLocalMindmap() {
  try { return JSON.parse(localStorage.getItem(localMapKey()) || 'null'); }
  catch { return null; }
}
function saveLocalMindmap(map) { localStorage.setItem(localMapKey(), JSON.stringify(map)); }

function bindMindmapToolbar() {
  $('#resetMapBtn').addEventListener('click', async () => {
    if (!confirm('Reset the mindmap to the starter version?')) return;
    activeMap = structuredClone(data.mindmaps?.[0] || { id:'main', title:'Mindmap', nodes:[] });
    await persistMap(true);
    renderMindmap();
  });
  $('#addRootBtn').addEventListener('click', async () => {
    const text = prompt('New floating idea');
    if (!text) return;
    activeMap.nodes.push({ id:crypto.randomUUID(), parentId:null, text, x:80 + Math.random()*500, y:80 + Math.random()*350 });
    await persistMap();
    renderMindmap();
  });
}

function scheduleMapSave() {
  clearTimeout(saveMapTimer);
  saveMapTimer = setTimeout(() => persistMap(), 450);
}

async function persistMap(forceToast = false) {
  try {
    if (cloudEnabled()) await saveMindmap(activeMap);
    else saveLocalMindmap(activeMap);
    if (forceToast) toast('Mindmap saved.');
  } catch (e) {
    console.error(e);
    toast('Mindmap save failed.');
  }
}

function renderMindmap() {
  if (!activeMap) return;
  const canvas = $('#mindmapCanvas');
  const oldNodes = $$('.map-node', canvas);
  oldNodes.forEach(n => n.remove());
  activeMap.nodes.forEach(node => {
    const el = document.createElement('div');
    el.className = `map-node ${node.id === 'root' ? 'root' : ''}`;
    el.dataset.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.innerHTML = `<strong>${html(node.text)}</strong><div class="node-actions"><button data-action="child">+ child</button><button data-action="edit">edit</button>${node.id !== 'root' ? '<button data-action="delete">×</button>' : ''}</div>`;
    canvas.appendChild(el);
    makeDraggable(el, node);
    el.querySelectorAll('button').forEach(btn => btn.addEventListener('pointerdown', e => e.stopPropagation()));
    el.addEventListener('click', async (e) => {
      const action = e.target?.dataset?.action;
      if (!action) return;
      e.stopPropagation();
      if (action === 'child') {
        const text = prompt('Child idea');
        if (!text) return;
        activeMap.nodes.push({ id:crypto.randomUUID(), parentId:node.id, text, x:node.x + 220, y:node.y + 20 + Math.random()*120 });
      }
      if (action === 'edit') {
        const text = prompt('Edit text', node.text);
        if (!text) return;
        node.text = text;
      }
      if (action === 'delete') {
        const descendants = collectDescendants(node.id);
        activeMap.nodes = activeMap.nodes.filter(n => ![node.id, ...descendants].includes(n.id));
      }
      await persistMap();
      renderMindmap();
    });
  });
  requestAnimationFrame(drawLines);
}

function collectDescendants(id) {
  const out = [];
  const walk = parent => activeMap.nodes.filter(n => n.parentId === parent).forEach(n => { out.push(n.id); walk(n.id); });
  walk(id); return out;
}

function drawLines() {
  const svg = $('#mindmapLines');
  const wrap = $('#mindmapCanvas');
  const wrapRect = wrap.getBoundingClientRect();
  svg.innerHTML = '';
  activeMap.nodes.filter(n => n.parentId).forEach(node => {
    const childEl = $(`.map-node[data-id="${CSS.escape(node.id)}"]`, wrap);
    const parentEl = $(`.map-node[data-id="${CSS.escape(node.parentId)}"]`, wrap);
    if (!childEl || !parentEl) return;
    const a = parentEl.getBoundingClientRect();
    const b = childEl.getBoundingClientRect();
    const x1 = a.left - wrapRect.left + a.width/2;
    const y1 = a.top - wrapRect.top + a.height/2;
    const x2 = b.left - wrapRect.left + b.width/2;
    const y2 = b.top - wrapRect.top + b.height/2;
    const dx = Math.max(40, Math.abs(x2-x1)*.45);
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    const dir = x2 >= x1 ? 1 : -1;
    path.setAttribute('d', `M ${x1} ${y1} C ${x1+dx*dir} ${y1}, ${x2-dx*dir} ${y2}, ${x2} ${y2}`);
    path.setAttribute('fill','none');
    path.setAttribute('stroke','#716c63');
    path.setAttribute('stroke-width','2');
    path.setAttribute('stroke-dasharray','5 5');
    svg.appendChild(path);
  });
}

function makeDraggable(el, node) {
  let start = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    start = { px:e.clientX, py:e.clientY, x:node.x, y:node.y };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!start) return;
    node.x = Math.max(0, start.x + e.clientX - start.px);
    node.y = Math.max(0, start.y + e.clientY - start.py);
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    drawLines();
  });
  el.addEventListener('pointerup', () => { if (start) scheduleMapSave(); start = null; });
  el.addEventListener('pointercancel', () => { start = null; });
}

async function main() {
  try {
    data = await loadData();
    setTheme();
    initTabs();
    renderDocList();
    renderDecisions();
    bindMindmapToolbar();
    await initIdeas();
    renderMindmap();
    window.addEventListener('resize', drawLines);
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `<div class="lock-screen"><h1>Could not load the notebook</h1><p>${html(e.message)}</p><p>GitHub Pages must serve the folder over HTTP; opening index.html directly from your computer can block JSON loading.</p></div>`;
  }
}

main();
