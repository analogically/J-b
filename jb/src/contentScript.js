(function run() {
  const STYLE_ID = 'jb-highlighter-style';
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* J*B Highlighter */
    *:not(html):not(head):not(style):not(script) {
      outline: 1px dashed rgba(255, 0, 76, 0.6);
      outline-offset: 1px;
    }
  `;
  document.documentElement.appendChild(style);
})();

