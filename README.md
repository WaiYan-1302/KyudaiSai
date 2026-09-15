# KYUDAI SAI / KOHO — Festival Notebook

A static, GitHub-Pages-ready workspace for the festival publicity team.

## What is included

- **PLAN / DOCS** — turn plans and handover information into clean visual pages instead of dumping files into a folder.
- **IDEA WALL** — fast member submissions with category filtering.
- **MINDMAP** — draggable nodes; add children, edit, delete, and reorganize ideas.
- **DECISIONS** — a short log of what was actually decided.
- **ADMIN / EDITOR** — edit site settings, documents, visual blocks, and decisions without manually writing JSON.
- **SETUP HELPER** — generates `assets/js/config.js` for Firebase sharing and an optional admin PIN.
- Responsive **Festival Notebook** visual system for phones and desktop.

## 1. Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Unzip this package and upload **the contents of this folder** to the repository root. `index.html` should be at the root.
3. Commit the files.
4. In GitHub: **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select your main branch and `/ (root)`, then Save.
7. Wait for GitHub Pages to publish the site.

No build step is required.

## 2. Admin page

Open:

`https://YOUR-NAME.github.io/YOUR-REPO/admin.html`

The editor can:

- edit site title, tagline, phase, date, accent, repo URL
- add/edit/delete documents
- create visual content blocks
- edit decisions
- edit raw JSON when needed
- download a replacement `site-data.json`

### Easiest content update workflow

1. Open `admin.html`.
2. Edit your content.
3. Click **Download JSON**.
4. In GitHub, replace `data/site-data.json` with the downloaded file and commit.

### Even faster on Chromium browsers

The admin supports the File System Access API:

1. Keep a local clone/copy of this repo.
2. In Admin, click **Open JSON** and choose your local `data/site-data.json`.
3. Edit.
4. Click **Save file**.
5. Git commit/push the changed file.

Safari/Firefox can use the Download JSON workflow instead.

## 3. Shared Ideas + Mindmaps

The site starts in **Local demo mode** so it works immediately. In that mode, new ideas and mindmap edits are only stored in that browser.

For real team-wide collaboration, enable the included Firebase integration. Firebase's normal web config is public by design; permissions are controlled through Firestore rules.

### Firebase setup

1. Create a Firebase project at the Firebase Console.
2. Add a **Web app** to the project.
3. Enable **Authentication → Sign-in method → Anonymous**.
4. Create a **Cloud Firestore** database.
5. Open Firestore **Rules** and paste the contents of the included `firestore.rules`, then publish the rules.
6. Visit your deployed `setup.html` (or open it through a local web server).
7. Check **Enable Firebase**.
8. Use a long random **Room ID**. This separates your team's data from any other room in the same Firebase project.
9. Paste the Firebase web config values.
10. Optionally set an Admin convenience PIN.
11. Click **Download config.js**.
12. Replace `assets/js/config.js` in the GitHub repo with the downloaded file and commit.

After that:

- member ideas are shared
- the mindmap is shared
- the site still remains a static GitHub Pages site

### Important security note

The supplied Firestore rules are intentionally simple for a student-team workspace:

- anyone can read ideas/mindmaps
- authenticated anonymous users can post ideas
- authenticated anonymous users can edit the shared mindmap
- idea edits/deletes are blocked from the public client

This is suitable for a small internal collaboration site, but it is **not a private or high-security system**. A determined person who finds the site can interact with the public collaboration features. If you later need stronger access control, use Firebase email/Google authentication and UID-based rules.

## 4. Admin PIN

The optional PIN is only a **convenience lock** for `admin.html`. Because GitHub Pages is static, the PIN check runs in the browser and should not be treated as security.

Use `setup.html` to generate a hashed PIN automatically.

Also note: the Admin editor does not directly publish to GitHub, so someone opening the page cannot change the deployed documents unless they also have write access to the repository.

## 5. Writing documents visually

Documents are stored in `data/site-data.json` as blocks. The admin page supports:

- **Text** — normal section
- **Callout** — taped/highlighted important statement
- **Checklist** — open questions / task list
- **Timeline** — dates and phases
- **Cards** — small grouped ideas
- **Split** — two-column comparison
- **Links** — resource list
- **Quote** — emphasized quote/note

This lets you turn a long handover or planning document into a more readable page.

## 6. Adding PDFs or other files

Put files in the `docs/` folder, for example:

`docs/koho-handover.pdf`

Then add a **Links** block in Admin and use:

`./docs/koho-handover.pdf`

You can keep the visual summary in PLAN while still linking to the original file.

## 7. Main files

```text
index.html                 public site
admin.html                 content editor
setup.html                 config generator
assets/css/style.css       Festival Notebook theme
assets/js/app.js           public site behavior
assets/js/admin.js         editor behavior
assets/js/cloud.js         Firebase sync adapter
assets/js/config.js        collaboration/admin configuration
data/site-data.json        main editable content
firestore.rules            recommended Firestore rules
docs/                      optional PDFs/resources
```

## Notes

- Do not open `index.html` directly with `file://`; browsers may block JSON loading. Use GitHub Pages or a local HTTP server.
- A quick local server is: `python -m http.server 8000` from the project folder, then open `http://localhost:8000/`.
- The project intentionally uses no build system and no framework so it stays easy to maintain after handover.
