<?php
// auth.php : Gère l'authentification (connexion) des utilisateurs
session_start(); // Démarre une nouvelle session ou reprend une session existante
require 'db.php'; // Inclut le fichier de connexion à la base de données

// Indique que la réponse sera au format JSON
header('Content-Type: application/json');

// Vérifie si la requête est bien de type POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Récupère l'email et le mot de passe envoyés (et les nettoie un peu)
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    // Vérifie que les champs ne sont pas vides
    if (empty($email) || empty($password)) {
        echo json_encode(["status" => "error", "message" => "Veuillez remplir tous les champs."]);
        exit;
    }

    // Prépare une requête SQL pour trouver l'utilisateur par son email, matricule ou numero_unique
    try {
        $stmt = $pdo->prepare("
            SELECT u.id, u.password_hash, u.first_name, u.last_name, r.name as role 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.email = :id1 OR u.matricule = :id2 OR u.numero_unique = :id3
        ");
        $stmt->execute([
            'id1' => $email,
            'id2' => $email,
            'id3' => $email
        ]); // Exécute la requête avec l'identifiant fourni
        $user = $stmt->fetch(); // Récupère la première ligne de résultat
    } catch (\PDOException $e) {
        // En cas d'erreur (ex: colonne manquante car BDD non mise à jour), on renvoie l'erreur en clair
        echo json_encode(["status" => "error", "message" => "Erreur BDD : " . $e->getMessage()]);
        exit;
    }

    // Vérifie si l'utilisateur existe et si le mot de passe correspond au hash stocké
    if ($user && password_verify($password, $user['password_hash'])) {
        // Stocke les informations utiles dans la session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['name'] = $user['first_name'] . ' ' . $user['last_name'];

        // Renvoie une réponse de succès avec le rôle pour redirection côté client
        echo json_encode([
            "status" => "success", 
            "message" => "Connexion réussie.",
            "role" => $user['role'],
            "name" => $user['first_name'] . ' ' . $user['last_name']
        ]);
    } else {
        // Renvoie une erreur si les identifiants sont incorrects
        echo json_encode(["status" => "error", "message" => "Identifiants incorrects."]);
    }
} else {
    // Si la méthode n'est pas POST, on renvoie une erreur
    echo json_encode(["status" => "error", "message" => "Méthode non autorisée."]);
}
?>
