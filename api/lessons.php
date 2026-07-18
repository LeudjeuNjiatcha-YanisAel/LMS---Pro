<?php
// api/lessons.php : Gère le CRUD des leçons d'un cours (Ajout de PDF, Vidéos, et lecture)

session_start(); // Démarre la session utilisateur
require 'db.php'; // Connexion à la base de données
header('Content-Type: application/json'); // Format de réponse JSON

// Vérification de sécurité : l'utilisateur doit être connecté
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
        
        // Vérifier s'il y a un examen final pour ce cours
        $stmtEval = $pdo->prepare("SELECT id, title FROM evaluations WHERE course_id = :course_id AND is_final_exam = 1 LIMIT 1");
        $stmtEval->execute(['course_id' => $course_id]);
        $finalEval = $stmtEval->fetch();
        
        echo json_encode(["status" => "success", "lessons" => $lessons, "final_eval" => $finalEval]);
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

        if ($content_type === 'pdf' || $content_type === 'video') {
            if (isset($_FILES['content_file']) && $_FILES['content_file']['error'] === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($_FILES['content_file']['name'], PATHINFO_EXTENSION));
                $allowed_exts = $content_type === 'pdf' ? ['pdf'] : ['mp4', 'webm', 'ogg'];
                
                if (!in_array($ext, $allowed_exts)) {
                    echo json_encode(["status" => "error", "message" => "Format de fichier non supporté."]);
                    exit;
                }
                
                $filename = uniqid($content_type . '_') . '.' . $ext;
                $upload_dir = __DIR__ . '/uploads/' . $content_type . '/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                
                $dest = $upload_dir . $filename;
                
                if (move_uploaded_file($_FILES['content_file']['tmp_name'], $dest)) {
                    $content_url = 'api/uploads/' . $content_type . '/' . $filename;
                } else {
                    echo json_encode(["status" => "error", "message" => "Échec de la sauvegarde du fichier."]);
                    exit;
                }
            } else {
                if ($content_type === 'pdf') {
                    echo json_encode(["status" => "error", "message" => "Aucun fichier PDF fourni."]);
                    exit;
                } else {
                    $content_url = trim($_POST['content_url'] ?? '');
                    if (empty($content_url)) {
                        echo json_encode(["status" => "error", "message" => "Veuillez fournir une URL vidéo ou uploader un fichier."]);
                        exit;
                    }
                }
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
    } elseif ($action === 'delete' && $role === 'teacher') {
        $lesson_id = $_POST['lesson_id'] ?? null;
        if (!$lesson_id) {
            echo json_encode(["status" => "error", "message" => "ID leçon manquant."]);
            exit;
        }
        
        // Vérifier que la leçon appartient bien à un cours de ce prof
        $stmtCheck = $pdo->prepare("SELECT l.id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = :lesson_id AND c.teacher_id = :teacher_id");
        $stmtCheck->execute(['lesson_id' => $lesson_id, 'teacher_id' => $user_id]);
        if ($stmtCheck->rowCount() === 0) {
            echo json_encode(["status" => "error", "message" => "Action non autorisée."]);
            exit;
        }

        try {
            $stmtDel = $pdo->prepare("DELETE FROM lessons WHERE id = :lesson_id");
            $stmtDel->execute(['lesson_id' => $lesson_id]);
            echo json_encode(["status" => "success", "message" => "Leçon supprimée"]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur lors de la suppression."]);
        }
    }
}
?>
