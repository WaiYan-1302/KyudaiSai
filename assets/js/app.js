import { initCloud, getIdeas, addIdea, cloudEnabled, getMindmap, saveMindmap, getTimeline, saveTimeline } from './cloud.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let data;
let currentDocId;
let ideas = [];
let activeMap = null;
let activeTimeline = null;
let saveMapTimer = null;
let currentLang = 'ja';
let guideStep = 0;
let spriteFrame = 0;
let planGuideStep = 0;
let planSpriteFrame = 0;
let timelineModalLastFocus = null;

const UI = {
  ja: {
    pageDescription: '九大祭広報チームの企画ノート', navLabel: 'メインナビゲーション', languageLabel: '表示言語',
    nav: ['01 企画・資料', '02 アイデア', '03 マインドマップ', '04 決定事項', '05 タイムライン'],
    countdownKicker: '九大祭まであと', countdownUnit: '日', datePrefix: '開催日：',
    planHeading: '企画・資料', planDescription: '資料を「ファイルの山」ではなく、読みやすいページとして共有する場所。',
    ideasHeading: 'アイデアボード', ideasDescription: '完成していなくて大丈夫。思いついた段階で共有して、みんなで育てよう。',
    mindmapHeading: 'マインドマップ', mindmapDescription: 'カードをドラッグして移動。「子アイデアを追加」で枝を伸ばせます。共有モードなら、全員で同じマップを編集できます。',
    decisionsHeading: '決定事項', decisionsDescription: '会議やLINEで決まったことを短く記録。「結局どうなった？」を防ぐためのページです。',
    timelineHeading: 'タイムライン', timelineDescription: '九大祭までの広報タスクを共有。項目やマーカーを押すと、詳細の確認・編集ができます。', addTimeline: '+ 予定を追加',
    timelineStatuses: {planned:'予定',active:'進行中',done:'完了'}, timelineOpenHint: '押して詳細・編集 →', timelineTotal: '全体', timelineEmpty: 'まだ予定がありません。「予定を追加」から始めましょう。',
    timelineShared: '<strong>共有モード：</strong> タイムラインの編集はFirebaseでチームに保存されます。', timelineLocal: '<strong>ローカル体験モード：</strong> タイムラインの編集はこのブラウザに保存されます。',
    timelineModalNew: '予定を追加', timelineModalEdit: '予定の詳細・編集', timelineDate: '日付', timelineDateText: '表示する日付', timelineDatePlaceholder: '例：9月後半〜', timelineTitle: 'タイトル', timelineDetails: '詳細', timelineStatus: '状態', timelineSave: '保存', timelineDelete: '削除', timelineClose: '閉じる', timelineDeleteConfirm: 'この予定を削除しますか？', timelineSaved: 'タイムラインを保存しました。', timelineDeleted: '予定を削除しました。', timelineFailed: 'タイムラインを保存できませんでした。',
    titleLabel: 'アイデアのタイトル', titlePlaceholder: '例：練習ミニVlog', categoryLabel: 'カテゴリー', textLabel: 'どんなアイデア？', textPlaceholder: '短くてOK。どんな内容？', authorLabel: '名前 <span style="font-weight:400">（任意）</span>', authorPlaceholder: '匿名', postIdea: 'アイデアを投稿 →',
    filter: '絞り込み', categories: { ALL: 'すべて', INSTAGRAM: 'Instagram', X: 'X', VIDEO: '動画', 'POSTER / FLYER': 'ポスター・チラシ', 'ON CAMPUS': '学内企画', OTHER: 'その他' },
    checkingMode: '共有モードを確認中…', sharedMode: '<strong>共有モード：</strong> アイデアとマインドマップはFirebaseでチームに共有されます。', localMode: '<strong>ローカル体験モード：</strong> 投稿はこのブラウザにのみ保存されます。チームで共有するには <code>assets/js/config.js</code> でFirebaseを有効にしてください。',
    noIdeas: 'このカテゴリーにはまだアイデアがありません。', anonymous: '匿名', ideaPosted: 'アイデアをチームに共有しました。', ideaSaved: 'アイデアをこのブラウザに保存しました。', ideaFailed: '投稿できませんでした。共有設定を確認してください。',
    addRoot: '+ 単独アイデア', resetMap: '初期状態に戻す', mapHelp: 'ヒント：スマホでもカードをドラッグできます。枝を削除すると、その下の子アイデアもまとめて削除されます。', resetConfirm: 'マインドマップを初期状態に戻しますか？', newIdeaPrompt: '新しい単独アイデア', childPrompt: '子アイデア', editPrompt: 'テキストを編集', childAction: '+ 子アイデア', editAction: '編集', mapSaved: 'マインドマップを保存しました。', mapFailed: 'マインドマップを保存できませんでした。',
    noDecisions: 'まだ決定事項はありません。', updated: '更新', guideTitle: 'NOTEBOOK GUIDE', guideNext: '次へ →', guideRestart: '最初へ ↺', guideHide: 'ガイドを隠す', guideShow: '💡 使い方ガイドを表示',
    guideSteps: ['ここは、思いつきを気軽に持ち寄る場所だよ。完成していなくても大丈夫！', '左のフォームにタイトルと内容を書いて、「アイデアを投稿」を押してね。名前は空欄でもOK。', '「絞り込み」を使うと、SNSや動画などカテゴリー別にアイデアを見られるよ。', 'まずは小さなひらめきから。みんなのアイデアを組み合わせて、HarmoQへ会いに行くきっかけを届けよう！'],
    planGuideSteps: ['ここは、九大祭広報の方針や資料をまとめて読む場所だよ。', '左の一覧から読みたいページを選ぶと、右側に内容が表示されるよ。', 'まずは「広報プラン」を開いて、今の方向性・投稿案・スケジュールを確認してね。', '内容はまだ相談中。気づいたことや提案があれば、アイデアタブで共有しよう！'],
    loadErrorTitle: 'ノートを読み込めませんでした', loadErrorHelp: 'GitHub PagesなどのHTTPサーバーから開いてください。index.htmlを直接開くと、JSONの読み込みがブロックされることがあります。'
  },
  en: {
    pageDescription: 'Kyudai Festival publicity team planning notebook', navLabel: 'Main navigation', languageLabel: 'Display language', nav: ['01 PLAN / DOCS', '02 IDEAS', '03 MINDMAP', '04 DECISIONS', '05 TIMELINE'], countdownKicker: 'FESTIVAL COUNTDOWN', countdownUnit: 'DAYS', datePrefix: 'until ',
    planHeading: 'Plan / Docs', planDescription: 'A place to share materials as readable pages, rather than as a pile of files.', ideasHeading: 'Idea Wall', ideasDescription: 'Ideas do not have to be finished. Share a spark now, then help it grow together.', mindmapHeading: 'Mindmap', mindmapDescription: 'Drag cards to move them. Use “+ child idea” to grow a branch. In shared mode, everyone can edit the same map.', decisionsHeading: 'Decisions', decisionsDescription: 'Keep a short record of what was decided in meetings or on LINE, so nobody has to ask, “What did we decide?”',
    timelineHeading: 'Timeline', timelineDescription: 'Share publicity tasks leading up to Kyudai Festival. Select an item or marker to read its details and edit it.', addTimeline: '+ ADD MILESTONE',
    timelineStatuses: {planned:'PLANNED',active:'IN PROGRESS',done:'DONE'}, timelineOpenHint: 'OPEN DETAILS / EDIT →', timelineTotal: 'TOTAL', timelineEmpty: 'No milestones yet. Select “Add milestone” to create the first one.',
    timelineShared: '<strong>Shared mode:</strong> Timeline edits are saved to Firebase for the team.', timelineLocal: '<strong>Local demo mode:</strong> Timeline edits are saved in this browser.',
    timelineModalNew: 'Add milestone', timelineModalEdit: 'Milestone details / Edit', timelineDate: 'DATE', timelineDateText: 'DISPLAY DATE', timelineDatePlaceholder: 'e.g. Late September', timelineTitle: 'TITLE', timelineDetails: 'DESCRIPTION', timelineStatus: 'STATUS', timelineSave: 'SAVE', timelineDelete: 'DELETE', timelineClose: 'Close', timelineDeleteConfirm: 'Delete this milestone?', timelineSaved: 'Timeline saved.', timelineDeleted: 'Milestone deleted.', timelineFailed: 'Could not save the timeline.',
    titleLabel: 'IDEA TITLE', titlePlaceholder: 'e.g. Rehearsal mini-vlog', categoryLabel: 'CATEGORY', textLabel: "WHAT'S THE IDEA?", textPlaceholder: 'A short description is enough.', authorLabel: 'YOUR NAME <span style="font-weight:400">(optional)</span>', authorPlaceholder: 'anonymous', postIdea: 'POST IDEA →', filter: 'FILTER', categories: { ALL: 'ALL', INSTAGRAM: 'INSTAGRAM', X: 'X', VIDEO: 'VIDEO', 'POSTER / FLYER': 'POSTER / FLYER', 'ON CAMPUS': 'ON CAMPUS', OTHER: 'OTHER' },
    checkingMode: 'Checking sharing mode…', sharedMode: '<strong>Shared mode:</strong> Ideas and mindmaps sync through Firebase.', localMode: '<strong>Local demo mode:</strong> submissions are saved only in this browser. Enable Firebase in <code>assets/js/config.js</code> for team-wide sharing.', noIdeas: 'No ideas in this category yet.', anonymous: 'anonymous', ideaPosted: 'Idea shared with the team.', ideaSaved: 'Idea saved in this browser.', ideaFailed: 'Could not post the idea. Please check the sharing setup.',
    addRoot: '+ Floating idea', resetMap: 'Reset starter map', mapHelp: 'Tip: You can drag cards on a phone too. Deleting a branch also removes all of its child ideas.', resetConfirm: 'Reset the mindmap to the starter version?', newIdeaPrompt: 'New floating idea', childPrompt: 'Child idea', editPrompt: 'Edit text', childAction: '+ child idea', editAction: 'edit', mapSaved: 'Mindmap saved.', mapFailed: 'Mindmap save failed.', noDecisions: 'No decisions yet.', updated: 'UPDATED',
    guideTitle: 'NOTEBOOK GUIDE', guideNext: 'NEXT →', guideRestart: 'START OVER ↺', guideHide: 'Hide guide', guideShow: '💡 Show the guide', guideSteps: ['This is a place to share quick sparks. Your idea does not have to be finished!', 'Add a title and short description in the form, then select “Post idea.” You can leave your name blank.', 'Use the filter to browse ideas by category, such as social media, video, or on-campus activities.', 'Start with one small thought. Combine everyone’s ideas and deliver a reason to visit HarmoQ!'],
    planGuideSteps: ['This is where you can read the direction and reference material for Kyudai Festival publicity.', 'Choose a page from the list on the left, and its contents will appear on the right.', 'Start with “Publicity Plan” to review the current direction, post ideas, and schedule.', 'The plan is still open for discussion. If you notice anything or have a suggestion, share it in the Ideas tab!'],
    loadErrorTitle: 'Could not load the notebook', loadErrorHelp: 'Open the site through an HTTP server such as GitHub Pages. Opening index.html directly may block the JSON file.'
  }
};

