(function () {
  'use strict';

  const TOAST_ID = 'nc-md-extract-toast';

  function showToast(message, isError) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.className = 'nc-md-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'nc-md-toast nc-md-toast--' + (isError ? 'error' : 'show');
    toast.style.display = '';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function () {
      toast.className = 'nc-md-toast nc-md-toast--hide';
      toast._timeout = setTimeout(function () {
        toast.style.display = 'none';
      }, 300);
    }, 2000);
  }

  function extractKatex(el) {
    const ann = el.querySelector('annotation[encoding="application/x-tex"]');
    if (ann) return '$' + ann.textContent.trim() + '$';
    return el.textContent.trim();
  }

  function htmlToMarkdown(element) {
    if (!element) return '';

    function processNode(node, out) {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim()) {
          out.push(text.replace(/\s+/g, ' '));
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName ? node.tagName.toUpperCase() : '';

      if (tag === 'SPAN' && node.classList.contains('katex')) {
        out.push(extractKatex(node));
        return;
      }

      if (tag === 'BR') {
        out.push('\n');
        return;
      }

      if (tag === 'PRE') {
        if (node.querySelector('.katex')) {
          for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, out);
          out.push('\n\n');
          return;
        }
        const code = node.querySelector('code');
        const text = code ? code.textContent : node.textContent;
        out.push('\n```\n' + text.trimEnd() + '\n```\n\n');
        return;
      }

      if (tag === 'CODE' && node.parentNode && node.parentNode.tagName && node.parentNode.tagName.toUpperCase() !== 'PRE') {
        out.push('`' + node.textContent + '`');
        return;
      }

      if (tag === 'STRONG' || tag === 'B') {
        out.push('**');
        for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, out);
        out.push('**');
        return;
      }

      if (tag === 'EM' || tag === 'I') {
        out.push('*');
        for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, out);
        out.push('*');
        return;
      }

      if (tag === 'IMG') {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        out.push('![' + alt + '](' + src + ')');
        return;
      }

      if (tag === 'A') {
        for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, out);
        return;
      }

      if (tag === 'BLOCKQUOTE') {
        const parts = [];
        for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, parts);
        const lines = parts.join('').split('\n');
        for (let i = 0; i < lines.length; i++) {
          out.push('> ' + lines[i] + '\n');
        }
        out.push('\n');
        return;
      }

      if (tag === 'LI') {
        const parts = [];
        for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, parts);
        const parent = node.parentNode;
        const parentTag = parent ? (parent.tagName ? parent.tagName.toUpperCase() : '') : '';
        if (parentTag === 'OL') {
          out.push('1. ' + parts.join('').trim() + '\n');
        } else {
          out.push('- ' + parts.join('').trim() + '\n');
        }
        return;
      }

      if (tag === 'OL' || tag === 'UL') {
        for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, out);
        out.push('\n');
        return;
      }

      if (tag === 'P') {
        for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, out);
        out.push('\n\n');
        return;
      }

      if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6') {
        const level = parseInt(tag.charAt(1), 10);
        const headerParts = [];
        for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, headerParts);
        out.push('#'.repeat(level) + ' ' + headerParts.join('').trim() + '\n\n');
        return;
      }

      if (tag === 'HR') {
        out.push('\n---\n\n');
        return;
      }

      if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'TEXTAREA' || tag === 'NOSCRIPT') {
        return;
      }

      for (let c = node.firstChild; c; c = c.nextSibling) processNode(c, out);
    }

    const parts = [];
    for (let c = element.firstChild; c; c = c.nextSibling) {
      processNode(c, parts);
    }

    let md = parts.join('');
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.replace(/^ +/gm, '');
    md = md.trim();
    return md;
  }

  function extractProblemContent() {
    const titleEl = document.querySelector('.question-title');
    const title = titleEl ? titleEl.textContent.trim() : '';

    const limits = [];
    const limitWrap = document.querySelector('.subject-item-wrap');
    if (limitWrap) {
      const spans = limitWrap.querySelectorAll('span');
      spans.forEach(function (s) { limits.push(s.textContent.trim()); });
    }

    const subjectDescribe = document.querySelector('.subject-describe');
    if (!subjectDescribe) return null;

    const descriptionParts = [];
    const ioParts = { inputDesc: '', outputDesc: '' };
    const examples = [];
    const remarks = [];

    const currentQuestion = subjectDescribe.querySelector('.subject-question');
    if (currentQuestion) {
      descriptionParts.push(htmlToMarkdown(currentQuestion));
    }

    const children = subjectDescribe.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tag = child.tagName ? child.tagName.toUpperCase() : '';

      if (tag === 'H2') {
        const text = child.textContent.trim();
        const nextEl = child.nextElementSibling;

        if (text === '输入描述:' || text.includes('输入描述')) {
          if (nextEl) {
            ioParts.inputDesc = htmlToMarkdown(nextEl);
          }
        } else if (text === '输出描述:' || text.includes('输出描述')) {
          if (nextEl) {
            ioParts.outputDesc = htmlToMarkdown(nextEl);
          }
        } else if (text === '备注:' || text.includes('备注')) {
          if (nextEl) {
            remarks.push(htmlToMarkdown(nextEl));
          }
        }
      }

      if (child.classList && child.classList.contains('question-oi')) {
        const exHeader = child.querySelector('.question-oi-hd');
        const exHeaderText = exHeader ? exHeader.textContent.trim() : '';

        const inputEl = child.querySelector('.question-oi-mod:nth-child(1) .question-oi-cont pre') ||
          child.querySelector('.question-oi-mod:nth-child(1) textarea');
        const outputEl = child.querySelector('.question-oi-mod:nth-child(2) .question-oi-cont pre') ||
          child.querySelector('.question-oi-mod:nth-child(2) textarea');

        const explanationMods = child.querySelectorAll('.question-oi-mod');
        let explanationText = '';
        for (let j = 0; j < explanationMods.length; j++) {
          const mod = explanationMods[j];
          const h2 = mod.querySelector('h2');
          if (h2 && (h2.textContent.includes('说明') || h2.textContent.includes('解释'))) {
            const cont = mod.querySelector('.question-oi-cont');
            if (cont) {
              explanationText = htmlToMarkdown(cont);
            }
          }
        }

        examples.push({
          header: exHeaderText,
          input: inputEl ? inputEl.textContent : '',
          output: outputEl ? outputEl.textContent : '',
          explanation: explanationText
        });
      }
    }

    return {
      title: title,
      limits: limits,
      description: descriptionParts.join('\n\n'),
      inputDesc: ioParts.inputDesc,
      outputDesc: ioParts.outputDesc,
      examples: examples,
      remarks: remarks
    };
  }

  function buildMarkdown(data) {
    if (!data) return '';

    const lines = [];

    if (data.title) {
      lines.push('# ' + data.title);
      lines.push('');
    }

    if (data.limits.length > 0) {
      for (let i = 0; i < data.limits.length; i++) {
        const limit = data.limits[i];
        if (limit.startsWith('时间') || limit.includes('时间限制')) {
          lines.push('- **时间限制**：' + limit);
        } else if (limit.startsWith('空间') || limit.includes('空间限制')) {
          lines.push('- **空间限制**：' + limit);
        } else {
          lines.push('- ' + limit);
        }
      }
      lines.push('');
    }

    if (data.description) {
      lines.push('## 题目描述');
      lines.push('');
      lines.push(data.description);
      lines.push('');
    }

    if (data.inputDesc) {
      lines.push('### 输入描述');
      lines.push('');
      lines.push(data.inputDesc);
      lines.push('');
    }

    if (data.outputDesc) {
      lines.push('### 输出描述');
      lines.push('');
      lines.push(data.outputDesc);
      lines.push('');
    }

    for (let i = 0; i < data.examples.length; i++) {
      const ex = data.examples[i];
      lines.push('### ' + ex.header);
      lines.push('');

      if (ex.input) {
        lines.push('**输入**');
        lines.push('');
        lines.push('```');
        lines.push(ex.input.trim());
        lines.push('```');
        lines.push('');
      }

      if (ex.output) {
        lines.push('**输出**');
        lines.push('');
        lines.push('```');
        lines.push(ex.output.trim());
        lines.push('```');
        lines.push('');
      }

      if (ex.explanation) {
        lines.push('**说明**');
        lines.push('');
        lines.push(ex.explanation);
        lines.push('');
      }
    }

    if (data.remarks.length > 0) {
      lines.push('## 备注');
      lines.push('');
      for (let i = 0; i < data.remarks.length; i++) {
        lines.push(data.remarks[i]);
        lines.push('');
      }
    }

    return lines.join('\n').trim();
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const success = document.execCommand('copy');
        document.body.removeChild(ta);
        return success;
      } catch (e2) {
        return false;
      }
    }
  }

  async function handleExtract(btn) {
    btn.classList.add('nc-md-extract-btn--loading');
    btn.textContent = '提取中...';

    try {
      const data = extractProblemContent();
      if (!data) {
        showToast('未识别到题目内容，请确认当前页面为牛客网题目页面', true);
        return;
      }

      const markdown = buildMarkdown(data);
      if (!markdown) {
        showToast('提取的内容为空', true);
        return;
      }

      const success = await copyToClipboard(markdown);
      if (success) {
        showToast('Markdown 已复制到剪贴板！');
      } else {
        showToast('复制失败，请重试', true);
      }
    } catch (err) {
      console.error('[NC MD Extract] Error:', err);
      showToast('提取失败：' + (err.message || '未知错误'), true);
    } finally {
      btn.classList.remove('nc-md-extract-btn--loading');
      btn.innerHTML = '<svg class="nc-md-extract-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>提取为Markdown';
    }
  }

  function injectButton() {
    const headerLeft = document.querySelector('.header-bar .header-left');
    if (!headerLeft) return;

    if (headerLeft.querySelector('.nc-md-extract-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'nc-md-extract-btn';
    btn.innerHTML = '<svg class="nc-md-extract-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>提取为Markdown';
    btn.title = '将题目内容提取为Markdown并复制到剪贴板';
    btn.addEventListener('click', function () {
      handleExtract(btn);
    });

    headerLeft.appendChild(btn);
  }

  function init() {
    const questionModule = document.querySelector('.question-module, .terminal-topic');
    if (!questionModule) {
      const observer = new MutationObserver(function (mutations, obs) {
        const qm = document.querySelector('.question-module, .terminal-topic');
        if (qm) {
          obs.disconnect();
          injectButton();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { observer.disconnect(); }, 10000);
    } else {
      injectButton();
    }

    const observer = new MutationObserver(function (mutations) {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        for (let j = 0; j < m.addedNodes.length; j++) {
          const node = m.addedNodes[j];
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.querySelector && (node.querySelector('.question-title') || node.querySelector('.question-module'))) {
              injectButton();
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
