<?php
// api/admin.php : Gère les fonctionnalités d'administration globale (statistiques, utilisateurs, validation des modules)

session_start(); // On démarre la session PHP
require 'db.php'; // Inclusion de la configuration de la base de données
header('Content-Type: application/json'); // La réponse renvoyée sera interprétée comme du JSON

// Vérification stricte : Seul un utilisateur avec le rôle "admin" peut accéder à ce fichier
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(["status" => "error", "message" => "Accès refusé. Réservé à l'administrateur."]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'dashboard_stats') {
        // Stats : nbre d'etudiants, nbre profs, cours actifs, certificats (en attente)
        $stats = [];
        
        $stats['students'] = $pdo->query("SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name='student')")->fetchColumn();
        $stats['teachers'] = $pdo->query("SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name='teacher')")->fetchColumn();
        $stats['courses'] = $pdo->query("SELECT COUNT(*) FROM courses")->fetchColumn();
        
        try { $pdo->exec("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS status VARCHAR(10) DEFAULT 'pending'"); } catch(Exception $e){}
        
        $stats['certs_pending'] = $pdo->query("SELECT COUNT(*) FROM certificates WHERE status = 'pending'")->fetchColumn();
        $stats['certs_approved'] = $pdo->query("SELECT COUNT(*) FROM certificates WHERE status = 'approved'")->fetchColumn();

        // Récupérer les demandes en attente avec détails
        $stmtCerts = $pdo->query("
            SELECT cert.id, u.first_name, u.last_name, c.title as course_title, cert.issued_at
            FROM certificates cert
            JOIN users u ON cert.student_id = u.id
            JOIN courses c ON cert.course_id = c.id
            WHERE cert.status = 'pending'
            ORDER BY cert.issued_at DESC
        ");
        $pending_requests = $stmtCerts->fetchAll(PDO::FETCH_ASSOC);

        // Récupérer la progression globale des modules (cours) et nbre étudiants
        $stmtModules = $pdo->query("
            SELECT c.id, c.title, u.first_name, u.last_name, 
                   COUNT(e.student_id) as student_count, 
                   COALESCE(AVG(e.progress_percentage), 0) as avg_progress
            FROM courses c
            JOIN users u ON c.teacher_id = u.id
            LEFT JOIN enrollments e ON c.id = e.course_id
            GROUP BY c.id, c.title, u.first_name, u.last_name
            ORDER BY student_count DESC
        ");
        $modules_progress = $stmtModules->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "status" => "success", 
            "stats" => $stats, 
            "pending_requests" => $pending_requests,
            "modules_progress" => $modules_progress
        ]);
    }
    elseif ($action === 'get_users') {
        $stmt = $pdo->query("
            SELECT u.id, u.first_name, u.last_name, u.email, u.created_at, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        ");
        echo json_encode(["status" => "success", "users" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
    elseif ($action === 'get_modules') {
        $stmt = $pdo->query("
            SELECT c.id, c.title, c.created_at, cat.name as category_name, u.first_name, u.last_name
            FROM courses c
            JOIN users u ON c.teacher_id = u.id
            LEFT JOIN categories cat ON c.category_id = cat.id
            ORDER BY c.created_at DESC
        ");
        echo json_encode(["status" => "success", "modules" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
    elseif ($action === 'get_categories') {
        $stmt = $pdo->query("SELECT id, name FROM categories ORDER BY name ASC");
        echo json_encode(["status" => "success", "categories" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
    elseif ($action === 'export_users') {
        $stmt = $pdo->query("SELECT u.id, u.first_name, u.last_name, u.email, r.name as role, u.created_at FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=utilisateurs_lms.csv');
        $output = fopen('php://output', 'w');
        fputcsv($output, ['ID', 'Prénom', 'Nom', 'Email', 'Rôle', 'Date d\'inscription']);
        foreach ($users as $u) { fputcsv($output, $u); }
        fclose($output);
        exit;
    }
    elseif ($action === 'export_courses') {
        $stmt = $pdo->query("SELECT c.id, c.title, cat.name as category, u.first_name, u.last_name as teacher, c.created_at FROM courses c JOIN users u ON c.teacher_id = u.id LEFT JOIN categories cat ON c.category_id = cat.id ORDER BY c.created_at DESC");
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=cours_lms.csv');
        $output = fopen('php://output', 'w');
        fputcsv($output, ['ID', 'Titre', 'Catégorie', 'Prénom Prof', 'Nom Prof', 'Date de création']);
        foreach ($courses as $c) { fputcsv($output, $c); }
        fclose($output);
        exit;
    }
} 


elseif ($method === 'POST') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'approve_cert') {
        $cert_id = $_POST['cert_id'] ?? null;
        if ($cert_id) {
            $stmt = $pdo->prepare("UPDATE certificates SET status = 'approved' WHERE id = :id");
            $stmt->execute(['id' => $cert_id]);
            echo json_encode(["status" => "success", "message" => "Certificat approuvé"]);
        }
    }
    elseif ($action === 'reject_cert') {
        $cert_id = $_POST['cert_id'] ?? null;
        if ($cert_id) {
            $stmt = $pdo->prepare("UPDATE certificates SET status = 'rejected' WHERE id = :id");
            $stmt->execute(['id' => $cert_id]);
            echo json_encode(["status" => "success", "message" => "Certificat rejeté"]);
        }
    }
    elseif ($action === 'delete_user') {
        $user_id = $_POST['user_id'] ?? null;
        if ($user_id) {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
            $stmt->execute(['id' => $user_id]);
            echo json_encode(["status" => "success", "message" => "Utilisateur supprimé"]);
        }
    }
    elseif ($action === 'delete_module') {
        $module_id = $_POST['module_id'] ?? null;
        if ($module_id) {
            $stmt = $pdo->prepare("DELETE FROM courses WHERE id = :id");
            $stmt->execute(['id' => $module_id]);
            echo json_encode(["status" => "success", "message" => "Module supprimé"]);
        }
    }
    elseif ($action === 'change_role') {
        $user_id = $_POST['user_id'] ?? null;
        $new_role = $_POST['role'] ?? null;
        if ($user_id && $new_role) {
            $stmt = $pdo->prepare("UPDATE users SET role_id = (SELECT id FROM roles WHERE name = :role) WHERE id = :id");
            $stmt->execute(['role' => $new_role, 'id' => $user_id]);
            echo json_encode(["status" => "success", "message" => "Rôle mis à jour"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Données manquantes"]);
        }
    }
    elseif ($action === 'add_category') {
        $name = $_POST['name'] ?? null;
        if ($name) {
            $stmt = $pdo->prepare("INSERT INTO categories (name) VALUES (:name)");
            $stmt->execute(['name' => $name]);
            echo json_encode(["status" => "success", "message" => "Catégorie ajoutée"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Nom invalide"]);
        }
    }
    elseif ($action === 'add_user') {
        $first_name = $_POST['first_name'] ?? '';
        $last_name = $_POST['last_name'] ?? '';
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $role = $_POST['role'] ?? 'student';

        if(empty($first_name) || empty($last_name) || empty($email) || empty($password)){
            echo json_encode(["status" => "error", "message" => "Tous les champs sont requis."]);
            exit;
        }

        // Vérifier email existant
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
        $stmt->execute(['email' => $email]);
        if($stmt->rowCount() > 0) {
            echo json_encode(["status" => "error", "message" => "Cet email est déjà utilisé."]);
            exit;
        }

        // Récupérer l'ID du rôle
        $stmtRole = $pdo->prepare("SELECT id FROM roles WHERE name = :role_name");
        $stmtRole->execute(['role_name' => $role]);
        $role_id = $stmtRole->fetchColumn();

        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password_hash, role_id) VALUES (:fn, :ln, :em, :pw, :rid)");
        $stmt->execute([
            'fn' => $first_name,
            'ln' => $last_name,
            'em' => $email,
            'pw' => $hashed_password,
            'rid' => $role_id
        ]);
        echo json_encode(["status" => "success", "message" => "Utilisateur créé avec succès !"]);
    }
    elseif ($action === 'delete_category') {
        $cat_id = $_POST['category_id'] ?? null;
        if ($cat_id) {
            // Optionnel : on met à NULL les cours ayant cette catégorie avant de supprimer
            $pdo->prepare("UPDATE courses SET category_id = NULL WHERE category_id = :id")->execute(['id' => $cat_id]);
            $stmt = $pdo->prepare("DELETE FROM categories WHERE id = :id");
            $stmt->execute(['id' => $cat_id]);
            echo json_encode(["status" => "success", "message" => "Catégorie supprimée"]);
        }
    }
}
?>