const EN_CONTENT = {
  site: { subtitle: 'Festival Notebook', tagline: 'Deliver a reason to visit HarmoQ.', phase: 'IDEAS → PLANNING' },
  documents: [
    { id:'start-here', title:'Start Here', eyebrow:'00 / GUIDE', summary:'This shared notebook keeps the publicity team’s thinking, decisions, and materials in one place.', updated:'2026-09-15', tags:['guide','team'], blocks:[{type:'callout',title:'Core idea',text:'Deliver a reason to visit HarmoQ.'},{type:'text',title:'How to use this space',body:'Read current thinking and materials in Plan / Docs. Share quick thoughts in Ideas. Connect ideas in the Mindmap. Record clear outcomes in Decisions.'},{type:'cards',items:[{title:'PLAN / DOCS',text:'Organize thinking, direction, and reference materials.'},{title:'IDEAS',text:'A place to share an idea in 30 seconds.'},{title:'MINDMAP',text:'Explore a plan by branching and connecting ideas.'},{title:'DECISIONS',text:'Keep a short record of what was decided.'}]}]},
    {
      id:'koho-plan', title:'Publicity Plan', eyebrow:'PR / PUBLICITY',
      summary:'This page collects my current ideas about the direction, posts, and workflow for publicity leading up to Kyudai Festival.',
      updated:'2026-09-16', tags:['publicity','social media','Kyudai Festival','ideas','proposal'],
      blocks:[
        {type:'callout',title:'Before you read',text:'Everything on this page is my personal proposal and current thinking. It has not yet been decided by the publicity team as a whole.\n\nI have referred to handover documents and previous publicity work, but I may have misunderstood something or included ideas that do not match this year’s direction.\n\nIf anything seems incorrect, could be improved, or inspires another idea, please feel free to tell me!'},
        {type:'text',title:'What I want publicity to achieve',body:'My main goal is to make the following clear even to people who do not know HarmoQ yet:\n\n“What kind of group is HarmoQ?”\n“Where can I see them at Kyudai Festival?”\n“When should I go?”\n\nI do not want to increase the number of posts for its own sake. I want our publicity to help interested people actually reach the classroom concerts, street performances, and main stage.\n\nPractical details such as the room number and main-stage time should be especially prominent. Ultimately, I hope to create this journey:\n\nDiscover HarmoQ → become interested → find the place and time → come and watch.'},
        {type:'callout',title:'Who we especially want to reach',text:'Of course, many friends, family members, and acquaintances of the performers will come to Kyudai Festival, and they are an important audience for HarmoQ.\n\nAt the same time, one of my main goals in publicity is to make people with no direct connection to a HarmoQ member think, “I’d like to go and see that.”\n\nI want people to come not only because a friend invited them or someone they know is performing, but also because they happened to discover us on social media, were looking for something interesting at Kyudai Festival, or were already curious about a cappella.\n\nTo make that possible, even someone seeing HarmoQ for the first time should immediately understand what kind of group we are, where they can see us, and when we are performing.'},
        {type:'quote',text:'Publicity should go beyond awareness and help people feel that they can actually come and see us.'},
        {type:'split',left:{title:'Build awareness',text:'First, let people know about HarmoQ and that we will perform at Kyudai Festival.\n\n• Previous performance videos\n• Short performance clips\n• An introduction to HarmoQ\n• What makes a cappella special\n• Kyudai Festival appearance announcements'},right:{title:'Help people attend',text:'Give interested people everything they need to arrive without confusion.\n\n• Room number\n• Classroom concert times\n• Street performance place and time\n• Main-stage appearance time\n• Timetable\n• Directions'}},
        {type:'cards',title:'Content direction',items:[
          {title:'1. Awareness / Get discovered',text:'Reach people who do not yet know HarmoQ or a cappella. Use existing performance videos and photos to make them think, “That looks fun” or “I’d like to see that.”'},
          {title:'2. Interest / Build curiosity',text:'Use short performance clips, previous concert footage, and main-stage teasers. Keep each post focused on roughly one clear message.'},
          {title:'3. Information / Make attending easy',text:'Clearly communicate the room, time, and place. Some posts can make one essential detail—such as the room number or stage time—the entire focus.'},
          {title:'4. Reminder / Final reminders',text:'Just before the festival, summarize the place, time, and timetable in a format that first-time viewers can understand immediately.'}
        ]},
        {type:'callout',title:'About video',text:'Rather than filming a large amount of new material immediately, I would first like to use the performance videos and other assets we already have.\n\nWe can add new filming projects later when there is a clear need. Band introduction videos could also be a later project instead of asking every band from the beginning.'},
        {type:'checklist',title:'Post ideas under consideration',items:[
          {text:'Announce HarmoQ’s Kyudai Festival appearance',done:false},{text:'Short Reels using previous performance videos',done:false},{text:'A “What is HarmoQ?” introduction',done:false},{text:'A short introduction to a cappella for newcomers',done:false},{text:'Classroom concert introduction',done:false},{text:'Street performance introduction',done:false},{text:'Main-stage appearance announcement',done:false},{text:'A post focused only on the room number',done:false},{text:'A post focused only on the main-stage time',done:false},{text:'Directions and a guide to the classroom',done:false},{text:'Classroom and street performance timetable',done:false},{text:'Flyer and poster introduction',done:false},{text:'Countdown posts',done:false},{text:'Photos and videos on festival day',done:false},{text:'Band introduction videos if needed',done:false}
        ]},
        {type:'text',title:'Repeat essential information',body:'Details such as the room number and main-stage time may be missed if we publish them only once, so I would like to repeat them in different forms.\n\nFor example:\n\n• Begin with an official announcement graphic\n• Add the room number to the end of a short performance video\n• Display it prominently again just before the festival\n• Share it again in Stories on the day\n\nRepeating the same information in different ways can build a clear association: “This is where I can see HarmoQ.”'},
        {type:'split',left:{title:'Japanese',text:'Use Japanese for the main information. Keep posts easy to read for members and Japanese students, even when there is a lot to communicate.'},right:{title:'English',text:'Add concise English where useful in important public-facing posts. HarmoQ introductions, dates, room numbers, locations, and stage times should be understandable in English too.'}},
        {type:'callout',title:'Reach international students too',text:'Some international students already know a cappella or are interested in music and live performance, so essential information should be available in English as well as Japanese.\n\nRather than fully translating every post, a realistic approach may be to include short English versions of the most important public information.'},
        {type:'timeline',title:'From launch to festival day',items:[
          {date:'From Sep. 20',title:'Phase 1: Awareness',text:'Use existing videos and photos to introduce HarmoQ and announce our Kyudai Festival appearance.'},
          {date:'Late September',title:'Phase 2: Interest',text:'Share performance clips and introductions to HarmoQ and a cappella.'},
          {date:'Early October',title:'Phase 3: Practical details',text:'Release information about the classroom concerts, street performances, and main stage in stages.'},
          {date:'After schedule confirmation',title:'Schedule',text:'Publish the detailed classroom and street performance timetable.'},
          {date:'1–2 weeks before',title:'Reminder',text:'Emphasize the room number, place, and time.'},
          {date:'Just before the festival',title:'Final Push',text:'Summarize when and where people can see HarmoQ at a glance.'},
          {date:'Festival day',title:'Live Updates',text:'Use Stories and similar posts for locations, times, and live updates.'}
        ]},
        {type:'cards',title:'Formats I especially want to try',items:[
          {title:'ROOM XX',text:'A short video or image focused on the room number itself. Avoid overcrowding it with other information and help people remember “HarmoQ = Room XX.”'},
          {title:'MAIN STAGE — XX:XX',text:'End a previous performance clip or short teaser with the main-stage time displayed prominently.'},
          {title:'STREET LIVE',text:'Clearly explain that street performances are happening, together with their place and time.'},
          {title:'1 POST = 1 MESSAGE',text:'Do not force every detail into one image. Choose the single most important message for each post.'}
        ]},
        {type:'text',title:'Flyers and posters',body:'For flyers and posters, I would like to confirm with this year’s design team and producer how much the publicity team should help decide the content.\n\nAt minimum, I hope publicity can check that an outside viewer can immediately understand:\n\n• that this is HarmoQ\n• that HarmoQ can be seen at Kyudai Festival\n• the place\n• the date and time\n• social media details, if needed'},
        {type:'callout',title:'Still open for discussion',text:'The following points especially should be decided together with the publicity team, producer, and design team.'},
        {type:'checklist',title:'Questions to discuss',items:[
          {text:'Is it okay to begin posting around September 20?',done:false},{text:'How often should we post?',done:false},{text:'Should Instagram and X carry the same content?',done:false},{text:'Which posts should include both Japanese and English?',done:false},{text:'When can we publish the room, location, and performance times?',done:false},{text:'Should we make band introduction videos again this year?',done:false},{text:'Does the official Kyudai Festival account need assets from us again?',done:false},{text:'How involved should publicity be in flyers and posters?',done:false},{text:'How should we divide images, video, copywriting, and posting?',done:false},{text:'Who will handle photos and video on the day?',done:false}
        ]},
        {type:'quote',text:'This plan is not fixed. I would like to keep changing it as we add everyone’s ideas.'}
      ]
    }
  ],
  decisions: [{date:'2026-09-15',title:'Use Festival Notebook as the publicity team’s shared workspace',detail:'Start with four sections: Plan / Docs, Ideas, Mindmap, and Decisions.'}],
  starterIdeas: {'starter-1':{title:'Rehearsal mini-vlogs',text:'Share 15–25 second vertical clips from rehearsals. Show the atmosphere of preparation, not only the finished performance.',author:'sample'},'starter-2':{title:'One reason to watch each band',text:'Go beyond a biography and add one memorable detail that gives people a reason to see the band.',author:'sample'}},
  timelineItems: {
    'phase-awareness':{dateLabel:'From Sep. 20',title:'Phase 1: Awareness',description:'Use existing performance videos and photos to introduce HarmoQ and announce our Kyudai Festival appearance.'},
    'phase-interest':{dateLabel:'Late September',title:'Phase 2: Interest',description:'Share short performance clips and introductions to HarmoQ and a cappella so viewers think, “I’d like to see that.”'},
    'phase-information':{dateLabel:'Early October',title:'Phase 3: Practical details',description:'Release the places and times for the classroom concerts, street performances, and main stage in stages.'},
    'schedule-release':{dateLabel:'After schedule confirmation',title:'Schedule: Timetable',description:'Publish the detailed timetable for the classroom concerts and street performances.'},
    'reminder':{dateLabel:'1–2 weeks before',title:'Reminder: Place and time',description:'Prominently repeat the room number, location, and performance times in a clear format.'},
    'final-push':{dateLabel:'Just before the festival',title:'Final Push',description:'Summarize when and where people can see HarmoQ in a format that first-time viewers can understand at a glance.'},
    'festival-day':{dateLabel:'Festival day',title:'Live Updates',description:'Use Stories and similar posts to share locations, times, and live updates throughout the day.'}
  },
  mapNodes: {
    root:{ja:'HarmoQへ会いに行く理由を届ける',en:'Deliver a reason to visit HarmoQ',aliases:['九大祭に来たくなる理由','A reason to visit Kyudai Festival']},
    n1:{ja:'出演者の魅力',en:'People'}, n2:{ja:'パフォーマンス',en:'Performance'},
    n3:{ja:'九大祭の雰囲気',en:'Festival mood'}, n4:{ja:'役立つ情報',en:'Useful info'}
  }
};

