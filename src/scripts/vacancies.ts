import { withBase } from '../utils/url';

type Vacancy = { id: string; unit: string; title: string; description: string };
type UnitInfo = { id: string; mark: string; title: string; emblem?: string };
// Одна картка: та сама посада з тим самим описом у кількох частинах.
type Card = { title: string; description: string; unitKeys: string[]; rawUnits: string[] };

// Скільки карток видно одразу. Якщо їх більше, зʼявляється кнопка «Показати всі».
const MAX_VISIBLE_CARDS = 16;

// Варіант 2 показує по одній картці на рядок таблиці.
const SIMPLE_VISIBLE_CARDS = 8;

// Обидва варіанти беруть дані з одного запиту.
let loading: Promise<Vacancy[]> | undefined;
function getVacancies() {
  loading ??= loadVacancies();
  return loading;
}

const readUnits = (el: HTMLElement): UnitInfo[] => JSON.parse(el.querySelector('[data-units]')?.textContent ?? '[]');
// У таблиці частина може бути записана як «3066» або «3066 — 27 Печерська бригада».
const matchUnit = (units: UnitInfo[], raw: string) => units.find((u) => raw === u.id || raw.startsWith(`${u.id} `));

async function loadVacancies(): Promise<Vacancy[]> {
  if (import.meta.env.DEV || import.meta.env.PUBLIC_DEMO === 'true') {
    // Локально й на демо-сайті PHP немає: показуємо демо-дані. ?state=empty|error перевіряє інші стани.
    const state = new URLSearchParams(location.search).get('state');
    if (state === 'error') throw new Error('demo error');
    if (state === 'empty') return [];
    return (await import('../data/vacancies.sample.json')).default.vacancies;
  }
  const res = await fetch(withBase('/api/vacancies.php'), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.vacancies)) throw new Error('bad payload');
  return data.vacancies;
}

