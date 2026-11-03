<?php
// Скопіюйте у config.php на сервері та заповніть. config.php не потрапляє в git.
return [
    // Google Таблиця: Файл → Поділитися → Опублікувати в інтернеті → вкладка → CSV.
    'sheet_csv_url' => 'https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv',
    'cache_seconds' => 300,

    // Бажано вказати теку поза public_html, наприклад '/home/USER/oto-storage'.
    // 'storage_dir' => '/home/USER/oto-storage',

    // Довільний довгий випадковий рядок.
    'rate_limit_secret' => 'ЗАМІНІТЬ-НА-ВИПАДКОВИЙ-РЯДОК',
    'rate_limit_max' => 5,
    'rate_limit_window' => 3600,

    'mail' => [
        'host' => 'SMTP-СЕРВЕР-ХОСТИНГУ',
        'port' => 465,
        'secure' => 'ssl', // 'ssl' для порту 465, 'tls' для порту 587
        'username' => 'site@ВАШ-ДОМЕН',
        'password' => 'ПАРОЛЬ-СКРИНЬКИ',
        'from' => 'site@ВАШ-ДОМЕН',
        'from_name' => 'Анкета із сайту',
        'to' => ['АДРЕСА-ОТРИМУВАЧА'],
    ],
];
