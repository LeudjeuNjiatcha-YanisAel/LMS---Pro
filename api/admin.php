<?php
session_start();
require 'db.php';
header('Content-Type: application/json');

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
        
        try { $pdo->exec("ALTER TABLE certificates ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'"); } catch(Exception $e){}
        
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

        echo json_encode(["status" => "success", "stats" => $stats, "pending_requests" => $pending_requests]);
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
}
?>
