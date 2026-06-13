<?php
session_start();
require 'db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Non autorisé"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$role = $_SESSION['role'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'list') {
        $course_id = $_GET['course_id'] ?? null;
        if (!$course_id) {
            echo json_encode(["status" => "error", "message" => "ID du cours manquant."]);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id, title, content_type, content_url, order_index FROM lessons WHERE course_id = :course_id ORDER BY order_index ASC");
        $stmt->execute(['course_id' => $course_id]);
        $lessons = $stmt->fetchAll();
        
        echo json_encode(["status" => "success", "lessons" => $lessons]);
    } else {
        echo json_encode(["status" => "error", "message" => "Action invalide"]);
    }
}
elseif ($method === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create' && $role === 'teacher') {
        $course_id = $_POST['course_id'] ?? null;
        $title = trim($_POST['title'] ?? '');
        $content_type = $_POST['content_type'] ?? 'video';
        $content_url = '';

        if (!$course_id || empty($title)) {
            echo json_encode(["status" => "error", "message" => "Données incomplètes."]);
            exit;
        }

        // Vérifier que le cours appartient bien à ce prof
        $stmt = $pdo->prepare("SELECT id FROM courses WHERE id = :id AND teacher_id = :teacher_id");
        $stmt->execute(['id' => $course_id, 'teacher_id' => $user_id]);
        if ($stmt->rowCount() === 0) {
            echo json_encode(["status" => "error", "message" => "Action non autorisée pour ce cours."]);
            exit;
        }

        if ($content_type === 'pdf') {
            // Gérer l'upload du fichier PDF
            if (isset($_FILES['content_file']) && $_FILES['content_file']['error'] === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($_FILES['content_file']['name'], PATHINFO_EXTENSION));
                if ($ext !== 'pdf') {
                    echo json_encode(["status" => "error", "message" => "Seuls les fichiers PDF sont acceptés."]);
                    exit;
                }
                $filename = uniqid('pdf_') . '.pdf';
                $dest = 'uploads/pdf/' . $filename;
                
                if (move_uploaded_file($_FILES['content_file']['tmp_name'], $dest)) {
                    $content_url = 'api/' . $dest; // URL relative pour le frontend
                } else {
                    echo json_encode(["status" => "error", "message" => "Échec de l'upload du fichier."]);
                    exit;
                }
            } else {
                echo json_encode(["status" => "error", "message" => "Veuillez fournir un fichier PDF valide."]);
                exit;
            }
        } else {
            // Vidéo: On attend un lien
            $content_url = trim($_POST['content_url'] ?? '');
            if (empty($content_url)) {
                echo json_encode(["status" => "error", "message" => "Veuillez fournir une URL vidéo."]);
                exit;
            }
        }

        // Trouver le order_index (le plus grand actuel + 1)
        $stmtOrder = $pdo->prepare("SELECT MAX(order_index) as max_order FROM lessons WHERE course_id = :course_id");
        $stmtOrder->execute(['course_id' => $course_id]);
        $row = $stmtOrder->fetch();
        $next_index = ($row['max_order'] !== null) ? (int)$row['max_order'] + 1 : 1;

        try {
            $stmtInsert = $pdo->prepare("INSERT INTO lessons (course_id, title, content_type, content_url, order_index) VALUES (:course_id, :title, :type, :url, :order)");
            $stmtInsert->execute([
                'course_id' => $course_id,
                'title' => $title,
                'type' => $content_type,
                'url' => $content_url,
                'order' => $next_index
            ]);
            echo json_encode(["status" => "success", "message" => "Leçon créée"]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
}
?>