const html = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const richText = (value = '') => html(value).replaceAll('\n','<br>');
const t = () => UI[currentLang];

function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(el._timer); el._timer=setTimeout(()=>el.classList.remove('show'),2200); }
async function loadData() { const response=await fetch('./data/site-data.json',{cache:'no-store'}); if(!response.ok) throw new Error('Could not load site data'); return response.json(); }
function localizedSite() { return currentLang==='en'?{...data.site,...EN_CONTENT.site}:data.site; }
function localizedDocuments() { return currentLang==='en'?EN_CONTENT.documents:data.documents; }
function localizedDecisions() { return currentLang==='en'?EN_CONTENT.decisions:data.decisions; }
function localizedIdea(idea) { return currentLang==='en'&&EN_CONTENT.starterIdeas[idea.id]?{...idea,...EN_CONTENT.starterIdeas[idea.id]}:idea; }
function localizedMapText(node) {
  const translation=EN_CONTENT.mapNodes[node.id];
  return translation&&[translation.ja,translation.en,...(translation.aliases||[])].includes(node.text)?translation[currentLang]:node.text;
}
function migrateMapMessage(map) { const root=map?.nodes?.find(node=>node.id==='root'); if(root&&EN_CONTENT.mapNodes.root.aliases.includes(root.text)){root.text=EN_CONTENT.mapNodes.root.ja;return true;} return false; }

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
  const textValues={planHeading:'planHeading',ideasHeading:'ideasHeading',ideasDescription:'ideasDescription',mindmapHeading:'mindmapHeading',mindmapDescription:'mindmapDescription',decisionsHeading:'decisionsHeading',decisionsDescription:'decisionsDescription',timelineHeading:'timelineHeading',timelineDescription:'timelineDescription',addTimelineBtn:'addTimeline',ideaTitleLabel:'titleLabel',ideaCategoryLabel:'categoryLabel',ideaTextLabel:'textLabel',postIdeaBtn:'postIdea',ideaFilterLabel:'filter',addRootBtn:'addRoot',resetMapBtn:'resetMap',mapHelp:'mapHelp',timelineDateLabel:'timelineDate',timelineDateTextLabel:'timelineDateText',timelineTitleLabel:'timelineTitle',timelineDetailsLabel:'timelineDetails',timelineStatusLabel:'timelineStatus',saveTimelineBtn:'timelineSave',deleteTimelineBtn:'timelineDelete'};
  Object.entries(textValues).forEach(([id,key])=>{$(`#${id}`).textContent=t()[key];});
  $('#view-plan .section-head p').textContent=t().planDescription; $('#ideaTitle').placeholder=t().titlePlaceholder; $('#ideaText').placeholder=t().textPlaceholder; $('#ideaAuthorLabel').innerHTML=t().authorLabel; $('#ideaAuthor').placeholder=t().authorPlaceholder;
  ['ideaCategory','ideaFilter'].forEach(id=>$(`#${id}`).querySelectorAll('option').forEach(option=>{option.textContent=t().categories[option.value];}));
  $('#timelineDateText').placeholder=t().timelineDatePlaceholder;
  $('#timelineStatus').querySelectorAll('option').forEach(option=>{option.textContent=t().timelineStatuses[option.value];});
  $('.timeline-modal-close').setAttribute('aria-label',t().timelineClose);
  setTheme(); renderGuide(); renderPlanGuide();
  if(data){renderDocList();renderIdeas();renderDecisions();renderMindmap();renderTimeline();updateSyncMode();updateTimelineMode();}
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

