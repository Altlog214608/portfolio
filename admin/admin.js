/*
 * Local-only portfolio editor.
 * Edits are kept as a draft in localStorage. "사이트에 반영" writes data/portfolio.json
 * (and any newly uploaded images) straight into the repo folder via the File System Access API,
 * then you commit & push. This page is excluded from the deployed site (_config.yml).
 */
(function () {
  "use strict";

  const { DRAFT_KEY, esc, srcSafe, sortedProjects, fetchData, readDraft, bindThemeToggle } = window.Portfolio;
  const $ = (id) => document.getElementById(id);
  const content = $("adminContent");

  let data = null;
  let original = "";       // canonical JSON of data/portfolio.json as loaded
  let dirHandle = null;    // repo root picked by the user
  let galleryDraft = [];

  /* ---------- State ---------- */

  const snapshot = () => JSON.stringify(data);
  const isDirty = () => snapshot() !== original;

  function persist() {
    try {
      if (isDirty()) localStorage.setItem(DRAFT_KEY, snapshot());
      else localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      alert("브라우저 저장 공간이 부족해 초안을 저장하지 못했습니다. '사이트에 반영'에서 파일로 먼저 저장해 주세요.");
    }
    renderStatus();
  }

  function renderStatus() {
    const bar = $("statusBar");
    const dirty = isDirty();
    bar.classList.toggle("clean", !dirty);
    bar.innerHTML = dirty
      ? `<span>저장하지 않은 변경 사항이 있습니다. 이 브라우저에 초안으로 보관 중이며, <b>사이트에 반영</b>에서 파일로 저장해야 배포됩니다.</span><button class="btn ghost" type="button" id="discardDraft">변경 취소</button>`
      : `<span>사이트 데이터(data/portfolio.json)와 같습니다.</span>`;
    const discard = $("discardDraft");
    if (discard) discard.onclick = () => {
      if (!confirm("초안을 버리고 data/portfolio.json 내용으로 되돌릴까요?")) return;
      data = JSON.parse(original);
      persist();
      renderPanel(currentPanel);
    };
  }

  /* ---------- Small helpers ---------- */

  const val = (id) => $(id).value.trim();
  const checked = (id) => $(id).checked;
  const csv = (id) => val(id).split(",").map((v) => v.trim()).filter(Boolean);
  const stamp = () => Date.now().toString(36);

  function field(label, id, value = "", opts = {}) {
    const { type = "text", full = false, helper = "", tall = false, placeholder = "" } = opts;
    const input = type === "textarea"
      ? `<textarea id="${id}" class="${tall ? "tall" : ""}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
      : `<input id="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
    return `<div class="field ${full ? "full" : ""}"><label for="${id}">${label}</label>${input}${helper ? `<span class="helper">${helper}</span>` : ""}</div>`;
  }

  function select(label, id, value, options) {
    return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${options.map(([v, t]) => `<option value="${v}" ${v === value ? "selected" : ""}>${t}</option>`).join("")}</select></div>`;
  }

  function checkbox(label, id, on) {
    return `<label class="checkline"><input id="${id}" type="checkbox" ${on ? "checked" : ""}> ${label}</label>`;
  }

  function title(heading, desc = "", action = "") {
    return `<div class="panel-title"><div><h2>${heading}</h2>${desc ? `<p>${desc}</p>` : ""}</div>${action}</div>`;
  }

  function thumb(src) {
    const safe = srcSafe(src);
    return safe ? `<img class="preview-thumb" src="${esc(safe.startsWith("data:") ? safe : `../${safe}`)}" alt="">` : "";
  }

  // Repo-relative paths need a ../ prefix inside /admin.
  const adminSrc = (src) => (src.startsWith("data:") ? src : `../${src}`);

  function move(arr, index, dir) {
    const target = index + dir;
    if (target < 0 || target >= arr.length) return false;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    return true;
  }

  function on(selector, handler) {
    content.querySelectorAll(selector).forEach((el) => { el.onclick = () => handler(el.dataset, el); });
  }

  function compressImage(file, maxW = 1400, maxH = 1000, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width, maxH / img.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/webp", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Panels ---------- */

  let currentPanel = "profile";

  function renderPanel(panel) {
    currentPanel = panel;
    document.querySelectorAll("#adminMenu button").forEach((b) => b.classList.toggle("active", b.dataset.panel === panel));
    ({ profile: profilePanel, projects: projectsPanel, skills: skillsPanel, timeline: timelinePanel, certs: certsPanel, publish: publishPanel })[panel]();
  }

  /* Profile */
  function profilePanel() {
    const s = data.settings, p = data.profile;
    content.innerHTML = title("페이지 문구 · 프로필", "Hero 문구는 두 줄로 나눠 관리하며, 두 번째 줄에 포인트 색이 적용됩니다.") + `
      <div class="form-grid">
        ${field("Hero Eyebrow", "heroEyebrow", s.heroEyebrow)}
        ${field("Hero 배지", "heroBadge", s.heroBadge)}
        ${field("Hero 첫 줄", "heroLead", s.heroLead)}
        ${field("Hero 두 번째 줄 (포인트 색)", "heroAccent", s.heroAccent)}
        ${field("Hero 설명", "heroDescription", s.heroDescription, { type: "textarea", full: true })}
        ${field("About 본문", "about", p.about, { type: "textarea", full: true })}
        ${field("이름", "name", p.name)}
        ${field("직무 표기", "role", p.role)}
        ${field("이메일", "email", p.email, { type: "email" })}
        ${field("GitHub", "github", p.github, { type: "url" })}
        ${field("블로그", "blog", p.blog, { type: "url" })}
        ${field("이력서 PDF 경로", "resume", p.resume, { placeholder: "files/resume.pdf", helper: "리포 안의 PDF 경로. 비워 두면 이력서 버튼이 숨겨집니다." })}
        <div class="field full">
          <label for="photoInput">프로필 사진</label>
          <input id="photoInput" type="file" accept="image/*">
          ${thumb(p.photo)}
        </div>
        <div class="field full">${checkbox("수상 내역 표시", "showAchievements", s.showAchievements)}</div>
      </div>
      <div class="form-actions"><button class="btn accent" type="button" id="saveProfile">변경 적용</button></div>`;

    $("saveProfile").onclick = async () => {
      ["heroEyebrow", "heroBadge", "heroLead", "heroAccent", "heroDescription"].forEach((k) => { s[k] = val(k); });
      ["about", "name", "role", "email", "github", "blog", "resume"].forEach((k) => { p[k] = val(k); });
      s.showAchievements = checked("showAchievements");
      const file = $("photoInput").files[0];
      if (file) p.photo = await compressImage(file, 700, 900, 0.82);
      persist();
      profilePanel();
    };
  }

  /* Projects */
  function projectsPanel() {
    const list = sortedProjects(data.projects);
    content.innerHTML = title("프로젝트", "공개 여부, Featured, 운영 중(LIVE) 표시와 노출 순서를 관리합니다.", `<button class="btn accent" type="button" id="addProject">+ 프로젝트 추가</button>`) + `
      <div class="crud-list">${list.map((p, i) => `
        <div class="crud-item">
          <div>
            <strong>${esc(p.title)}</strong>
            <div class="meta-row">
              <span class="status-pill ${p.published ? "on" : ""}">${p.published ? "공개" : "비공개"}</span>
              ${p.featured ? '<span class="mini-badge accent">FEATURED</span>' : ""}
              ${p.live ? '<span class="mini-badge live">LIVE</span>' : ""}
              <span class="mini-badge">#${i + 1}</span>
            </div>
            <small>${esc(p.date)} · ${esc(p.category)}</small>
          </div>
          <div class="row-actions">
            <button class="btn ghost" type="button" data-move="-1" data-id="${esc(p.id)}" aria-label="위로">↑</button>
            <button class="btn ghost" type="button" data-move="1" data-id="${esc(p.id)}" aria-label="아래로">↓</button>
            <button class="btn ghost" type="button" data-toggle="published" data-id="${esc(p.id)}">${p.published ? "비공개로" : "공개로"}</button>
            <button class="btn ghost" type="button" data-toggle="featured" data-id="${esc(p.id)}">${p.featured ? "Featured 해제" : "Featured"}</button>
            <button class="btn secondary" type="button" data-edit="${esc(p.id)}">수정</button>
            <button class="btn danger" type="button" data-remove="${esc(p.id)}">삭제</button>
          </div>
        </div>`).join("") || '<div class="empty">프로젝트가 없습니다.</div>'}</div>`;

    $("addProject").onclick = () => projectForm();
    on("[data-move]", (d) => {
      const arr = sortedProjects(data.projects);
      if (!move(arr, arr.findIndex((x) => x.id === d.id), Number(d.move))) return;
      arr.forEach((p, i) => { p.order = i; });
      data.projects = arr;
      persist();
      projectsPanel();
    });
    on("[data-toggle]", (d) => {
      const p = data.projects.find((x) => x.id === d.id);
      p[d.toggle] = !p[d.toggle];
      persist();
      projectsPanel();
    });
    on("[data-edit]", (d) => projectForm(d.edit));
    on("[data-remove]", (d) => {
      const p = data.projects.find((x) => x.id === d.remove);
      if (!confirm(`'${p.title}' 프로젝트를 삭제할까요?`)) return;
      data.projects = data.projects.filter((x) => x.id !== d.remove);
      persist();
      projectsPanel();
    });
  }

  const flowsToText = (flows = []) => flows.map((f) => `${f.label}: ${f.nodes.join(" > ")}`).join("\n");
  const textToFlows = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const i = line.indexOf(":");
    const label = i > -1 ? line.slice(0, i).trim() : "흐름";
    const nodes = (i > -1 ? line.slice(i + 1) : line).split(">").map((n) => n.trim()).filter(Boolean);
    return { label, nodes };
  });

  function projectForm(id = "") {
    const existing = data.projects.find((p) => p.id === id);
    const p = existing || { id: "", title: "", category: "", level: "", date: "", description: "", role: "", tags: [], github: "", demo: "", image: "", overview: "", problem: "", contribution: "", implementation: "", architecture: "", architectureFlows: [], troubleshooting: "", result: "", gallery: [], published: false, featured: false, live: false };
    galleryDraft = JSON.parse(JSON.stringify(p.gallery || []));

    content.innerHTML = title(existing ? "프로젝트 수정" : "프로젝트 추가", "상세 모달의 탭은 내용이 있는 항목만 표시됩니다.", `<button class="btn secondary" type="button" id="backProjects">목록으로</button>`) + `
      <div class="toggle-row">
        ${checkbox("공개", "prPublished", p.published)}
        ${checkbox("Featured", "prFeatured", p.featured)}
        ${checkbox("운영 중 (LIVE)", "prLive", p.live)}
      </div>
      <div class="form-grid">
        ${field("ID", "prId", p.id, { helper: existing ? "URL(#project/ID)과 이미지 폴더 이름. 기존 링크가 깨지지 않도록 바꾸지 않는 것을 권장합니다." : "영문 소문자·숫자·하이픈. URL(#project/ID)과 이미지 폴더 이름으로 쓰입니다.", placeholder: "my-project" })}
        ${field("프로젝트명", "prTitle", p.title)}
        ${field("카테고리", "prCategory", p.category, { placeholder: "AWS · SERVERLESS · WEB" })}
        ${field("레벨 / 구분", "prLevel", p.level, { placeholder: "Lv.3" })}
        ${field("기간", "prDate", p.date, { placeholder: "2026.10 ~ 운영 중" })}
        ${field("태그 (쉼표로 구분, 카드에는 앞 5개)", "prTags", (p.tags || []).join(", "))}
        ${field("GitHub URL", "prGithub", p.github, { type: "url" })}
        ${field("Demo URL", "prDemo", p.demo, { type: "url" })}
        ${field("카드 요약", "prDesc", p.description, { type: "textarea", full: true })}
        ${field("역할 (한 줄)", "prRole", p.role, { full: true })}
        ${field("Overview · 프로젝트 개요", "prOverview", p.overview, { type: "textarea", full: true, tall: true })}
        ${field("Problem · 문제와 목표", "prProblem", p.problem, { type: "textarea", full: true })}
        ${field("My Role · 담당 역할과 기여", "prContribution", p.contribution, { type: "textarea", full: true, tall: true })}
        ${field("Implementation · 구현 내용", "prImplementation", p.implementation, { type: "textarea", full: true, tall: true })}
        ${field("아키텍처 흐름", "prFlows", flowsToText(p.architectureFlows), { type: "textarea", full: true, helper: "한 줄에 흐름 하나: <code>라벨: A &gt; B &gt; C</code>" })}
        ${field("Architecture · 설명", "prArchitecture", p.architecture, { type: "textarea", full: true })}
        ${field("Trouble Shooting", "prTrouble", p.troubleshooting, { type: "textarea", full: true, tall: true })}
        ${field("Result · 결과와 배운 점", "prResult", p.result, { type: "textarea", full: true })}
        <div class="field full">
          <label for="prImage">대표 이미지</label>
          <input id="prImage" type="file" accept="image/*">
          ${thumb(p.image)}
        </div>
        <div class="field full">
          <label for="prGalleryFiles">갤러리 이미지 (여러 장 선택 가능)</label>
          <input id="prGalleryFiles" type="file" accept="image/*" multiple>
          <div class="gallery-admin-grid" id="galleryAdmin"></div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn accent" type="button" id="saveProject">변경 적용</button>
        <button class="btn secondary" type="button" id="cancelProject">취소</button>
      </div>`;

    renderGalleryAdmin();
    $("backProjects").onclick = $("cancelProject").onclick = projectsPanel;
    $("prGalleryFiles").onchange = async (e) => {
      for (const f of e.target.files) galleryDraft.push({ src: await compressImage(f), caption: f.name.replace(/\.[^.]+$/, "") });
      e.target.value = "";
      renderGalleryAdmin();
    };

    $("saveProject").onclick = async () => {
      const newId = val("prId");
      if (!/^[a-z0-9-]+$/.test(newId)) return alert("ID는 영문 소문자, 숫자, 하이픈만 쓸 수 있습니다.");
      if (data.projects.some((x) => x.id === newId && x !== existing)) return alert("이미 같은 ID의 프로젝트가 있습니다.");
      if (!val("prTitle")) return alert("프로젝트명을 입력해 주세요.");

      const target = existing || { order: data.projects.length };
      Object.assign(target, {
        id: newId,
        routeKey: newId,
        title: val("prTitle"),
        category: val("prCategory"),
        level: val("prLevel"),
        date: val("prDate"),
        published: checked("prPublished"),
        featured: checked("prFeatured"),
        live: checked("prLive"),
        description: val("prDesc"),
        role: val("prRole"),
        tags: csv("prTags"),
        github: val("prGithub"),
        demo: val("prDemo"),
        overview: val("prOverview"),
        problem: val("prProblem"),
        contribution: val("prContribution"),
        implementation: val("prImplementation"),
        architecture: val("prArchitecture"),
        architectureFlows: textToFlows($("prFlows").value),
        troubleshooting: val("prTrouble"),
        result: val("prResult"),
        gallery: galleryDraft,
      });
      target.image = target.image || "";
      const cover = $("prImage").files[0];
      if (cover) target.image = await compressImage(cover);
      if (!existing) data.projects.push(target);
      persist();
      projectsPanel();
    };
  }

  function renderGalleryAdmin() {
    const box = $("galleryAdmin");
    box.innerHTML = galleryDraft.map((g, i) => `
      <div class="gallery-admin-item">
        <img src="${esc(adminSrc(g.src))}" alt="">
        <input value="${esc(g.caption || "")}" data-caption="${i}" placeholder="이미지 설명" aria-label="이미지 ${i + 1} 설명">
        <div class="row-actions">
          <button class="btn ghost" type="button" data-gmove="-1" data-i="${i}" aria-label="앞으로">←</button>
          <button class="btn ghost" type="button" data-gmove="1" data-i="${i}" aria-label="뒤로">→</button>
          <button class="btn danger" type="button" data-gremove="${i}">삭제</button>
        </div>
      </div>`).join("") || '<div class="empty" style="grid-column:1/-1">갤러리 이미지가 없습니다.</div>';
    box.querySelectorAll("[data-caption]").forEach((el) => { el.oninput = () => { galleryDraft[el.dataset.caption].caption = el.value; }; });
    box.querySelectorAll("[data-gmove]").forEach((el) => { el.onclick = () => { if (move(galleryDraft, Number(el.dataset.i), Number(el.dataset.gmove))) renderGalleryAdmin(); }; });
    box.querySelectorAll("[data-gremove]").forEach((el) => { el.onclick = () => { galleryDraft.splice(Number(el.dataset.gremove), 1); renderGalleryAdmin(); }; });
  }

  /* Generic list editor used by skills, timeline, certifications and awards. */
  function listEditor({ key, heading, desc, addLabel, summary, fields, blank, back }) {
    const arr = data[key];
    const html = `<div class="crud-list">${arr.map((item, i) => `
      <div class="crud-item">
        <div>${summary(item)}</div>
        <div class="row-actions">
          <button class="btn ghost" type="button" data-lmove="-1" data-key="${key}" data-i="${i}" aria-label="위로">↑</button>
          <button class="btn ghost" type="button" data-lmove="1" data-key="${key}" data-i="${i}" aria-label="아래로">↓</button>
          <button class="btn secondary" type="button" data-ledit="${i}" data-key="${key}">수정</button>
          <button class="btn danger" type="button" data-lremove="${i}" data-key="${key}">삭제</button>
        </div>
      </div>`).join("") || '<div class="empty">항목이 없습니다.</div>'}</div>`;

    const form = (index = -1) => {
      const item = index > -1 ? arr[index] : blank();
      content.innerHTML = title(index > -1 ? `${heading} 수정` : `${heading} 추가`, "", `<button class="btn secondary" type="button" id="listBack">목록으로</button>`) +
        `<div class="form-grid">${fields(item)}</div><div class="form-actions"><button class="btn accent" type="button" id="listSave">변경 적용</button></div>`;
      $("listBack").onclick = back;
      $("listSave").onclick = () => {
        const next = { ...item };
        content.querySelectorAll("[data-prop]").forEach((el) => {
          const prop = el.dataset.prop;
          next[prop] = el.type === "checkbox" ? el.checked : el.dataset.csv !== undefined ? el.value.split(",").map((v) => v.trim()).filter(Boolean) : el.value.trim();
        });
        if (!next.id && "id" in blank()) next.id = `${key}-${stamp()}`;
        if (index > -1) arr[index] = next; else arr.push(next);
        persist();
        back();
      };
    };

    return {
      html: title(heading, desc, `<button class="btn accent" type="button" data-ladd="${key}">${addLabel}</button>`) + html,
      bind() {
        on(`[data-ladd="${key}"]`, () => form());
        on(`[data-ledit][data-key="${key}"]`, (d) => form(Number(d.ledit)));
        on(`[data-lmove][data-key="${key}"]`, (d) => { if (move(arr, Number(d.i), Number(d.lmove))) { persist(); back(); } });
        on(`[data-lremove][data-key="${key}"]`, (d) => {
          if (!confirm("이 항목을 삭제할까요?")) return;
          arr.splice(Number(d.lremove), 1);
          persist();
          back();
        });
      },
    };
  }

  // Inputs for listEditor forms carry data-prop so the generic save can collect them.
  const prop = (label, name, value, opts = {}) =>
    field(label, `f-${name}`, Array.isArray(value) ? value.join(", ") : value, opts)
      .replace(/<(input|textarea) id="f-[^"]+"/, (m) => `${m} data-prop="${name}"${Array.isArray(value) ? " data-csv" : ""}`);

  function skillsPanel() {
    const editor = listEditor({
      key: "skillGroups", heading: "스킬 그룹", desc: "'AWS Cloud'처럼 강조할 그룹은 종류를 cloud로 지정하세요.", addLabel: "+ 그룹 추가", back: skillsPanel,
      summary: (g) => `<strong>${esc(g.title)}</strong><small>${esc(g.level)} · ${esc(g.kind)} · ${(g.items || []).length}개</small>`,
      blank: () => ({ title: "", level: "", kind: "core", description: "", items: [] }),
      fields: (g) => prop("그룹명", "title", g.title) + prop("배지", "level", g.level) +
        select("종류", "f-kind", g.kind, [["core", "core"], ["cloud", "cloud (강조)"], ["experience", "experience"]]).replace('id="f-kind"', 'id="f-kind" data-prop="kind"') +
        prop("설명", "description", g.description) +
        prop("기술 (쉼표로 구분)", "items", g.items || [], { type: "textarea", full: true }),
    });
    content.innerHTML = editor.html;
    editor.bind();
  }

  function timelinePanel() {
    const editor = listEditor({
      key: "timeline", heading: "연혁", desc: "위에서부터 순서대로 표시됩니다.", addLabel: "+ 연혁 추가", back: timelinePanel,
      summary: (t) => `<strong>${esc(t.title)}</strong><small>${esc(t.period)} · ${esc(t.subtitle)}</small>`,
      blank: () => ({ id: "", period: "", title: "", subtitle: "", description: "" }),
      fields: (t) => prop("기간", "period", t.period) + prop("기관", "subtitle", t.subtitle) + prop("제목", "title", t.title, { full: true }) + prop("설명", "description", t.description, { type: "textarea", full: true }),
    });
    content.innerHTML = editor.html;
    editor.bind();
  }

  function certsPanel() {
    const certs = listEditor({
      key: "certifications", heading: "자격증", desc: "첫 번째 자격증이 Hero 카드에 표시됩니다.", addLabel: "+ 자격증 추가", back: certsPanel,
      summary: (c) => `<strong>${esc(c.name)}</strong><small>${esc(c.issuer)} · ${esc(c.date)}${c.url ? " · 검증 링크 있음" : ""}</small>`,
      blank: () => ({ id: "", name: "", issuer: "", date: "", credential: "", url: "" }),
      fields: (c) => prop("자격증명", "name", c.name, { full: true }) + prop("발급기관", "issuer", c.issuer) + prop("취득일", "date", c.date) + prop("Credential", "credential", c.credential) + prop("검증 링크 (Credly 등)", "url", c.url || "", { type: "url" }),
    });
    const awards = listEditor({
      key: "awards", heading: "수상", desc: "", addLabel: "+ 수상 추가", back: certsPanel,
      summary: (a) => `<strong>${esc(a.name)} ${esc(a.result)}</strong><small>${esc(a.organizer)} · ${esc(a.date)}</small>`,
      blank: () => ({ id: "", name: "", result: "", organizer: "", date: "" }),
      fields: (a) => prop("대회명", "name", a.name) + prop("결과", "result", a.result) + prop("주관", "organizer", a.organizer) + prop("날짜", "date", a.date),
    });
    content.innerHTML = certs.html + '<div style="height:34px"></div>' + awards.html;
    certs.bind();
    awards.bind();
  }

  /* ---------- Publish ---------- */

  async function writeFile(root, path, body) {
    const parts = path.split("/");
    const name = parts.pop();
    let dir = root;
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
    const file = await dir.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(body);
    await writable.close();
  }

  // Replace every data: URI with a file under images/ and return how many were written.
  async function externalizeImages(root) {
    let count = 0;
    const save = async (src, path) => {
      if (!src || !src.startsWith("data:")) return src;
      const blob = await (await fetch(src)).blob();
      await writeFile(root, path, blob);
      count += 1;
      return path;
    };
    data.profile.photo = await save(data.profile.photo, `images/profile-${stamp()}.webp`);
    for (const p of data.projects) {
      p.image = await save(p.image, `images/projects/${p.id}/cover-${stamp()}.webp`);
      for (const [i, g] of (p.gallery || []).entries()) g.src = await save(g.src, `images/projects/${p.id}/${stamp()}-${i + 1}.webp`);
    }
    return count;
  }

  async function connectFolder() {
    try {
      const handle = await window.showDirectoryPicker({ id: "portfolio-repo", mode: "readwrite" });
      await (await handle.getDirectoryHandle("data")).getFileHandle("portfolio.json");
      dirHandle = handle;
    } catch (e) {
      if (e.name !== "AbortError") alert("포트폴리오 리포의 최상위 폴더(index.html과 data 폴더가 있는 곳)를 선택해 주세요.");
    }
    publishPanel();
  }

  async function saveToRepo() {
    const btn = $("saveRepo");
    btn.disabled = true;
    btn.textContent = "저장 중…";
    try {
      const images = await externalizeImages(dirHandle);
      const json = JSON.stringify(data, null, 2) + "\n";
      await writeFile(dirHandle, "data/portfolio.json", json);
      original = snapshot();
      persist();
      $("publishResult").innerHTML = `<div class="notice clean" style="margin-top:12px">저장했습니다. data/portfolio.json${images ? `과 새 이미지 ${images}개` : ""}를 리포에 썼습니다. 아래 명령으로 커밋하고 push하면 사이트에 반영됩니다.</div>`;
    } catch (e) {
      console.error(e);
      alert(`저장하지 못했습니다: ${e.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "리포에 저장";
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "portfolio.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.profile || !Array.isArray(parsed.projects)) throw new Error("invalid");
        data = parsed;
        persist();
        alert("JSON을 불러왔습니다. 초안으로 보관 중이니 확인 후 리포에 저장해 주세요.");
        publishPanel();
      } catch (e) {
        alert("올바른 포트폴리오 JSON 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
  }

  function publishPanel() {
    const supported = "showDirectoryPicker" in window;
    content.innerHTML = title("사이트에 반영", "초안을 리포 파일로 저장한 뒤 커밋·push하면 배포됩니다.") + `
      <div class="publish-step">
        <h3>1. 리포 폴더 연결</h3>
        <p>${supported
          ? (dirHandle ? `연결됨: <b>${esc(dirHandle.name)}</b>` : "이 리포의 최상위 폴더를 선택하세요. 브라우저가 파일 쓰기 권한을 묻습니다.")
          : "이 브라우저는 폴더 쓰기를 지원하지 않습니다. Chrome이나 Edge를 쓰거나 아래 JSON 내보내기를 이용하세요."}</p>
        ${supported ? `<button class="btn secondary" type="button" id="connectFolder">${dirHandle ? "다른 폴더 선택" : "폴더 연결"}</button>` : ""}
      </div>
      <div class="publish-step">
        <h3>2. 리포에 저장</h3>
        <p>새로 올린 이미지는 <code>images/</code>에 webp 파일로, 데이터는 <code>data/portfolio.json</code>에 저장됩니다.${isDirty() ? "" : " 지금은 저장할 변경 사항이 없습니다."}</p>
        <button class="btn accent" type="button" id="saveRepo" ${dirHandle ? "" : "disabled"}>리포에 저장</button>
        <div id="publishResult"></div>
      </div>
      <div class="publish-step">
        <h3>3. 커밋 · push</h3>
        <p>GitHub Pages는 main에 push하면 몇 분 안에 반영됩니다.</p>
        <p><code>git add data images</code> → <code>git commit -m "포트폴리오 내용 수정"</code> → <code>git push</code></p>
      </div>
      <div class="publish-step">
        <h3>다른 방법: JSON 파일</h3>
        <p>내보낸 JSON에는 새 이미지가 data URI로 들어 있습니다. <code>data/portfolio.json</code>을 이 파일로 바꿔도 사이트는 정상 동작합니다.</p>
        <div class="toolbar">
          <button class="btn secondary" type="button" id="exportJson">JSON 내보내기</button>
          <label class="btn secondary upload-label">JSON 불러오기<input type="file" id="importJson" accept="application/json"></label>
        </div>
      </div>`;

    if ($("connectFolder")) $("connectFolder").onclick = connectFolder;
    $("saveRepo").onclick = saveToRepo;
    $("exportJson").onclick = exportJson;
    $("importJson").onchange = (e) => { if (e.target.files[0]) importJson(e.target.files[0]); };
  }

  /* ---------- Init ---------- */

  bindThemeToggle();
  document.querySelectorAll("#adminMenu button").forEach((b) => { b.onclick = () => renderPanel(b.dataset.panel); });
  window.addEventListener("beforeunload", (e) => { if (data && isDirty() && !localStorage.getItem(DRAFT_KEY)) e.preventDefault(); });

  fetchData("../data/portfolio.json")
    .then((json) => {
      original = JSON.stringify(json);
      data = readDraft() || json;
      renderStatus();
      renderPanel("profile");
    })
    .catch((err) => {
      console.error(err);
      content.innerHTML = `<div class="empty">data/portfolio.json을 불러오지 못했습니다. 리포 폴더에서 <code>python -m http.server 8000</code>을 실행하고 <code>http://localhost:8000/admin/</code>으로 접속해 주세요.</div>`;
    });
})();