async function init(el: HTMLElement) {
  const units = readUnits(el);
  const list = el.querySelector<HTMLElement>('[data-list]')!;
  const more = el.querySelector<HTMLButtonElement>('[data-more]')!;
  const chips = [...el.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const lockUnit = el.dataset.lockUnit ?? '';

  const findUnit = (raw: string) => matchUnit(units, raw);
  const unitKey = (raw: string) => findUnit(raw)?.id ?? raw;

  let everything: Vacancy[];
  try {
    everything = await getVacancies();
  } catch {
    list.setAttribute('aria-busy', 'false');
    list.replaceChildren(stateMessage('Не вдалося завантажити вакансії. Спробуйте пізніше або одразу заповніть анкету.'));
    return;
  }

  const allCards = groupIntoCards(everything, unitKey);
  const unitCounts = new Map<string, number>();
  for (const card of allCards) {
    for (const key of card.unitKeys) unitCounts.set(key, (unitCounts.get(key) ?? 0) + 1);
  }

  for (const chip of chips) {
    const id = chip.dataset.filter ?? '';
    const n = id ? unitCounts.get(id) ?? 0 : allCards.length;
    const counter = chip.querySelector('[data-count]');
    if (counter) counter.textContent = n ? String(n) : '';
    if (id) {
      chip.classList.toggle('has-open', n > 0);
      const base = units.find((u) => u.id === id)?.title ?? '';
      chip.setAttribute('aria-label', `${base}: вакансій ${n}`);
    }
  }
  // Лічильники поза блоком: герой, меню та плитки частин
  document.querySelectorAll<HTMLElement>('[data-vacancy-count]').forEach((c) => {
    c.textContent = String(allCards.length);
    c.hidden = allCards.length === 0;
  });
  document.querySelectorAll<HTMLElement>('[data-unit-count]').forEach((c) => {
    const n = unitCounts.get(c.dataset.unitCount ?? '') ?? 0;
    const value = c.querySelector('[data-n]');
    if (value) value.textContent = String(n);
    c.hidden = n === 0;
  });

  let filter = lockUnit;
  let expanded = false;

  const render = () => {
    const matching = filter ? allCards.filter((c) => c.unitKeys.includes(filter)) : allCards;
    const visible = expanded ? matching : matching.slice(0, MAX_VISIBLE_CARDS);
    list.setAttribute('aria-busy', 'false');
    list.replaceChildren(
      ...(visible.length
        ? visible.map(renderCard)
        : [stateMessage('Зараз відкритих вакансій тут немає. Ви все одно можете заповнити анкету.')]),
    );
    more.hidden = visible.length >= matching.length;
    more.textContent = `Показати всі (${matching.length})`;
  };

  function renderCard(card: Card, index: number) {
    const node = document.createElement('article');
    node.className = 'vcard';
    node.style.setProperty('--i', String(index % 4)); // Черга появи в межах ряду

    const title = document.createElement('h3');
    title.className = 'vcard__title';
    title.textContent = card.title;
    node.append(title);

    const names = card.rawUnits.map((raw) => findUnit(raw)?.title ?? raw);
    if (!lockUnit) {
      const where = document.createElement('p');
      where.className = 'vcard__unit';
      if (names.length === 1) {
        where.textContent = names[0];
      } else {
        // Хто в кількох частинах, той показує кількість, а список читає скрінрідер.
        const count = document.createElement('span');
        count.setAttribute('aria-hidden', 'true');
        count.textContent = `Частин: ${names.length}`;
        const full = document.createElement('span');
        full.className = 'sr';
        full.textContent = names.join(', ');
        where.append(count, full);
      }
      node.append(where);
    }

    if (card.description) {
      const desc = document.createElement('p');
      desc.className = 'vcard__desc';
      desc.textContent = card.description;
      node.append(desc);
    }

    const foot = document.createElement('div');
    foot.className = 'vcard__foot';
    if (!lockUnit) {
      const row = document.createElement('div');
      row.className = 'vcard__emblems';
      row.setAttribute('aria-hidden', 'true');
      for (const unit of units) {
        const emblem = emblemNode(unit);
        if (card.unitKeys.includes(unit.id)) emblem.classList.add('is-on');
        row.append(emblem);
      }
      foot.append(row);
    }

    // Якщо частина однозначна, анкета одразу її підставить; інакше лишається «Будь-яка».
    const onlyUnit = filter && card.unitKeys.includes(filter) ? filter : card.unitKeys.length === 1 ? card.unitKeys[0] : '';
    const applyUnit = units.some((u) => u.id === onlyUnit) ? onlyUnit : '';
    const params = new URLSearchParams({ vacancy: card.title });
    if (applyUnit) params.set('unit', applyUnit);
    const apply = document.createElement('a');
    apply.className = 'btn btn--sm vcard__apply';
    apply.href = withBase(`/?${params}#anketa`);
    apply.textContent = 'Відгукнутися';
    apply.setAttribute('aria-label', `Відгукнутися: ${card.title}`);
    apply.dataset.apply = '';
    apply.dataset.vacancy = card.title;
    apply.dataset.unit = applyUnit;
    foot.append(apply);
    node.append(foot);

    // Картка також підсвічує відповідні емблеми у фільтрі над списком
    const related = chips.filter((c) => card.unitKeys.includes(c.dataset.filter ?? ''));
    if (related.length) {
      const lit = (on: boolean) => () => related.forEach((c) => c.classList.toggle('is-lit', on));
      node.addEventListener('mouseenter', lit(true));
      node.addEventListener('mouseleave', lit(false));
      node.addEventListener('focusin', lit(true));
      node.addEventListener('focusout', lit(false));
    }
    return node;
  }

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      for (const c of chips) {
        c.setAttribute('aria-pressed', String(c === chip));
        c.classList.remove('is-lit');
      }
      filter = chip.dataset.filter ?? '';
      expanded = false;
      render();
    });
  }
  more.addEventListener('click', () => {
    expanded = true;
    render();
    // Кнопка зникла, тож переводимо фокус на першу нову картку.
    list.querySelectorAll<HTMLElement>('.vcard__apply')[MAX_VISIBLE_CARDS]?.focus({ preventScroll: true });
  });
  render();
}

