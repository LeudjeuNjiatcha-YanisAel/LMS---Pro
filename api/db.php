<?php
// db.php : Gère la connexion à la base de données MySQL avec PDO
$host = '127.0.0.1'; // L'hôte de la base de données (généralement localhost)
$db   = 'lms_db';    // Le nom de la base de données
$user = 'root';      // Nom d'utilisateur de la base de données
$pass = '';          // Mot de passe (vide par défaut sous XAMPP)
$charset = 'utf8mb4'; // Encodage des caractères pour supporter tous les symboles

// Configuration du Data Source Name (DSN)
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

// Options de PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Lance des exceptions en cas d'erreur
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Retourne les résultats sous forme de tableau associatif
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Désactive l'émulation des requêtes préparées pour plus de sécurité
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
