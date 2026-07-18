<?php
// api/certificates.php : Gère la demande et la récupération des certificats pour les étudiants

session_start(); // On démarre la session utilisateur
require 'db.php'; // Connexion à la base de données
header('Content-Type: application/json'); // Format de retour JSON

// Vérification de sécurité : Seul un utilisateur connecté peut accéder à ce script
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Non autorisé"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$role = $_SESSION['role'];
$method = $_SERVER['REQUEST_METHOD'];

// Assurer que la colonne status existe
try { $pdo->exec("ALTER TABLE certificates ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'"); } catch (PDOException $e) {}

if ($method === 'GET' && $role === 'student') {
    // Liste des certificats de l'étudiant
    $stmt = $pdo->prepare("
        SELECT c.id as course_id, c.title as course_title, e.progress_percentage, 
               cert.id as cert_id, cert.status as cert_status, cert.issued_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN certificates cert ON cert.course_id = c.id AND cert.student_id = e.student_id
        WHERE e.student_id = :student_id AND e.progress_percentage >= 100
    ");
    $stmt->execute(['student_id' => $user_id]);
    $certs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "certificates" => $certs]);
} 
elseif ($method === 'POST' && $role === 'student') {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'request') {
        $course_id = $_POST['course_id'] ?? null;
        
        // Vérifier si progression = 100
        $stmtCheck = $pdo->prepare("SELECT progress_percentage FROM enrollments WHERE student_id = :student_id AND course_id = :course_id");
        $stmtCheck->execute(['student_id' => $user_id, 'course_id' => $course_id]);
        $prog = $stmtCheck->fetchColumn();

        if ($prog < 100) {
            echo json_encode(["status" => "error", "message" => "Cours non terminé à 100%"]);
            exit;
        }

        // Insérer demande
        try {
            $stmtInsert = $pdo->prepare("INSERT INTO certificates (student_id, course_id, status) VALUES (:s_id, :c_id, 'pending')");
            $stmtInsert->execute(['s_id' => $user_id, 'c_id' => $course_id]);
            echo json_encode(["status" => "success", "message" => "Demande de certificat envoyée"]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
}
?>