function initPlanGuide() {
  const frames=Array.from({length:8},(_,index)=>`./assets/MainTabDialogue/harmoq_cat2_0${index+1}.png`);
  frames.forEach(src=>{const image=new Image();image.src=src;});
  setInterval(()=>{planSpriteFrame=(planSpriteFrame+1)%frames.length;$('#planGuideSprite').src=frames[planSpriteFrame];},170);
  $('#planGuideNext').addEventListener('click',()=>{planGuideStep=(planGuideStep+1)%t().planGuideSteps.length;renderPlanGuide();});
  $('#planGuideClose').addEventListener('click',()=>{$('#planGuide').hidden=true;$('#planGuideShow').hidden=false;});
  $('#planGuideShow').addEventListener('click',()=>{$('#planGuide').hidden=false;$('#planGuideShow').hidden=true;});
  renderPlanGuide();
}
function renderPlanGuide() { const steps=t().planGuideSteps;planGuideStep%=steps.length;$('#planGuideTitle').textContent=t().guideTitle;$('#planGuideText').textContent=steps[planGuideStep];$('#planGuideProgress').textContent=`${planGuideStep+1} / ${steps.length}`;$('#planGuideNext').textContent=planGuideStep===steps.length-1?t().guideRestart:t().guideNext;$('#planGuideClose').setAttribute('aria-label',t().guideHide);$('#planGuideShow').textContent=t().guideShow; }

