import { withBase } from '../utils/url';

type Vacancy = { id: string; unit: string; title: string; description: string };
type UnitInfo = { id: string; mark: string; title: string; emblem?: string };

// Скільки карток видно одразу. Якщо їх більше, зʼявляється кнопка «Показати всі».
const MAX_VISIBLE_CARDS = 8;

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

// У таблиці частина може бути записана як «3066» або «3066 — 27 Печерська бригада».
const matchUnit = (units: UnitInfo[], raw: string) => units.find((u) => raw === u.id || raw.startsWith(`${u.id} `));

function emblemNode(unit: UnitInfo) {
  if (unit.emblem) {
    const img = document.createElement('img');
    img.className = 'emblem-img';
    img.src = unit.emblem;
    img.alt = '';
    return img;
  }
  const emblem = document.createElement('span');
  emblem.className = 'emblem';
  const inner = document.createElement('span');
  inner.textContent = unit.mark;
  emblem.append(inner);
  return emblem;
}

function stateMessage(text: string) {
  const p = document.createElement('p');
  p.className = 'vac__state';
  p.textContent = text;
  return p;
}

function renderCard(v: Vacancy, index: number, units: UnitInfo[], lockUnit: string) {
  const unit = matchUnit(units, v.unit);
  const node = document.createElement('article');
  node.className = 'vcard vcard--unit';
  node.style.setProperty('--i', String(index % 4));

  // На сторінці частини емблема й назва частини зайві: вона й так відома.
  if (unit && !lockUnit) {
    const emblem = emblemNode(unit);
    emblem.setAttribute('aria-hidden', 'true');
    node.append(emblem);
  }

  const title = document.createElement('h3');
  title.className = 'vcard__title';
  title.textContent = v.title;
  node.append(title);

  if (!lockUnit) {
    const where = document.createElement('p');
    where.className = 'vcard__unit';
    where.textContent = unit?.title ?? v.unit;
    node.append(where);
  }

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
  apply.setAttribute('aria-label', `Відгукнутися: ${v.title}${lockUnit ? '' : `, ${unit?.title ?? v.unit}`}`);
  apply.dataset.apply = '';
  apply.dataset.vacancy = v.title;
  apply.dataset.unit = unit?.id ?? '';
  const foot = document.createElement('div');
  foot.className = 'vcard__foot';
  foot.append(apply);
  node.append(foot);
  return node;
}

async function init(el: HTMLElement) {
  const units: UnitInfo[] = JSON.parse(el.querySelector('[data-units]')?.textContent ?? '[]');
  const list = el.querySelector<HTMLElement>('[data-list]')!;
  const more = el.querySelector<HTMLButtonElement>('[data-more]')!;
  const lockUnit = el.dataset.lockUnit ?? '';

  let everything: Vacancy[];
  try {
    everything = await loadVacancies();
  } catch {
    list.setAttribute('aria-busy', 'false');
    list.replaceChildren(stateMessage('Не вдалося завантажити вакансії. Спробуйте пізніше або одразу заповніть анкету.'));
    return;
  }

  // Лічильники в героях, меню та на плитках частин рахують усі вакансії, навіть на сторінці частини.
  const counts = new Map<string, number>();
  for (const v of everything) {
    const key = matchUnit(units, v.unit)?.id ?? v.unit;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  document.querySelectorAll<HTMLElement>('[data-vacancy-count]').forEach((c) => {
    c.textContent = String(everything.length);
    c.hidden = everything.length === 0;
  });
  document.querySelectorAll<HTMLElement>('[data-unit-count]').forEach((c) => {
    const n = counts.get(c.dataset.unitCount ?? '') ?? 0;
    const value = c.querySelector('[data-n]');
    if (value) value.textContent = String(n);
    c.hidden = n === 0;
  });

  const rows = lockUnit ? everything.filter((v) => matchUnit(units, v.unit)?.id === lockUnit) : everything;
  let expanded = false;
  const render = () => {
    const visible = expanded ? rows : rows.slice(0, MAX_VISIBLE_CARDS);
    list.setAttribute('aria-busy', 'false');
    list.replaceChildren(
      ...(visible.length
        ? visible.map((v, index) => renderCard(v, index, units, lockUnit))
        : [stateMessage('Зараз відкритих вакансій немає. Ви все одно можете заповнити анкету.')]),
    );
    more.hidden = visible.length >= rows.length;
    more.textContent = `Показати всі (${rows.length})`;
  };
  more.addEventListener('click', () => {
    expanded = true;
    render();
    // Кнопка зникла, тож переводимо фокус на першу нову картку.
    list.querySelectorAll<HTMLElement>('.vcard__apply')[MAX_VISIBLE_CARDS]?.focus({ preventScroll: true });
  });
  render();
}

const root = document.querySelector<HTMLElement>('[data-vacancies]');
if (root) init(root);
