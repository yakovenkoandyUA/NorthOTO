<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/lib.php';
require __DIR__ . '/vendor/phpmailer/Exception.php';
require __DIR__ . '/vendor/phpmailer/PHPMailer.php';
require __DIR__ . '/vendor/phpmailer/SMTP.php';

send_security_headers();
header('Cache-Control: no-store');

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

/** Відповідь для fetch або, якщо JavaScript вимкнено, перенаправлення на форму. */
function finish(bool $wantsJson, int $status, array $payload): void
{
    if ($wantsJson) {
        json_response($status, $payload);
        return;
    }
    header('Location: /?form=' . (!empty($payload['ok']) ? 'sent' : 'error') . '#anketa', true, 303);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    json_response(405, ['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

// Запити лише з цього ж сайту
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== strtok($_SERVER['HTTP_HOST'] ?? '', ':')) {
    finish($wantsJson, 403, ['ok' => false, 'message' => 'Запит відхилено.']);
    exit;
}

// Поле-пастка: бот отримує «успіх», а лист не надсилається
if (!empty($_POST['website'])) {
    finish($wantsJson, 200, ['ok' => true]);
    exit;
}

$config = load_config();
$dir = $config ? storage_dir($config) : null;
$mail = $config['mail'] ?? null;
$unavailable = ['ok' => false, 'message' => 'Форма тимчасово недоступна. Спробуйте пізніше.'];
if (!$config || !$dir || !is_array($mail) || empty($config['rate_limit_secret'])) {
    error_log('contact: bad config or storage');
    finish($wantsJson, 503, $unavailable);
    exit;
}

[$data, $errors] = validate_application($_POST);
if ($errors) {
    finish($wantsJson, 422, ['ok' => false, 'errors' => $errors]);
    exit;
}

$allowed = rate_limit_allows(
    $dir,
    (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
    (string) $config['rate_limit_secret'],
    (int) ($config['rate_limit_max'] ?? 5),
    (int) ($config['rate_limit_window'] ?? 3600)
);
if (!$allowed) {
    finish($wantsJson, 429, ['ok' => false, 'message' => 'Забагато спроб. Спробуйте за годину.']);
    exit;
}

$body = implode("\n", [
    "Ім'я: {$data['name']}",
    "Телефон: {$data['phone']}",
    'Частина: ' . ($data['unit'] !== '' ? $data['unit'] : 'будь-яка'),
    'Вакансія: ' . ($data['vacancy'] !== '' ? $data['vacancy'] : 'не вказано'),
    '',
    'Коментар:',
    $data['comment'] !== '' ? $data['comment'] : '—',
    '',
    'Згоду на обробку персональних даних надано: ' . date('Y-m-d H:i'),
]);

try {
    $mailer = new PHPMailer(true);
    $mailer->isSMTP();
    $mailer->Host = (string) $mail['host'];
    $mailer->Port = (int) ($mail['port'] ?? 465);
    $mailer->SMTPAuth = true;
    $mailer->Username = (string) $mail['username'];
    $mailer->Password = (string) $mail['password'];
    $mailer->SMTPSecure = ($mail['secure'] ?? 'ssl') === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
    $mailer->Timeout = 10;
    $mailer->CharSet = PHPMailer::CHARSET_UTF8;
    $mailer->setFrom((string) $mail['from'], (string) ($mail['from_name'] ?? 'Анкета із сайту'));
    foreach ((array) $mail['to'] as $recipient) {
        $mailer->addAddress((string) $recipient);
    }
    $mailer->Subject = 'Анкета: ' . ($data['vacancy'] !== '' ? $data['vacancy'] : 'без вакансії');
    $mailer->isHTML(false);
    $mailer->Body = $body;
    $mailer->send();
} catch (MailException $e) {
    // Без тексту помилки PHPMailer: він може містити адреси.
    error_log('contact: mail send failed');
    finish($wantsJson, 502, ['ok' => false, 'message' => 'Не вдалося надіслати анкету. Спробуйте пізніше.']);
    exit;
}

finish($wantsJson, 200, ['ok' => true]);
