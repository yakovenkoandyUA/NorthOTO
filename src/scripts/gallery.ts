// Перегляд фото частини на весь екран. <dialog> сам тримає фокус і закривається по Esc.
const grid = document.querySelector<HTMLElement>('[data-gallery]');
const box = document.querySelector<HTMLDialogElement>('[data-lightbox]');

if (grid && box) {
  const items = [...grid.querySelectorAll<HTMLButtonElement>('[data-full]')];
  const img = box.querySelector<HTMLImageElement>('.lightbox__img')!;
  const count = box.querySelector<HTMLElement>('.lightbox__count')!;
  let index = 0;

  const show = (i: number) => {
    index = (i + items.length) % items.length;
    img.src = items[index].dataset.full ?? '';
    count.textContent = `${index + 1} / ${items.length}`;
  };
  const open = (i: number) => {
    show(i);
    document.documentElement.classList.add('menu-open'); // Та сама блокада прокручування, що й у меню.
    box.showModal();
  };

  items.forEach((item, i) => item.addEventListener('click', () => open(i)));
  box.querySelector('[data-lb="close"]')?.addEventListener('click', () => box.close());
  box.querySelector('[data-lb="prev"]')?.addEventListener('click', () => show(index - 1));
  box.querySelector('[data-lb="next"]')?.addEventListener('click', () => show(index + 1));
  // Натискання на темний фон поза фото закриває перегляд.
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('close', () => document.documentElement.classList.remove('menu-open'));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
}
