<?php
// api/live.php
require_once 'db.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Non autorisé"]);
    exit;
}

$user_id = $_SESSION['user_id'];
$role = $_SESSION['role'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $action = $_POST['action'] ?? '';

    // Professeur: Créer un live
    if ($action === 'create' && $role === 'teacher') {
        $session_code = 'LIVE-' . strtoupper(substr(md5(uniqid()), 0, 6));
        $course_id = $_POST['course_id'] ?? null;

        try {
            // La table live_sessions est créée dans le schema PostgreSQL
            // On insère directement
            $stmt = $pdo->prepare("INSERT INTO live_sessions (teacher_id, course_id, session_code) VALUES (:teacher_id, :course_id, :code)");
            $stmt->execute([
                'teacher_id' => $user_id,
                'course_id'  => $course_id ?: null,
                'code'       => $session_code
            ]);
            echo json_encode(["status" => "success", "session_code" => $session_code]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Erreur lors de la création du live : " . $e->getMessage()]);
        }
    }
    // Professeur: Terminer un live
    elseif ($action === 'end' && $role === 'teacher') {
        $session_code = $_POST['session_code'] ?? '';
        try {
            $stmt = $pdo->prepare("UPDATE live_sessions SET status = 'ended' WHERE session_code = :code AND teacher_id = :teacher_id");
            $stmt->execute(['code' => $session_code, 'teacher_id' => $user_id]);
            echo json_encode(["status" => "success"]);
        } catch (\Throwable $e) {
            echo json_encode(["status" => "error", "message" => "Erreur lors de la clôture."]);
        }
    }
    // Etudiant: Rejoindre un live
    elseif ($action === 'join' && $role === 'student') {
        $session_code = $_POST['session_code'] ?? '';
        try {
            $stmt = $pdo->prepare("SELECT id, course_id FROM live_sessions WHERE session_code = :code AND status = 'active'");
            $stmt->execute(['code' => $session_code]);
            if ($stmt->rowCount() > 0) {
                echo json_encode(["status" => "success", "message" => "Session trouvée."]);
            } else {
                echo json_encode(["status" => "error", "message" => "Session invalide ou terminée."]);
            }
        } catch (\Throwable $e) {
            echo json_encode(["status" => "error", "message" => "Erreur de connexion."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Action ou rôle invalide"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Méthode non autorisée"]);
}
?>