function initTabs() {
  $$('.nav button').forEach(btn=>btn.addEventListener('click',()=>{$$('.nav button').forEach(item=>item.classList.toggle('active',item===btn));$$('.view').forEach(view=>view.classList.remove('active'));$(`#view-${btn.dataset.view}`).classList.add('active');history.replaceState(null,'',`#${btn.dataset.view}`);if(btn.dataset.view==='mindmap')requestAnimationFrame(renderMindmap);}));
  const target=$(`.nav button[data-view="${location.hash.replace('#','')}"]`);if(target)target.click();
}

function renderDocList() { const documents=localizedDocuments();$('#docList').innerHTML=documents.map(doc=>`<button data-doc="${html(doc.id)}">${html(doc.eyebrow||'')}<br><strong>${html(doc.title)}</strong></button>`).join('');$$('#docList button').forEach(btn=>btn.addEventListener('click',()=>selectDoc(btn.dataset.doc)));currentDocId=currentDocId||documents[0]?.id;selectDoc(currentDocId); }
function selectDoc(id) { currentDocId=id;$$('#docList button').forEach(button=>button.classList.toggle('active',button.dataset.doc===id));const doc=localizedDocuments().find(item=>item.id===id);if(doc)$('#docPage').innerHTML=renderDocument(doc); }
function renderDocument(doc) { return `<div class="doc-eyebrow">${html(doc.eyebrow||'')}</div><h2>${html(doc.title)}</h2><div class="doc-summary">${html(doc.summary||'')}</div><div class="doc-meta">${(doc.tags||[]).map(tag=>`<span class="tag">${html(tag)}</span>`).join('')}${doc.updated?`<span class="tag">${t().updated} ${html(doc.updated)}</span>`:''}</div>${(doc.blocks||[]).map(renderBlock).join('')}`; }
function renderBlock(block) {
  if(block.type==='text')return`<section class="block"><h3>${html(block.title||'')}</h3><p>${richText(block.body||'')}</p></section>`;
  if(block.type==='callout')return`<section class="block callout ${String(block.text||'').length>180?'long':''}"><h3>${html(block.title||'')}</h3><p>${richText(block.text||'')}</p></section>`;
  if(block.type==='split')return`<section class="block split"><div class="split-card"><h3>${html(block.left?.title||'')}</h3><p>${richText(block.left?.text||'')}</p></div><div class="split-card"><h3>${html(block.right?.title||'')}</h3><p>${richText(block.right?.text||'')}</p></div></section>`;
  if(block.type==='cards')return`<section class="block cards-block">${block.title?`<h3>${html(block.title)}</h3>`:''}<div class="cards-grid">${(block.items||[]).map(item=>`<div class="mini-card"><h4>${html(item.title)}</h4><p>${richText(item.text)}</p></div>`).join('')}</div></section>`;
  if(block.type==='checklist')return`<section class="block"><h3>${html(block.title||'')}</h3><div class="checklist">${(block.items||[]).map(item=>`<div class="checkitem ${item.done?'done':''}"><span class="checkbox"></span><span>${html(item.text)}</span></div>`).join('')}</div></section>`;
  if(block.type==='timeline')return`<section class="block"><h3>${html(block.title||'')}</h3><div class="timeline">${(block.items||[]).map(item=>`<div class="timeline-item"><div class="date">${html(item.date||'')}</div><strong>${html(item.title||'')}</strong><p>${html(item.text||'')}</p></div>`).join('')}</div></section>`;
  if(block.type==='quote')return`<section class="block callout" style="background:var(--accent-soft)">${block.title?`<h3>${html(block.title)}</h3>`:''}<p>${richText(block.text||'')}</p></section>`;
  if(block.type==='links')return`<section class="block"><h3>${html(block.title||'')}</h3><div class="admin-list">${(block.items||[]).map(item=>`<a class="admin-item" href="${html(item.url)}" target="_blank" rel="noopener"><div class="meta"><strong>${html(item.label)}</strong><span>${html(item.note||'')}</span></div><span>↗</span></a>`).join('')}</div></section>`;
  return'';
}

