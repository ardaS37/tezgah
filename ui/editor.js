const words = /^(?:const|let|var|export|default|import|from|as|function|return|class|extends|if|else|switch|case|for|while|try|catch|finally|throw|async|await|new|typeof|instanceof|in|of|def|lambda|yield|with|except|raise|pass|break|continue|public|private|protected|static|readonly|interface|type|namespace|using|struct|enum|fn|impl|pub|use|match|mod|package|func|go|defer|select)$/;
const literals = /^(?:true|false|null|undefined|None|True|False|nil|self|this)$/;
const flavors = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', py: 'Python',
  css: 'CSS', scss: 'SCSS', html: 'HTML', htm: 'HTML', json: 'JSON', jsonc: 'JSON', md: 'Markdown', mdx: 'Markdown',
  rs: 'Rust', go: 'Go', cs: 'C#', cpp: 'C++', c: 'C', h: 'C', java: 'Java', sh: 'Shell', ps1: 'PowerShell', toml: 'TOML', yml: 'YAML', yaml: 'YAML',
};

export const language = (file = '') => flavors[file.split('.').pop().toLowerCase()] ?? 'Metin';

function colorCode(text, type) {
  const fragment = document.createDocumentFragment();
  if (type === 'Metin') return fragment.appendChild(document.createTextNode(text));
  const tokens = /\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|<!--(?:[\s\S]*?)(?:-->|$)|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\[\s\S]|[^`\\])*`|\b\d+(?:\.\d+)?\b|[\p{L}_$][\p{L}\p{N}_$]*|[^\s]/gu;
  let last = 0;
  const span = (kind, value) => {
    const token = document.createElement('span');
    token.className = `syn-${kind}`;
    token.textContent = value;
    fragment.append(token);
  };
  for (const match of text.matchAll(tokens)) {
    const value = match[0];
    if (match.index > last) fragment.append(text.slice(last, match.index));
    last = match.index + value.length;
    if (value.startsWith('//') || value.startsWith('/*') || value.startsWith('<!--')) span('comment', value);
    else if (['"', "'", '`'].includes(value[0])) span('string', value);
    else if (words.test(value)) span('keyword', value);
    else if (literals.test(value) || /^\d/.test(value)) span('literal', value);
    else if (/^[\p{L}_$]/u.test(value) && /^\s*\(/.test(text.slice(last, last + 32))) span('fn', value);
    else if (/^[A-Z][\w$]*$/.test(value)) span('type', value);
    else if (/^[{}()[\].,:;+*/=<>!?%-]$/.test(value)) span('operator', value);
    else fragment.append(value);
  }
  fragment.append(text.slice(last));
  return fragment;
}

export function bindEditor({ input, highlight, gutter, position, onInput }) {
  let type = 'Metin';
  let frame;
  const scroll = () => {
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
    gutter.style.transform = `translateY(${-input.scrollTop}px)`;
  };
  const cursor = () => {
    const before = input.value.slice(0, input.selectionStart);
    const line = before.split('\n').length;
    const column = before.length - before.lastIndexOf('\n');
    position.textContent = `Satır ${line}, Sütun ${column}`;
  };
  const draw = () => {
    const value = input.value;
    highlight.replaceChildren(value.length <= 115_000 ? colorCode(value, type) : document.createTextNode(value), '\n');
    const count = value.split('\n').length;
    gutter.textContent = Array.from({ length: Math.min(count, 50_000) }, (_, index) => index + 1).join('\n');
    scroll();
    cursor();
  };
  function update() {
    onInput(input.value);
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }
  function insert(text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    // The native edit keeps keyboard undo available for automatic indentation.
    if (!document.execCommand('insertText', false, text)) {
      input.setRangeText(text, start, end, 'end');
      update();
    }
  }
  input.addEventListener('input', update);
  input.addEventListener('scroll', scroll);
  for (const event of ['keyup', 'click', 'select', 'focus']) input.addEventListener(event, cursor);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      insert('  ');
    }
    if (event.key === 'Enter' && !event.isComposing) {
      const before = input.value.slice(0, input.selectionStart);
      const prefix = before.slice(before.lastIndexOf('\n') + 1);
      const whitespace = prefix.match(/^[\t ]*/)[0];
      const extra = /[{([]\s*$/.test(prefix) ? '  ' : '';
      if (whitespace || extra) {
        event.preventDefault();
        insert(`\n${whitespace}${extra}`);
      }
    }
  });
  return {
    set(text, file, view = {}) {
      type = language(file);
      input.value = text;
      input.setSelectionRange(view.start ?? 0, view.end ?? view.start ?? 0);
      input.scrollTop = view.top ?? 0;
      input.scrollLeft = view.left ?? 0;
      draw();
    },
    view: () => ({ start: input.selectionStart, end: input.selectionEnd, top: input.scrollTop, left: input.scrollLeft }),
  };
}
