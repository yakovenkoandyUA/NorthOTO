import type { SocialNetwork } from './social-icons';

// Увесь редагований контент сайту (крім вакансій, які живуть у Google Таблиці).
// Порожнє поле `about` або відсутнє `image` показують на сайті помітну заглушку.

export const org = {
  name: 'Північне Київське територіальне управління',
  parent: 'Національна гвардія України',
  mark: 'ПН',
};

// Контакти для футера. Порядок іконок задано в social-icons.ts.
// Порожнє значення показує «Адреса уточнюється» або іконку без посилання.
// Якщо мережі немає, приберіть її ключ, і іконка зникне.
export type Contacts = { email: string; socials: Partial<Record<SocialNetwork, string>> };

// ЧЕРНЕТКА: контакти управління. Їх показують головна й інші спільні сторінки.
export const contacts: Contacts = {
  email: '',
  socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' },
};

export const hero = {
  // ЧЕРНЕТКА: слоган надасть частина.
  lineOne: 'Північ',
  lineTwo: 'тримає стрій',
  lead: 'Частини та підрозділи, відкриті вакансії й анкета для кандидатів в одному місці.',
  // Шлях до фото у public/, наприклад '/img/hero.jpg'.
  image: '/img/topo.svg',
};

export type Unit = {
  id: string; // номер в/ч; за ним рядок у таблиці вакансій прив'язується до частини
  slug: string;
  mark: string; // велике число на плитці
  title: string; // повна назва
  caption: string; // підпис під числом
  placeholder?: boolean;
  emblem?: string; // шлях до емблеми у public/
  image?: string; // шлях до фото у public/
  tilePhoto?: string; // фото на плитці при наведенні, шлях у public/
  about?: string[]; // абзаци опису від частини
  contacts?: Contacts; // контакти у футері сторінки частини; без них показуються контакти управління
};

// ЧЕРНЕТКА: контакти надасть частина, а placeholder-*.webp це згенеровані заглушки замість фото.
export const units: Unit[] = [
  { id: '3030', slug: '3030', mark: '25', title: '25 бригада охорони громадського порядку імені князя Аскольда', caption: 'Бригада охорони громадського порядку імені князя Аскольда',
    tilePhoto: '/img/units/placeholder-1.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
  { id: '3041', slug: '3041', mark: '28', title: '28 Чорнобильський полк', caption: 'Чорнобильський полк',
    tilePhoto: '/img/units/placeholder-2.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
  { id: '3047', slug: '3047', mark: '38', title: '38 Поліський полк', caption: 'Поліський полк',
    tilePhoto: '/img/units/placeholder-3.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
  { id: '3061', slug: '3061', mark: '31', title: '31 полк', caption: 'Полк',
    tilePhoto: '/img/units/placeholder-4.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
  { id: '3066', slug: '3066', mark: '27', title: '27 Печерська бригада', caption: 'Печерська бригада',
    tilePhoto: '/img/units/placeholder-5.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
  { id: '3082', slug: '3082', mark: '10', title: '10 бригада імені князя Святослава Ярославича', caption: 'Бригада імені князя Святослава Ярославича',
    tilePhoto: '/img/units/placeholder-6.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
  { id: '3114', slug: '3114', mark: '19', title: '19 бригада', caption: 'Бригада',
    tilePhoto: '/img/units/placeholder-7.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
  // ЧЕРНЕТКА: назви двох підрозділів ще не надані.
  { id: 'pd-1', slug: 'pidrozdil-1', mark: 'ПД', title: 'Підрозділ 1', caption: 'Назва уточнюється', placeholder: true,
    tilePhoto: '/img/units/placeholder-8.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
  { id: 'pd-2', slug: 'pidrozdil-2', mark: 'ПД', title: 'Підрозділ 2', caption: 'Назва уточнюється', placeholder: true,
    tilePhoto: '/img/units/placeholder-9.webp',
    contacts: { email: '', socials: { facebook: '', instagram: '', youtube: '', telegram: '', x: '' } } },
];

// 1–3 картки. Якщо задано `image`, картка показує банер цілком.
export const programs: { title: string; note: string; href: string; image?: string }[] = [
  { title: 'Контракт 18–24', note: 'Для молоді віком від 18 до 24 років', href: '#anketa' },
  { title: 'Переведення з ЗСУ в НГУ', note: 'Зміна місця служби через Армія+', href: '#anketa' },
  { title: 'Повернення з СЗЧ', note: 'Поновлення на службі', href: '#anketa' },
];