function localIdeaKey(){return'festivalNotebookIdeasV1';}
function loadLocalIdeas(){try{return JSON.parse(localStorage.getItem(localIdeaKey())||'[]');}catch{return[];}}
function saveLocalIdeas(items){localStorage.setItem(localIdeaKey(),JSON.stringify(items));}
async function initIdeas(){const cloud=await initCloud();if(cloud.enabled){const cloudIdeas=await getIdeas();ideas=[...(data.starterIdeas||[]),...(cloudIdeas||[])];const cloudMap=await getMindmap('main');activeMap=cloudMap||structuredClone(data.mindmaps?.[0]||{id:'main',title:'Mindmap',nodes:[]});if(!cloudMap)await saveMindmap(activeMap);}else{ideas=[...(data.starterIdeas||[]),...loadLocalIdeas()];activeMap=loadLocalMindmap()||structuredClone(data.mindmaps?.[0]||{id:'main',title:'Mindmap',nodes:[]});}if(migrateMapMessage(activeMap)){if(cloudEnabled())await saveMindmap(activeMap);else saveLocalMindmap(activeMap);}updateSyncMode();renderIdeas();bindIdeaForm();}
function updateSyncMode(){if($('#syncMode'))$('#syncMode').innerHTML=cloudEnabled()?t().sharedMode:t().localMode;}
function renderIdeas(){const category=$('#ideaFilter')?.value||'ALL';const list=category==='ALL'?ideas:ideas.filter(idea=>idea.category===category);$('#ideaGrid').innerHTML=list.length?list.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(raw=>{const idea=localizedIdea(raw);return`<article class="idea-card"><div class="cat">${html(t().categories[idea.category]||idea.category||'IDEA')}</div><h3>${html(idea.title)}</h3><p>${html(idea.text||'')}</p><footer><span>${html(idea.author||t().anonymous)}</span><span>${html(String(idea.createdAt||'').slice(0,10))}</span></footer></article>`;}).join(''):`<div class="empty">${t().noIdeas}</div>`;}
function bindIdeaForm(){$('#ideaFilter').addEventListener('change',renderIdeas);$('#ideaForm').addEventListener('submit',async event=>{event.preventDefault();const form=new FormData(event.currentTarget);const idea={title:String(form.get('title')||'').trim(),category:String(form.get('category')||'OTHER'),text:String(form.get('text')||'').trim(),author:String(form.get('author')||'').trim(),createdAt:new Date().toISOString()};if(!idea.title||!idea.text)return;try{if(cloudEnabled()){ideas.push(await addIdea(idea));toast(t().ideaPosted);}else{idea.id=crypto.randomUUID();const local=loadLocalIdeas();local.push(idea);saveLocalIdeas(local);ideas.push(idea);toast(t().ideaSaved);}event.currentTarget.reset();renderIdeas();}catch(error){console.error(error);toast(t().ideaFailed);}});}
function renderDecisions(){const decisions=localizedDecisions()||[];$('#decisions').innerHTML=decisions.length?decisions.map(item=>`<article class="decision"><div class="date">${html(item.date)}</div><div><h3>${html(item.title)}</h3><p>${html(item.detail||'')}</p></div></article>`).join(''):`<div class="empty">${t().noDecisions}</div>`;}

