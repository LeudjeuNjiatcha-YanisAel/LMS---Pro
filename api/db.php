<?php
// db.php : Gère la connexion à la base de données MySQL avec PDO
// Les variables d'environnement sont utilisées pour la sécurité en production

$host    = getenv('DB_HOST')    ?: '127.0.0.1'; // Hôte de la base de données
$db      = getenv('DB_NAME')    ?: 'lms_db';     // Nom de la base de données
$user    = getenv('DB_USER')    ?: 'root';        // Nom d'utilisateur
$pass    = getenv('DB_PASS')    ?: '';            // Mot de passe
$port    = getenv('DB_PORT')    ?: '3306';        // Port MySQL (3306 par défaut)
$charset = 'utf8mb4';                             // Encodage des caractères

// Configuration du Data Source Name (DSN)
$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

// Options de PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Lance des exceptions en cas d'erreur
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Retourne les résultats en tableau associatif
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Désactive l'émulation pour plus de sécurité
];

try {
    // Création de l'instance PDO (connexion à la BD)
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Si la connexion échoue, on arrête le script et on affiche une erreur JSON
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit;
}
?>
