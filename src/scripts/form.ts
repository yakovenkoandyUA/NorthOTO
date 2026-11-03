import { enhanceSelect } from './select';

const form = document.querySelector<HTMLFormElement>('[data-form]');
if (form) init(form);

function init(f: HTMLFormElement) {
  const status = f.querySelector<HTMLElement>('[data-status]')!;
  const submit = f.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const unit = f.elements.namedItem('unit') as HTMLSelectElement;
  const vacancy = f.elements.namedItem('vacancy') as HTMLInputElement;
  const name = f.elements.namedItem('name') as HTMLInputElement;
  enhanceSelect(unit);

  const setStatus = (text: string, kind: '' | 'ok' | 'error' = '') => {
    status.textContent = text;
    status.className = `form__status${kind ? ` is-${kind}` : ''}`;
  };
  const prefill = (u?: string | null, v?: string | null) => {
    // Порожнє значення теж застосовується: воно скидає частину, обрану попереднім відгуком.
    if (u != null && [...unit.options].some((o) => o.value === u)) {
      unit.value = u;
      unit.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (v) vacancy.value = v.slice(0, 160);
  };

  // Значення з посилання «Відгукнутися» та результат надсилання без JS
  const params = new URLSearchParams(location.search);
  prefill(params.get('unit'), params.get('vacancy'));
  if (params.get('form') === 'sent') setStatus('Анкету надіслано. Дякуємо!', 'ok');
  if (params.get('form') === 'error') setStatus('Не вдалося надіслати анкету. Перевірте поля та спробуйте ще раз.', 'error');

  // «Відгукнутися» на цій самій сторінці: без перезавантаження
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-apply]');
    if (!link) return;
    event.preventDefault();
    prefill(link.dataset.unit, link.dataset.vacancy);
    f.scrollIntoView({ block: 'start' });
    name.focus({ preventScroll: true });
  });

  const showErrors = (errors: Record<string, string>) => {
    let first: HTMLElement | null = null;
    f.querySelectorAll<HTMLElement>('[data-error]').forEach((slot) => {
      const key = slot.dataset.error!;
      const input = f.elements.namedItem(key) as HTMLInputElement;
      const message = errors[key];
      slot.textContent = message ?? '';
      slot.hidden = !message;
      if (message) {
        slot.id = `err-${key}`;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', slot.id);
        first ??= input;
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    });
    (first as HTMLElement | null)?.focus();
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (name.value.trim().length < 2) errors.name = "Вкажіть ім'я та прізвище.";
    const phone = (f.elements.namedItem('phone') as HTMLInputElement).value.replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,15}$/.test(phone)) errors.phone = 'Вкажіть телефон у форматі +380XXXXXXXXX.';
    if (!(f.elements.namedItem('consent') as HTMLInputElement).checked) errors.consent = 'Без згоди ми не можемо прийняти анкету.';
    return errors;
  };

  f.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');
    const errors = validate();
    showErrors(errors);
    if (Object.keys(errors).length) return;

    submit.disabled = true;
    setStatus('Надсилаємо…');
    try {
      if (import.meta.env.DEV || import.meta.env.PUBLIC_DEMO === 'true') {
        // Локально й на демо-сайті PHP немає: імітуємо успішне надсилання.
        await new Promise((r) => setTimeout(r, 400));
        f.reset();
        setStatus('Демо-версія: анкету нікуди не надіслано. На робочому сайті тут піде лист.', 'ok');
        return;
      }
      const res = await fetch(f.action, {
        method: 'POST',
        body: new FormData(f),
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        f.reset();
        setStatus('Анкету надіслано. Дякуємо!', 'ok');
      } else if (data?.errors) {
        showErrors(data.errors);
        setStatus('Перевірте виділені поля.', 'error');
      } else {
        setStatus(data?.message ?? 'Не вдалося надіслати анкету. Спробуйте пізніше.', 'error');
      }
    } catch {
      setStatus('Немає зв\'язку із сервером. Спробуйте пізніше.', 'error');
    } finally {
      submit.disabled = false;
    }
  });
}
