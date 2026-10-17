/* Shared helpers for the public page and the local admin tool. */
(function (global) {
  "use strict";

  const THEME_KEY = "kd_portfolio_theme";
  const DRAFT_KEY = "kd_portfolio_draft_v4";

  function esc(value = "") {
    return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function multiline(value = "") {
    return esc(value).replace(/\n/g, "<br>");
  }

  function linkSafe(url = "") {
    return /^(https?:\/\/|mailto:)/i.test(url) ? url : "";
  }

  // Image sources may be repo-relative paths or data URIs (fresh uploads from the admin tool).
  function srcSafe(src = "") {
    return /^(data:image\/|https?:\/\/|[\w./-]+$)/i.test(src) ? src : "";
  }

  function routeKey(project) {
    return project.routeKey || project.id;
  }

  function sortedProjects(list) {
    return [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  async function fetchData(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function applyTheme(theme, persist = true) {
    document.documentElement.dataset.theme = theme;
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }
    const dark = theme === "dark";
    const label = document.getElementById("themeLabel");
    if (label) label.textContent = dark ? "Light" : "Dark";
    const btn = document.getElementById("themeToggle");
    if (btn) btn.setAttribute("aria-label", dark ? "라이트 모드로 전환" : "다크 모드로 전환");
  }

  function bindThemeToggle() {
    applyTheme(document.documentElement.dataset.theme || "light", false);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  }

  global.Portfolio = { DRAFT_KEY, esc, multiline, linkSafe, srcSafe, routeKey, sortedProjects, fetchData, readDraft, applyTheme, bindThemeToggle };
})(window);
