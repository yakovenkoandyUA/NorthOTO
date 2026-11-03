document.documentElement.classList.add('js');

const topbar = document.querySelector('.topbar');
const onScroll = () => topbar?.classList.toggle('is-stuck', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Поточний розділ позначається в меню
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav]')];
const sections = navLinks
  .map((a) => document.getElementById(a.dataset.nav ?? ''))
  .filter((s): s is HTMLElement => Boolean(s));
if (sections.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const a of navLinks) {
          if (a.dataset.nav === entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => spy.observe(s));
}

// Меню на весь екран. <dialog> сам дає пастку фокусу й повертає фокус на кнопку.
const menu = document.querySelector<HTMLDialogElement>('[data-menu]');
if (menu) {
  const root = document.documentElement;

  const closeMenu = async () => {
    if (!menu.open || menu.classList.contains('is-closing')) return;
    root.classList.remove('menu-open'); // Одразу, щоб перехід за якорем міг прокрутити сторінку.
    menu.classList.add('is-closing');
    await Promise.allSettled(menu.getAnimations().map((a) => a.finished));
    menu.classList.remove('is-closing');
    menu.close();
  };

  document.querySelector('[data-menu-open]')?.addEventListener('click', () => {
    root.classList.add('menu-open');
    menu.showModal();
  });
  menu.querySelector('[data-menu-close]')?.addEventListener('click', closeMenu);
  menu.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeMenu();
  });
  // Друге натискання Esc браузер може закрити без анімації, тож прибираємо стан і тут.
  menu.addEventListener('close', () => {
    root.classList.remove('menu-open');
    menu.classList.remove('is-closing');
  });
  menu.querySelectorAll('[data-menu-link]').forEach((link) => link.addEventListener('click', closeMenu));
}

// Плавна поява заголовків і блоків під першим екраном
const revealTargets = document.querySelectorAll<HTMLElement>('.section__head, .apply__head, .form, .units, .programs');
const reveal = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      reveal.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px' },
);
revealTargets.forEach((el) => {
  el.classList.add('reveal');
  reveal.observe(el);
});