function localTimelineKey(){return'festivalNotebookTimelineV1';}
function loadLocalTimeline(){try{return JSON.parse(localStorage.getItem(localTimelineKey())||'null');}catch{return null;}}
function saveLocalTimeline(timeline){localStorage.setItem(localTimelineKey(),JSON.stringify(timeline));}
function localizedTimelineItem(item){const translation=EN_CONTENT.timelineItems[item.id];return currentLang==='en'&&translation&&!item.customized?{...item,...translation}:item;}
function updateTimelineMode(){if($('#timelineMode'))$('#timelineMode').innerHTML=cloudEnabled()?t().timelineShared:t().timelineLocal;}

async function initTimeline(){
  if(cloudEnabled()){
    const cloudTimeline=await getTimeline('main');
    activeTimeline=cloudTimeline||structuredClone(data.timeline||{id:'main',items:[]});
    if(!cloudTimeline)await saveTimeline(activeTimeline);
  }else activeTimeline=loadLocalTimeline()||structuredClone(data.timeline||{id:'main',items:[]});
  if(!Array.isArray(activeTimeline.items))activeTimeline.items=[];
  renderTimeline();updateTimelineMode();
}

function formatTimelineDate(value){if(!value)return'';const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(currentLang==='ja'?'ja-JP':'en-US',{month:'short',day:'numeric',year:'numeric'}).format(date);}
function renderTimeline(){
  if(!activeTimeline)return;
  const items=(activeTimeline.items||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const counts={planned:0,active:0,done:0};items.forEach(item=>{counts[item.status]=(counts[item.status]||0)+1;});
  $('#timelineSummary').innerHTML=`<span><i></i>${t().timelineTotal} ${items.length}</span>${['planned','active','done'].map(status=>`<span class="${status}"><i></i>${t().timelineStatuses[status]} ${counts[status]||0}</span>`).join('')}`;
  $('#timelineList').innerHTML=items.length?items.map(raw=>{const item=localizedTimelineItem(raw);const description=String(item.description||'').replaceAll('\n',' ');const preview=description.length>145?`${description.slice(0,145)}…`:description;const status=['planned','active','done'].includes(item.status)?item.status:'planned';const dateLabel=item.dateLabel||formatTimelineDate(item.date);return`<article class="timeline-row status-${status}"><div class="timeline-date"><strong>${html(dateLabel)}</strong><span>${html(formatTimelineDate(item.date))}</span></div><button class="timeline-marker" type="button" data-timeline-open="${html(item.id)}" aria-label="${html(item.title)}"></button><button class="timeline-card" type="button" data-timeline-open="${html(item.id)}"><div class="timeline-card-head"><h3>${html(item.title)}</h3><span class="timeline-status">${t().timelineStatuses[status]}</span></div><p>${html(preview)}</p><span class="timeline-open-hint">${t().timelineOpenHint}</span></button></article>`;}).join(''):`<div class="empty">${t().timelineEmpty}</div>`;
  $$('[data-timeline-open]').forEach(button=>button.addEventListener('click',()=>openTimelineModal(button.dataset.timelineOpen)));
}

function openTimelineModal(id=''){
  const raw=(activeTimeline?.items||[]).find(item=>item.id===id);
  const item=raw?localizedTimelineItem(raw):{id:'',date:'',dateLabel:'',title:'',description:'',status:'planned'};
  timelineModalLastFocus=document.activeElement;
  $('#timelineItemId').value=item.id;$('#timelineDate').value=item.date||'';$('#timelineDateText').value=item.dateLabel||'';$('#timelineTitle').value=item.title||'';$('#timelineDetails').value=item.description||'';$('#timelineStatus').value=item.status||'planned';
  $('#timelineModalTitle').textContent=raw?t().timelineModalEdit:t().timelineModalNew;$('#deleteTimelineBtn').hidden=!raw;$('#timelineModal').hidden=false;document.body.classList.add('modal-open');
  setTimeout(()=>$('#timelineTitle').focus(),0);
}
function closeTimelineModal(){if($('#timelineModal').hidden)return;$('#timelineModal').hidden=true;document.body.classList.remove('modal-open');timelineModalLastFocus?.focus?.();}
async function persistTimeline(message){try{if(cloudEnabled())await saveTimeline(activeTimeline);else saveLocalTimeline(activeTimeline);renderTimeline();toast(message||t().timelineSaved);return true;}catch(error){console.error(error);toast(t().timelineFailed);return false;}}
function bindTimelineControls(){
  $('#addTimelineBtn').addEventListener('click',()=>openTimelineModal());
  $$('[data-close-timeline]').forEach(element=>element.addEventListener('click',closeTimelineModal));
  $('#timelineForm').addEventListener('submit',async event=>{event.preventDefault();const id=$('#timelineItemId').value||crypto.randomUUID();const item={id,date:$('#timelineDate').value,dateLabel:$('#timelineDateText').value.trim(),title:$('#timelineTitle').value.trim(),description:$('#timelineDetails').value.trim(),status:$('#timelineStatus').value,customized:true,updatedAt:new Date().toISOString()};if(!item.date||!item.title||!item.description)return;const index=activeTimeline.items.findIndex(existing=>existing.id===id);if(index>=0)activeTimeline.items[index]=item;else activeTimeline.items.push(item);if(await persistTimeline(t().timelineSaved))closeTimelineModal();});
  $('#deleteTimelineBtn').addEventListener('click',async()=>{const id=$('#timelineItemId').value;if(!id||!confirm(t().timelineDeleteConfirm))return;activeTimeline.items=activeTimeline.items.filter(item=>item.id!==id);if(await persistTimeline(t().timelineDeleted))closeTimelineModal();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#timelineModal').hidden)closeTimelineModal();});
}

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

async function main(){try{data=await loadData();initLanguageToggle();initTabs();initGuide();initPlanGuide();bindMindmapToolbar();bindTimelineControls();setLanguage('ja');$('#syncMode').innerHTML=t().checkingMode;await initIdeas();await initTimeline();renderMindmap();window.addEventListener('resize',drawLines);}catch(error){console.error(error);document.body.innerHTML=`<div class="lock-screen"><h1>${t().loadErrorTitle}</h1><p>${html(error.message)}</p><p>${t().loadErrorHelp}</p></div>`;}}
main();
