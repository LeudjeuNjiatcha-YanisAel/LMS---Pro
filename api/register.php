<?php
// api/register.php : Script PHP pour inscrire un nouvel étudiant dans la BDD

require 'db.php'; // On se connecte à la base de données
header('Content-Type: application/json'); // On définit que la réponse est du JSON

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Récupération et nettoyage des données soumises
    $first_name = trim($_POST['first_name'] ?? '');
    $last_name = trim($_POST['last_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $requested_role = $_POST['role'] ?? 'student'; // 'student' par défaut
    
    $filiere = trim($_POST['filiere'] ?? '');
    $matricule = trim($_POST['matricule'] ?? '');
    $numero_unique = trim($_POST['numero_unique'] ?? '');

    // Sécurité: on s'assure qu'on ne peut s'inscrire que comme student ou teacher (pas admin)
    if (!in_array($requested_role, ['student', 'teacher'])) {
        $requested_role = 'student';
    }

    // 2. Vérification que rien n'est vide
    if (empty($first_name) || empty($last_name) || empty($email) || empty($password)) {
        echo json_encode(["status" => "error", "message" => "Tous les champs de base sont requis."]);
        exit;
    }
    
    // // Vérification de l'adresse email (@fac... .com ou .cm)
    // if (!preg_match('/@fac.*?\.(com|cm)$/i', $email)) {
    //     echo json_encode([
    //         "status" => "error", 
    //         "message" => "L'email doit appartenir au domaine de la faculté (ex: @facsciences.com ou @faculte.cm)."
    //     ]);
    //     exit;
    // }
    // preg_match compare une chaine de caracteres
    //.*? n'importe quel caractere
    // \.(com|cm)$() signifie que l'email doit ce terminer par .com ou .cm
    // i ignore la casse
    
   
    // Vérification des champs spécifiques
    if ($requested_role === 'student' && (empty($matricule) || empty($filiere))) {
        echo json_encode(["status" => "error", "message" => "Le matricule et la filière sont requis pour un étudiant."]);
        exit;
    }
    if ($requested_role === 'teacher' && empty($numero_unique)) {
        echo json_encode(["status" => "error", "message" => "Le numéro unique est requis pour un enseignant."]);
        exit;
    }

    // 3. On va chercher l'ID du rôle demandé dans la table des rôles
    $stmtRole = $pdo->prepare("SELECT id FROM roles WHERE name = :role_name");
    $stmtRole->execute(['role_name' => $requested_role]);
    $role = $stmtRole->fetch();

    if (!$role) {
        // Sécurité au cas où la table des rôles est vide
        echo json_encode(["status" => "error", "message" => "Erreur interne: rôle introuvable."]);
        exit;
    }

    $role_id = $role['id'];

    // 4. Hachage sécurisé du mot de passe
    // On utilise l'algorithme par défaut de PHP (actuellement BCRYPT)
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // 5. Insertion dans la base de données
    try {
        $stmt = $pdo->prepare("
            INSERT INTO users (role_id, first_name, last_name, email, password_hash, filiere, matricule, numero_unique)
            VALUES (:role_id, :first_name, :last_name, :email, :password_hash, :filiere, :matricule, :numero_unique)
        ");
        
        $stmt->execute([
            'role_id' => $role_id,
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email' => $email,
            'password_hash' => $password_hash,
            'filiere' => $requested_role === 'student' ? $filiere : null,
            'matricule' => $requested_role === 'student' ? $matricule : null,
            'numero_unique' => $requested_role === 'teacher' ? $numero_unique : null
        ]);

        // Si succès :
        echo json_encode(["status" => "success", "message" => "Compte créé ! Vous pouvez vous connecter."]);
    } catch (\PDOException $e) {
        // L'erreur SQL la plus fréquente ici sera le code 23000 (Duplicate entry) car l'email est UNIQUE
        if ($e->getCode() == 23000) {
            echo json_encode(["status" => "error", "message" => "Cet email est déjà utilisé."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
} else {
    // Si la méthode n'est pas POST
    echo json_encode(["status" => "error", "message" => "Requête invalide."]);
}
?>
