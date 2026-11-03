// Власний випадаючий список поверх звичайного <select>. Сам <select> лишається прихованим:
// він надсилає значення у формі, а без JavaScript працює як звичайний список.
// Клавіатура й ролі ARIA за шаблоном WAI-ARIA «select-only combobox».

export function enhanceSelect(select: HTMLSelectElement) {
  const options = [...select.options];
  const label = select.id ? document.querySelector<HTMLLabelElement>(`label[for="${select.id}"]`) : null;
  const listId = `${select.id}-list`;
  const optionId = (i: number) => `${select.id}-opt-${i}`;

  const root = document.createElement('div');
  root.className = 'select';

  const trigger = document.createElement('div');
  trigger.className = 'select__trigger';
  trigger.tabIndex = 0;
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', listId);
  if (label) {
    label.id ||= `${select.id}-label`;
    trigger.setAttribute('aria-labelledby', label.id);
    // Натискання на підпис ставить фокус на список, як у звичайного <select>.
    label.addEventListener('click', (event) => {
      event.preventDefault();
      trigger.focus();
    });
  }
  const value = document.createElement('span');
  value.className = 'select__value';
  const chevron = document.createElement('span');
  chevron.className = 'select__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  trigger.append(value, chevron);

  const list = document.createElement('ul');
  list.className = 'select__list';
  list.id = listId;
  list.setAttribute('role', 'listbox');
  if (label) list.setAttribute('aria-labelledby', label.id);
  list.hidden = true;

  const items = options.map((option, i) => {
    const item = document.createElement('li');
    item.className = 'select__option';
    item.id = optionId(i);
    item.setAttribute('role', 'option');
    item.append(...optionContent(option));
    item.addEventListener('mousemove', () => setActive(i));
    item.addEventListener('click', () => {
      choose(i);
      close();
    });
    return item;
  });
  list.append(...items);
  // Клік по списку не забирає фокус із поля, інакше список закрився б раніше за вибір.
  list.addEventListener('mousedown', (event) => event.preventDefault());
  root.append(trigger, list);
  select.after(root);
  select.hidden = true;

  let active = 0;

  function setActive(i: number) {
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((item, n) => item.classList.toggle('is-active', n === active));
    trigger.setAttribute('aria-activedescendant', optionId(active));
    const item = items[active];
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }

  function sync() {
    const current = Math.max(0, select.selectedIndex);
    value.replaceChildren(...optionContent(options[current]));
    items.forEach((item, n) => item.setAttribute('aria-selected', String(n === current)));
  }

  function choose(i: number) {
    select.selectedIndex = i;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function open() {
    if (!list.hidden) return;
    list.hidden = false;
    root.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, select.selectedIndex));
    list.scrollIntoView({ block: 'nearest' });
  }

  function close() {
    if (list.hidden) return;
    list.hidden = true;
    root.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
  }

  // Пошук за першими літерами чи цифрами: «27» веде на 27 бригаду.
  let typed = '';
  let typedTimer: number | undefined;
  function typeAhead(char: string) {
    window.clearTimeout(typedTimer);
    typedTimer = window.setTimeout(() => (typed = ''), 600);
    typed += char.toLocaleLowerCase('uk');
    const match = options.findIndex((o) => o.text.trim().toLocaleLowerCase('uk').startsWith(typed));
    if (match < 0) return;
    if (list.hidden) open();
    setActive(match);
  }

  trigger.addEventListener('click', () => (list.hidden ? open() : close()));
  trigger.addEventListener('blur', close);
  trigger.addEventListener('keydown', (event) => {
    const { key } = event;
    if (list.hidden) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(key)) {
        event.preventDefault();
        open();
        if (key === 'Home') setActive(0);
        if (key === 'End') setActive(items.length - 1);
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        typeAhead(key);
      }
      return;
    }
    switch (key) {
      case 'ArrowDown': setActive(active + 1); break;
      case 'ArrowUp': setActive(active - 1); break;
      case 'Home': setActive(0); break;
      case 'End': setActive(items.length - 1); break;
      case 'PageDown': setActive(active + 5); break;
      case 'PageUp': setActive(active - 5); break;
      case 'Escape': close(); break;
      case 'Enter':
        choose(active);
        close();
        break;
      case 'Tab':
        // За шаблоном ARIA: Tab вибирає поточний пункт і переходить далі.
        choose(active);
        close();
        return;
      default:
        // Пробіл усередині введеного пошуку є частиною тексту, інакше він вибирає пункт.
        if (key === ' ' && !typed) {
          choose(active);
          close();
        } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          typeAhead(key);
        } else {
          return;
        }
    }
    event.preventDefault();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target as Node)) close();
  });
  select.addEventListener('change', sync);
  // Подія reset спрацьовує до скидання значень, тому синхронізуємо наступним кроком.
  select.form?.addEventListener('reset', () => window.setTimeout(sync));
  sync();
}

function optionContent(option: HTMLOptionElement): Node[] {
  const text = document.createElement('span');
  text.className = 'select__text';
  text.textContent = option.text;
  const { mark, emblem } = option.dataset;
  if (emblem) {
    const img = document.createElement('img');
    img.className = 'select__emblem-img';
    img.src = emblem;
    img.alt = '';
    return [img, text];
  }
  if (mark) {
    const shield = document.createElement('span');
    shield.className = 'emblem select__emblem';
    shield.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.textContent = mark;
    shield.append(inner);
    return [shield, text];
  }
  return [text];
}
