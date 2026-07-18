<?php
// db.php : Connexion à la base de données PostgreSQL via PDO
// Les variables d'environnement sont injectées par Render automatiquement

$host    = getenv('DB_HOST')    ?: 'localhost';
$db      = getenv('DB_NAME')    ?: 'lms_db';
$user    = getenv('DB_USER')    ?: 'postgres';
$pass    = getenv('DB_PASS')    ?: '';
$port    = getenv('DB_PORT')    ?: '5432';

// DSN PostgreSQL
$dsn = "pgsql:host=$host;port=$port;dbname=$db";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit;
}
?>