async function initSimple(el: HTMLElement) {
  const units = readUnits(el);
  const list = el.querySelector<HTMLElement>('[data-list]')!;
  const more = el.querySelector<HTMLButtonElement>('[data-more]')!;

  let rows: Vacancy[];
  try {
    rows = await getVacancies();
  } catch {
    list.setAttribute('aria-busy', 'false');
    list.replaceChildren(stateMessage('Не вдалося завантажити вакансії. Спробуйте пізніше або одразу заповніть анкету.'));
    return;
  }

  let expanded = false;
  const render = () => {
    const visible = expanded ? rows : rows.slice(0, SIMPLE_VISIBLE_CARDS);
    list.setAttribute('aria-busy', 'false');
    list.replaceChildren(
      ...(visible.length
        ? visible.map((v, index) => renderSimpleCard(v, index, units))
        : [stateMessage('Зараз відкритих вакансій немає. Ви все одно можете заповнити анкету.')]),
    );
    more.hidden = visible.length >= rows.length;
    more.textContent = `Показати всі (${rows.length})`;
  };
  more.addEventListener('click', () => {
    expanded = true;
    render();
    list.querySelectorAll<HTMLElement>('.vcard__apply')[SIMPLE_VISIBLE_CARDS]?.focus({ preventScroll: true });
  });
  render();
}

function renderSimpleCard(v: Vacancy, index: number, units: UnitInfo[]) {
  const unit = matchUnit(units, v.unit);
  const node = document.createElement('article');
  node.className = 'vcard vcard--unit';
  node.style.setProperty('--i', String(index % 4));

  if (unit) {
    const emblem = emblemNode(unit);
    emblem.setAttribute('aria-hidden', 'true');
    node.append(emblem);
  }

  const title = document.createElement('h3');
  title.className = 'vcard__title';
  title.textContent = v.title;
  node.append(title);

  const where = document.createElement('p');
  where.className = 'vcard__unit';
  where.textContent = unit?.title ?? v.unit;
  node.append(where);

  if (v.description) {
    const desc = document.createElement('p');
    desc.className = 'vcard__desc';
    desc.textContent = v.description;
    node.append(desc);
  }

  const params = new URLSearchParams({ vacancy: v.title });
  if (unit) params.set('unit', unit.id);
  const apply = document.createElement('a');
  apply.className = 'btn btn--sm vcard__apply';
  apply.href = withBase(`/?${params}#anketa`);
  apply.textContent = 'Відгукнутися';
  apply.setAttribute('aria-label', `Відгукнутися: ${v.title}, ${unit?.title ?? v.unit}`);
  apply.dataset.apply = '';
  apply.dataset.vacancy = v.title;
  apply.dataset.unit = unit?.id ?? '';
  const foot = document.createElement('div');
  foot.className = 'vcard__foot';
  foot.append(apply);
  node.append(foot);
  return node;
}

function emblemNode(unit: UnitInfo) {
  if (unit.emblem) {
    const img = document.createElement('img');
    img.className = 'emblem-img';
    img.src = unit.emblem;
    img.alt = '';
    img.title = unit.title;
    return img;
  }
  const emblem = document.createElement('span');
  emblem.className = 'emblem';
  emblem.title = unit.title;
  const inner = document.createElement('span');
  inner.textContent = unit.mark;
  emblem.append(inner);
  return emblem;
}

function groupIntoCards(vacancies: Vacancy[], unitKey: (raw: string) => string): Card[] {
  const cards = new Map<string, Card>();
  for (const v of vacancies) {
    const description = v.description ?? '';
    const id = `${v.title.trim().toLowerCase()}\n${description.trim().toLowerCase()}`;
    let card = cards.get(id);
    if (!card) {
      card = { title: v.title, description, unitKeys: [], rawUnits: [] };
      cards.set(id, card);
    }
    const key = unitKey(v.unit);
    if (!card.unitKeys.includes(key)) {
      card.unitKeys.push(key);
      card.rawUnits.push(v.unit);
    }
  }
  return [...cards.values()];
}

function stateMessage(text: string) {
  const p = document.createElement('p');
  p.className = 'vac__state';
  p.textContent = text;
  return p;
}

// Запуск наприкінці файла: функції вище використовують оголошені в модулі константи.
const root = document.querySelector<HTMLElement>('[data-vacancies]');
if (root) init(root);
const simpleRoot = document.querySelector<HTMLElement>('[data-vacancies-simple]');
if (simpleRoot) initSimple(simpleRoot);
