(function () {
  "use strict";

  const { esc, multiline, linkSafe, srcSafe, routeKey, sortedProjects, fetchData, readDraft, bindThemeToggle } = window.Portfolio;
  const $ = (id) => document.getElementById(id);

  let data = null;
  let modalOpenedFromPage = false;
  let returnFocus = null;
  const viewer = { project: null, index: 0, returnFocus: null };

  /* ---------- Data ---------- */

  async function load() {
    const preview = new URLSearchParams(location.search).has("preview") && readDraft();
    if (preview) {
      showPreviewBanner();
      return preview;
    }
    return fetchData("data/portfolio.json");
  }

  function showPreviewBanner() {
    const el = document.createElement("div");
    el.className = "notice preview-banner";
    el.textContent = "관리자 초안 미리보기입니다. 실제 사이트에는 아직 반영되지 않았습니다.";
    document.body.prepend(el);
  }

  function showLoadError(err) {
    console.error(err);
    const main = $("main");
    const box = document.createElement("div");
    box.className = "container";
    box.innerHTML = `<p class="notice" style="margin:40px auto">포트폴리오 데이터를 불러오지 못했습니다. 로컬에서 열었다면 <code>python -m http.server</code>로 서버를 띄운 뒤 접속해 주세요.</p>`;
    main.prepend(box);
  }

  /* ---------- Rendering ---------- */

  const publishedProjects = () => data.projects.filter((p) => p.published);

  function img(src, alt, attrs = "") {
    const safe = srcSafe(src);
    return safe ? `<img src="${esc(safe)}" alt="${esc(alt)}" loading="lazy" decoding="async" ${attrs}>` : "";
  }

  function externalLink(href, label, cls = "") {
    const safe = linkSafe(href);
    return safe ? `<a class="${cls}" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>` : "";
  }

  function renderHero() {
    const s = data.settings, p = data.profile;
    $("heroEyebrow").textContent = s.heroEyebrow;
    $("heroBadge").textContent = s.heroBadge || "";
    $("heroLead").textContent = s.heroLead;
    $("heroAccent").textContent = s.heroAccent;
    $("heroDesc").textContent = s.heroDescription;

    const github = linkSafe(p.github);
    $("githubBtn").classList.toggle("hidden", !github);
    if (github) $("githubBtn").href = github;

    const photo = srcSafe(p.photo);
    $("photoBox").innerHTML = photo
      ? `<img class="profile-photo" src="${esc(photo)}" alt="${esc(p.name)} 프로필 사진" width="478" height="650" fetchpriority="high">`
      : `<div class="photo-placeholder" aria-hidden="true">DH</div>`;
    $("contactMini").innerHTML = [
      `<strong>${esc(p.name)}</strong>`,
      p.email ? `<a href="mailto:${esc(p.email)}">✉ ${esc(p.email)}</a>` : "",
      externalLink(p.github, "↗ GitHub"),
      externalLink(p.blog, "↗ Tech Blog"),
    ].join("");

    const cert = data.certifications[0];
    $("cloudNote").innerHTML = cert
      ? `<strong>${esc(cert.name)}</strong><span>${esc(cert.issuer)} · ${esc(cert.date)} 취득</span>`
      : "";
    $("cloudNote").classList.toggle("hidden", !cert);
  }

  function renderAbout() {
    $("aboutText").textContent = data.profile.about;
    const pub = publishedProjects();
    const stats = [
      [pub.length, "공개 프로젝트"],
      [pub.filter((p) => p.live).length, "실제 운영 중인 서비스"],
      [data.certifications.length, "자격증"],
      [data.awards.length, "수상"],
    ];
    $("stats").innerHTML = stats.map(([n, label]) => `<div class="stat card"><b data-count="${n}">${n}</b><span>${label}</span></div>`).join("");
  }

  function renderSkills() {
    $("skillGrid").innerHTML = data.skillGroups.map((g) => `
      <article class="skill-group card ${g.kind === "cloud" ? "cloud" : ""}">
        <div class="skill-group-head">
          <div><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p></div>
          <span class="mini-badge ${g.kind === "cloud" ? "accent" : ""}">${esc(g.level)}</span>
        </div>
        <ul class="skills" role="list">${(g.items || []).map((i) => `<li class="chip">${esc(i)}</li>`).join("")}</ul>
      </article>`).join("");
  }

  function renderTimeline() {
    $("timelineList").innerHTML = data.timeline.map((i) => `
      <article class="timeline-item card">
        <div class="timeline-date">${esc(i.period)}</div>
        <div><h3>${esc(i.title)}</h3><p>${[i.subtitle, i.description].filter(Boolean).map(esc).join(" · ")}</p></div>
      </article>`).join("") || '<div class="empty">등록된 연혁이 없습니다.</div>';
  }

  function projectCard(project) {
    const key = esc(routeKey(project));
    return `<article class="project-card card ${project.featured ? "is-featured" : ""}">
      <div class="project-image-wrap">
        ${img(project.image, `${project.title} 대표 이미지`) || '<div class="project-image-placeholder"><span>PROJECT PREVIEW</span></div>'}
        <div class="project-category">
          <span class="mini-badge accent">${esc(project.category || "PROJECT")}</span>
          ${project.live ? '<span class="mini-badge live"><span class="status-dot" aria-hidden="true"></span>LIVE</span>' : ""}
        </div>
      </div>
      <div class="project-body">
        <div class="project-title-row"><h3>${esc(project.title)}</h3><span class="mini-badge">${esc(project.level || "Project")}</span></div>
        <p>${esc(project.description)}</p>
        ${highlights(project)}
        <ul class="project-tags" role="list">${(project.tags || []).slice(0, 5).map((t) => `<li class="chip">${esc(t)}</li>`).join("")}</ul>
        <div class="project-foot">
          <span class="project-date">${esc(project.date || "")}</span>
          <button type="button" class="project-open" data-project="${key}" aria-haspopup="dialog" aria-label="${esc(project.title)} 자세히 보기">자세히 보기 →</button>
        </div>
      </div>
    </article>`;
  }

  function renderProjects() {
    const pub = publishedProjects();
    const featured = sortedProjects(pub.filter((p) => p.featured));
    const archive = sortedProjects(pub.filter((p) => !p.featured));
    const group = (title, desc, list, badge = "") => `
      <div class="project-group">
        <div class="project-group-head"><div><h3>${title}</h3><p>${desc}</p></div>${badge}</div>
        <div class="project-grid">${list.map(projectCard).join("")}</div>
      </div>`;
    let html = "";
    if (featured.length) html += group("Featured Projects", "실제로 운영 중이거나 설계부터 깊이 참여한 프로젝트", featured, `<span class="mini-badge accent">${featured.length} CASE STUDIES</span>`);
    if (archive.length) html += group("Archive", "학부 시절 하드웨어·임베디드 프로젝트", archive);
    $("projectGroups").innerHTML = html || '<div class="empty">게시된 프로젝트가 없습니다.</div>';
  }

  function renderCredentials() {
    $("certGrid").innerHTML = data.certifications.map((c) => `
      <article class="cert-card card">
        <div class="cert-icon" aria-hidden="true">${/AWS|Amazon Web Services/i.test(`${c.name} ${c.issuer}`) ? "AWS" : "IT"}</div>
        <div>
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.issuer)} · ${esc(c.date)}${c.credential ? ` · ${esc(c.credential)}` : ""}</p>
          ${externalLink(c.url, "자격 확인 ↗")}
        </div>
      </article>`).join("");

    const box = $("achievementBox");
    const show = data.settings.showAchievements && data.awards.length;
    box.classList.toggle("hidden", !show);
    if (show) {
      box.innerHTML = `<div class="achievement-head"><strong>Awards</strong></div>
        <div class="achievement-list">${data.awards.map((a) => `<span class="achievement-item">${esc(a.name)} ${esc(a.result)} · ${esc(a.organizer || "")} · ${esc(a.date)}</span>`).join("")}</div>`;
    }
  }

  function renderContact() {
    const p = data.profile;
    const resume = srcSafe(p.resume);
    $("contactActions").innerHTML = [
      p.email ? `<a class="btn accent" href="mailto:${esc(p.email)}"><span>✉ ${esc(p.email)}</span><span aria-hidden="true">→</span></a>` : "",
      p.email ? `<button class="btn secondary" type="button" id="copyEmail"><span>메일 주소 복사</span><span aria-hidden="true">⧉</span></button>` : "",
      resume ? `<a class="btn secondary" href="${esc(resume)}" download><span>이력서 PDF</span><span aria-hidden="true">↓</span></a>` : "",
      linkSafe(p.github) ? `<a class="btn secondary" href="${esc(linkSafe(p.github))}" target="_blank" rel="noopener noreferrer"><span>GitHub</span><span aria-hidden="true">↗</span></a>` : "",
      linkSafe(p.blog) ? `<a class="btn secondary" href="${esc(linkSafe(p.blog))}" target="_blank" rel="noopener noreferrer"><span>Tech Blog</span><span aria-hidden="true">↗</span></a>` : "",
      `<div class="copy-status" id="copyStatus" role="status"></div>`,
    ].join("");

    const copy = $("copyEmail");
    if (copy) copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(p.email);
        $("copyStatus").textContent = "메일 주소를 복사했습니다.";
      } catch (e) {
        $("copyStatus").textContent = p.email;
      }
    });

    $("footerLinks").innerHTML = [externalLink(p.github, "GitHub"), externalLink(p.blog, "Blog"), p.email ? `<a href="mailto:${esc(p.email)}">Email</a>` : ""].join("");
    $("year").textContent = new Date().getFullYear();
  }

  function renderAll() {
    renderHero();
    renderAbout();
    renderSkills();
    renderTimeline();
    renderProjects();
    renderCredentials();
    renderContact();
  }

  /* ---------- Project modal ---------- */

  const findProject = (key) => data.projects.find((p) => routeKey(p) === key || p.id === key);
  const hasText = (v) => !!String(v || "").trim();

  function caseSection(label, title, value) {
    if (!hasText(value)) return "";
    return `<section class="case-section"><span class="case-label">${esc(label)}</span><h3>${esc(title)}</h3><p>${multiline(value)}</p></section>`;
  }

  function architectureFlows(project) {
    const flows = (project.architectureFlows || []).filter((f) => f.nodes && f.nodes.length);
    if (!flows.length) return "";
    // --r / --i drive the staggered "data flowing" animation in CSS.
    return `<div class="flows">${flows.map((f, r) => `
      <div class="flow" style="--r:${r}">
        <div class="flow-label">${esc(f.label || "흐름")}</div>
        <ol class="flow-nodes">${f.nodes.map((n, i) => `<li style="--i:${i}"><span class="service">${esc(n)}</span></li>`).join("")}</ol>
      </div>`).join("")}</div>`;
  }

  function highlights(project) {
    const rows = (project.highlights || []).filter((h) => h.value);
    if (!rows.length) return "";
    return `<ul class="highlights" role="list">${rows.map((h) => `<li><b>${esc(h.value)}</b><span>${esc(h.label || "")}</span></li>`).join("")}</ul>`;
  }

  function galleryGrid(project) {
    return `<div class="gallery-grid">${project.gallery.map((g, i) => `
      <button type="button" class="gallery-item" data-gallery="${i}" aria-label="${esc(g.caption || `이미지 ${i + 1}`)} 크게 보기">
        ${img(g.src, g.caption || project.title)}
        <span>${esc(g.caption || `Gallery ${i + 1}`)}</span>
      </button>`).join("")}</div>`;
  }

  function projectModal(project) {
    const hasArch = hasText(project.architecture) || (project.architectureFlows || []).some((f) => f.nodes?.length);
    const tabs = [
      ["overview", "Overview", [
        caseSection("Overview", "프로젝트 개요", project.overview || project.description),
        caseSection("Problem", "문제와 목표", project.problem),
        caseSection("My Role", "담당 역할과 기여", project.contribution || project.role),
      ].join("")],
      ["build", "Implementation", caseSection("Implementation", "구현 내용", project.implementation)],
      ["architecture", "Architecture", hasArch ? `<section class="case-section"><span class="case-label">Architecture</span><h3>시스템 구성과 데이터 흐름</h3>${architectureFlows(project)}${hasText(project.architecture) ? `<p>${multiline(project.architecture)}</p>` : ""}</section>` : ""],
      ["trouble", hasText(project.troubleshooting) ? "Issues & Learnings" : "Result", caseSection("Trouble Shooting", "해결한 이슈", project.troubleshooting) + caseSection("Result", "결과와 배운 점", project.result)],
      ["gallery", "Gallery", project.gallery?.length ? galleryGrid(project) : ""],
    ].filter(([, , html]) => html);

    const facts = [["기간", project.date], ["구분", project.level], ["역할", project.role]]
      .filter(([, v]) => v)
      .map(([k, v]) => `<div class="fact"><span>${k}</span><strong>${esc(v)}</strong></div>`).join("");

    return `<div class="modal-top">
        <div class="modal-top-badges">
          <span class="mini-badge accent">${esc(project.category || "PROJECT")}</span>
          ${project.live ? '<span class="mini-badge live"><span class="status-dot" aria-hidden="true"></span>LIVE</span>' : ""}
        </div>
        <button class="modal-close" type="button" data-close-modal aria-label="프로젝트 상세 닫기">×</button>
      </div>
      <div class="modal-body">
        <div class="modal-hero">
          <div>
            <div class="eyebrow">Project Case Study</div>
            <h2 id="modalProjectTitle">${esc(project.title)}</h2>
            <p class="modal-summary">${esc(project.description)}</p>
            ${highlights(project)}
            <ul class="project-tags" role="list">${(project.tags || []).map((t) => `<li class="chip">${esc(t)}</li>`).join("")}</ul>
          </div>
          <div class="modal-facts">${facts}</div>
        </div>
        ${img(project.image, `${project.title} 대표 이미지`, 'class="modal-cover"')}
        <div class="modal-tabs" role="tablist" aria-label="프로젝트 상세 항목">
          ${tabs.map(([id, label], i) => `<button class="modal-tab" type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${id}">${label}</button>`).join("")}
        </div>
        ${tabs.map(([id, , html], i) => `<div class="tab-panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" tabindex="0" ${i === 0 ? "" : "hidden"}>${html}</div>`).join("")}
        <div class="modal-actions">
          ${linkSafe(project.demo) ? `<a class="btn accent" href="${esc(linkSafe(project.demo))}" target="_blank" rel="noopener noreferrer">Live Demo ↗</a>` : ""}
          ${linkSafe(project.github) ? `<a class="btn secondary" href="${esc(linkSafe(project.github))}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>` : ""}
        </div>
      </div>`;
  }

  function selectTab(id, focus = false) {
    const modal = $("projectModal");
    modal.querySelectorAll('[role="tab"]').forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    modal.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = p.id !== `panel-${id}`; });

    // Replay the architecture flow animation each time the tab is opened.
    const flows = id === "architecture" && modal.querySelector(".flows");
    if (flows) {
      flows.classList.remove("animate");
      void flows.offsetWidth;
      flows.classList.add("animate");
    }
  }

  function openModal(project) {
    const backdrop = $("projectModalBackdrop");
    if (!backdrop.classList.contains("open")) returnFocus = document.activeElement;
    $("projectModal").innerHTML = projectModal(project);
    $("projectModal").scrollTop = 0;
    backdrop.classList.add("open");
    document.body.classList.add("modal-open");
    document.title = `${project.title} | 김동현 포트폴리오`;
    requestAnimationFrame(() => $("projectModal").querySelector("[data-close-modal]").focus());
  }

  function closeModalView() {
    const backdrop = $("projectModalBackdrop");
    if (!backdrop.classList.contains("open")) return;
    closeViewer();
    backdrop.classList.remove("open");
    document.body.classList.remove("modal-open");
    document.title = "김동현 | Cloud Engineer · Developer";
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  }

  // The modal is driven by the URL hash (#project/<key>) so case studies can be linked directly.
  function requestOpen(key) {
    modalOpenedFromPage = true;
    location.hash = `#project/${encodeURIComponent(key)}`;
  }

  function requestClose() {
    if (!location.hash.startsWith("#project/")) return closeModalView();
    if (modalOpenedFromPage) {
      modalOpenedFromPage = false;
      history.back();
    } else {
      history.replaceState(null, "", "#projects");
      closeModalView();
    }
  }

  function route() {
    const hash = location.hash;
    if (hash.startsWith("#project/")) {
      const project = findProject(decodeURIComponent(hash.slice(9)));
      if (project && project.published) return openModal(project);
      history.replaceState(null, "", "#projects");
    }
    modalOpenedFromPage = false;
    closeModalView();
  }

  /* ---------- Image viewer ---------- */

  function showViewerImage() {
    const g = viewer.project.gallery[viewer.index];
    const total = viewer.project.gallery.length;
    $("imageViewerImg").src = srcSafe(g.src);
    $("imageViewerImg").alt = g.caption || viewer.project.title;
    $("imageViewerCaption").textContent = `${g.caption || viewer.project.title} (${viewer.index + 1} / ${total})`;
    $("viewerPrev").hidden = total < 2;
    $("viewerNext").hidden = total < 2;
  }

  function openViewer(project, index) {
    viewer.project = project;
    viewer.index = index;
    viewer.returnFocus = document.activeElement;
    showViewerImage();
    $("imageViewer").classList.add("open");
    $("viewerClose").focus();
  }

  function stepViewer(dir) {
    const total = viewer.project.gallery.length;
    viewer.index = (viewer.index + dir + total) % total;
    showViewerImage();
  }

  function closeViewer() {
    const el = $("imageViewer");
    if (!el.classList.contains("open")) return false;
    el.classList.remove("open");
    $("imageViewerImg").src = "data:,";
    if (viewer.returnFocus && document.contains(viewer.returnFocus)) viewer.returnFocus.focus();
    return true;
  }

  /* ---------- Focus trap ---------- */

  function trapFocus(e, container) {
    const items = [...container.querySelectorAll('a[href], button:not([hidden]), [tabindex="0"]')].filter((el) => !el.closest("[hidden]") && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Navigation ---------- */

  function bindNav() {
    const menu = $("menuToggle"), links = $("navLinks");
    const setMenu = (open) => {
      links.classList.toggle("open", open);
      menu.setAttribute("aria-expanded", open);
      menu.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    };
    menu.addEventListener("click", () => setMenu(!links.classList.contains("open")));
    links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".nav-right")) setMenu(false); });

    if (!("IntersectionObserver" in window)) return;
    const navMap = new Map([...links.querySelectorAll("a")].map((a) => [a.getAttribute("href").slice(1), a]));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navMap.forEach((a, id) => {
          const on = id === entry.target.id;
          a.classList.toggle("active", on);
          if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navMap.forEach((_, id) => { const s = $(id); if (s) observer.observe(s); });
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      const open = e.target.closest("[data-project]");
      if (open) return requestOpen(open.dataset.project);
      if (e.target.closest("[data-close-modal]")) return requestClose();
      const tab = e.target.closest('[role="tab"]');
      if (tab) return selectTab(tab.dataset.tab);
      const thumb = e.target.closest("[data-gallery]");
      if (thumb) {
        const project = findProject(decodeURIComponent(location.hash.slice(9)));
        if (project) openViewer(project, Number(thumb.dataset.gallery));
      }
    });

    $("projectModalBackdrop").addEventListener("click", (e) => { if (e.target === e.currentTarget) requestClose(); });
    $("imageViewer").addEventListener("click", (e) => { if (e.target === e.currentTarget || e.target.classList.contains("image-viewer-inner")) closeViewer(); });
    $("viewerClose").addEventListener("click", closeViewer);
    $("viewerPrev").addEventListener("click", () => stepViewer(-1));
    $("viewerNext").addEventListener("click", () => stepViewer(1));

    $("projectModal").addEventListener("keydown", (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const tabs = [...$("projectModal").querySelectorAll('[role="tab"]')];
      const i = tabs.indexOf(tab);
      const next = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: tabs.length - 1 }[e.key];
      e.preventDefault();
      selectTab(tabs[(next + tabs.length) % tabs.length].dataset.tab, true);
    });

    document.addEventListener("keydown", (e) => {
      const viewerOpen = $("imageViewer").classList.contains("open");
      const modalOpen = $("projectModalBackdrop").classList.contains("open");
      if (e.key === "Escape") {
        if (viewerOpen) closeViewer();
        else if (modalOpen) requestClose();
      } else if (viewerOpen && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        stepViewer(e.key === "ArrowLeft" ? -1 : 1);
      } else if (e.key === "Tab") {
        if (viewerOpen) trapFocus(e, $("imageViewer"));
        else if (modalOpen) trapFocus(e, $("projectModal"));
      }
    });

    window.addEventListener("hashchange", route);
  }

  /* ---------- Motion ---------- */

  // The inline script in <head> adds html.motion unless the user prefers reduced motion.
  const motionOn = () => document.documentElement.classList.contains("motion");

  function countUp(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target) || target <= 0) return;
    const start = performance.now(), duration = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    el.textContent = "0";
    requestAnimationFrame(tick);
  }

  function setupReveal() {
    if (!motionOn() || !("IntersectionObserver" in window)) return;
    const targets = document.querySelectorAll(
      "main section:not(.hero) .section-head, .about-card, .stat, .skill-group, .project-group-head, .project-card, .timeline-item, .cert-card, .achievements, .contact-card"
    );
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.classList.add("is-visible");
        const counter = el.querySelector("[data-count]");
        if (counter) countUp(counter);
        // Drop the reveal styles afterwards so hover transitions are not delayed.
        const delay = parseInt(el.style.getPropertyValue("--delay"), 10) || 0;
        setTimeout(() => { el.classList.remove("reveal", "is-visible"); el.style.removeProperty("--delay"); }, 700 + delay);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    targets.forEach((el) => {
      const index = [...el.parentElement.children].indexOf(el);
      el.style.setProperty("--delay", `${(index % 4) * 80}ms`);
      el.classList.add("reveal");
      observer.observe(el);
    });
  }

  /* ---------- Init ---------- */

  bindThemeToggle();
  bindNav();
  bindEvents();

  load()
    .then((json) => {
      data = json;
      renderAll();
      setupReveal();
      document.querySelector(".hero").classList.add("hero-ready");
      const hash = location.hash;
      if (hash.startsWith("#project/")) route();
      else if (hash.length > 1) document.getElementById(hash.slice(1))?.scrollIntoView();
    })
    .catch((err) => {
      document.querySelector(".hero").classList.add("hero-ready");
      showLoadError(err);
    });
})();
