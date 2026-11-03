// Додає підкаталог сайту до шляху. На хостингу він порожній,
// а на GitHub Pages сайт лежить у /назва-репозиторію/.
export const withBase = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
