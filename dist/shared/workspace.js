/* Reuse the interior workspace language setting on the exterior page. */
(() => {
  const key = 'huxing-lang';
  let language = 'zh';
  try { language = localStorage.getItem(key) === 'en' ? 'en' : 'zh'; } catch {}
  const tr = (zh, en) => language === 'en' ? en : zh;
  function applyLanguage() {
    document.documentElement.lang = tr('zh-CN', 'en');
    document.title = tr('外观设计 · 住宅设计工作台', 'Exterior · House Design Studio');
    document.querySelectorAll('[data-en]').forEach(element => {
      element.dataset.zh ??= element.textContent;
      element.textContent = tr(element.dataset.zh, element.dataset.en);
    });
    document.getElementById('langBtn').textContent = tr('EN', '中文');
    document.dispatchEvent(new CustomEvent('workspace-language'));
  }
  document.getElementById('langBtn').onclick = () => {
    language = language === 'en' ? 'zh' : 'en';
    try { localStorage.setItem(key, language); } catch {}
    applyLanguage();
  };
  window.WorkspaceUI = {tr};
  applyLanguage();
})();
