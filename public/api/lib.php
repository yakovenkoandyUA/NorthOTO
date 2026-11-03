<?php
declare(strict_types=1);

// Спільні функції для vacancies.php і contact.php. Сам файл нічого не виводить.

function load_config(): ?array
{
    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        return null;
    }
    $config = require $path;
    return is_array($config) ? $config : null;
}

function storage_dir(array $config): ?string
{
    $dir = $config['storage_dir'] ?? (__DIR__ . '/.storage');
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return null;
    }
    return $dir;
}

function send_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

function json_response(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
}

function write_atomic(string $path, string $data): bool
{
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, $data, LOCK_EX) === false) {
        return false;
    }
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

/**
 * Перетворює CSV опублікованої Google Таблиці на список вакансій.
 * Колонки шукаються за назвою, тому їхній порядок у таблиці не важливий.
 * Обов'язкові: Опубліковано, Частина, Посада. Необов'язкова: Опис.
 * Повертає null, якщо обов'язкових колонок немає (таблицю зламали):
 * тоді сайт лишає попередній робочий список, а не показує порожній.
 */
function parse_vacancies(string $csv, int $maxRows = 200): ?array
{
    $csv = preg_replace('/^\xEF\xBB\xBF/', '', $csv) ?? $csv;
    $handle = fopen('php://memory', 'r+');
    if ($handle === false) {
        return null;
    }
    fwrite($handle, $csv);
    rewind($handle);

    $header = fgetcsv($handle, 0, ',', '"', '');
    if (!is_array($header)) {
        fclose($handle);
        return null;
    }
    $columns = [];
    foreach ($header as $index => $name) {
        $columns[mb_strtolower(trim((string) $name), 'UTF-8')] = $index;
    }
    foreach (['опубліковано', 'частина', 'посада'] as $required) {
        if (!isset($columns[$required])) {
            fclose($handle);
            return null;
        }
    }

    $published = ['TRUE', 'ТАК', 'ІСТИНА', 'ПРАВДА', 'YES', '1', '+'];
    $cell = static function (array $row, string $column) use ($columns): string {
        if (!isset($columns[$column], $row[$columns[$column]])) {
            return '';
        }
        return trim((string) $row[$columns[$column]]);
    };

    $vacancies = [];
    while (($row = fgetcsv($handle, 0, ',', '"', '')) !== false && count($vacancies) < $maxRows) {
        if (!in_array(mb_strtoupper($cell($row, 'опубліковано'), 'UTF-8'), $published, true)) {
            continue;
        }
        $title = mb_substr($cell($row, 'посада'), 0, 160, 'UTF-8');
        if ($title === '') {
            continue;
        }
        $unit = mb_substr($cell($row, 'частина'), 0, 120, 'UTF-8');
        $vacancies[] = [
            'id' => substr(md5($unit . '|' . $title . '|' . count($vacancies)), 0, 10),
            'unit' => $unit,
            'title' => $title,
            'description' => mb_substr($cell($row, 'опис'), 0, 1500, 'UTF-8'),
        ];
    }
    fclose($handle);
    return $vacancies;
}

/** Прибирає керівні символи й зайві пробіли. Важливо для темі листа. */
function clean_line(string $value, int $max): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    return mb_substr(trim(preg_replace('/\s+/u', ' ', $value) ?? ''), 0, $max, 'UTF-8');
}

function clean_text(string $value, int $max): string
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = preg_replace('/[\x00-\x09\x0B-\x1F\x7F]+/u', ' ', $value) ?? '';
    return mb_substr(trim($value), 0, $max, 'UTF-8');
}

/** @return array{0: array<string,string>, 1: array<string,string>} [дані, помилки] */
function validate_application(array $post): array
{
    $text = static fn(string $key): string => is_string($post[$key] ?? null) ? $post[$key] : '';

    $data = [
        'name' => clean_line($text('name'), 100),
        'phone' => clean_line($text('phone'), 24),
        'unit' => clean_line($text('unit'), 120),
        'vacancy' => clean_line($text('vacancy'), 160),
        'comment' => clean_text($text('comment'), 1500),
    ];

    $errors = [];
    if (mb_strlen($data['name'], 'UTF-8') < 2) {
        $errors['name'] = "Вкажіть ім'я та прізвище.";
    }
    $phone = preg_replace('/[\s()\-]/', '', $data['phone']) ?? '';
    if (preg_match('/^\+?\d{10,15}$/', $phone) !== 1) {
        $errors['phone'] = 'Вкажіть телефон у форматі +380XXXXXXXXX.';
    }
    if (($post['consent'] ?? '') !== '1') {
        $errors['consent'] = 'Без згоди ми не можемо прийняти анкету.';
    }
    return [$data, $errors];
}

/**
 * Обмежує кількість анкет з однієї адреси. IP не зберігається у відкритому
 * вигляді: файл названо за HMAC, а в ньому лише час спроб.
 */
function rate_limit_allows(string $dir, string $ip, string $secret, int $limit, int $window, ?int $now = null): bool
{
    $now ??= time();
    $path = $dir . '/rl_' . hash_hmac('sha256', $ip, $secret) . '.json';
    $handle = @fopen($path, 'c+');
    if ($handle === false) {
        return true; // Збій лічильника не має блокувати кандидатів.
    }
    flock($handle, LOCK_EX);
    $hits = json_decode((string) stream_get_contents($handle), true);
    $hits = array_values(array_filter(is_array($hits) ? $hits : [], static fn($t) => is_int($t) && $t > $now - $window));
    $allowed = count($hits) < $limit;
    if ($allowed) {
        $hits[] = $now;
    }
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, (string) json_encode($hits));
    flock($handle, LOCK_UN);
    fclose($handle);

    // Зрідка прибираємо старі лічильники, щоб тека не росла.
    if (random_int(1, 50) === 1) {
        foreach (glob($dir . '/rl_*.json') ?: [] as $file) {
            if (filemtime($file) < $now - $window) {
                @unlink($file);
            }
        }
    }
    return $allowed;
}
