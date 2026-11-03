<?php
declare(strict_types=1);

require __DIR__ . '/lib.php';

send_security_headers();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    json_response(405, ['message' => 'Method not allowed']);
    exit;
}

$config = load_config();
$url = $config['sheet_csv_url'] ?? '';
$dir = $config ? storage_dir($config) : null;
if (!$config || !$dir || !is_string($url) || strpos($url, 'https://docs.google.com/') !== 0) {
    error_log('vacancies: bad config or storage');
    json_response(503, ['message' => 'Unavailable']);
    exit;
}

$cacheFile = $dir . '/vacancies.json';
$ttl = (int) ($config['cache_seconds'] ?? 300);
header('Cache-Control: public, max-age=60');

$cacheAge = is_file($cacheFile) ? time() - (int) filemtime($cacheFile) : null;
if ($cacheAge !== null && $cacheAge < $ttl) {
    header('Content-Type: application/json; charset=utf-8');
    readfile($cacheFile);
    exit;
}

$vacancies = null;
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_CONNECTTIMEOUT => 4,
    CURLOPT_TIMEOUT => 8,
]);
$body = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
if (is_string($body) && $status === 200 && strlen($body) < 2_000_000 && stripos($type, 'text/csv') !== false) {
    $vacancies = parse_vacancies($body);
}

if ($vacancies === null) {
    // Таблиця недоступна або зламана: лишаємо останній робочий список.
    error_log('vacancies: refresh failed, HTTP ' . $status);
    if ($cacheAge !== null) {
        @touch($cacheFile, time() - max(0, $ttl - 60)); // Наступна спроба за хвилину.
        header('Content-Type: application/json; charset=utf-8');
        readfile($cacheFile);
        exit;
    }
    json_response(503, ['message' => 'Unavailable']);
    exit;
}

$json = (string) json_encode(['updatedAt' => time(), 'vacancies' => $vacancies], JSON_UNESCAPED_UNICODE);
write_atomic($cacheFile, $json);
header('Content-Type: application/json; charset=utf-8');
echo $json;
