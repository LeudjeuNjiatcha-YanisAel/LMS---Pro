<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    if ($action === 'dashboard') {
        // Utilisateur principal (ID = 1 pour la démo)
        $stmt = $pdo->query("SELECT * FROM users WHERE id = 1");
        $user = $stmt->fetch();

        // Récupérer les cours de l'utilisateur
        $stmt = $pdo->query("
            SELECT c.*, e.progression 
            FROM courses c 
            JOIN enrollments e ON c.id = e.course_id 
            WHERE e.user_id = 1
        ");
        $courses = $stmt->fetchAll();

        // Récupérer les devoirs
        $stmt = $pdo->query("SELECT * FROM tasks WHERE user_id = 1 ORDER BY date_limite ASC");
        $tasks = $stmt->fetchAll();

        // Classement
        $stmt = $pdo->query("SELECT nom, xp FROM users ORDER BY xp DESC LIMIT 5");
        $leaderboard = $stmt->fetchAll();

        echo json_encode([
            'status' => 'success',
            'data' => [
                'user' => $user,
                'courses' => $courses,
                'tasks' => $tasks,
                'leaderboard' => $leaderboard
            ]
        ]);
    } 
    elseif ($action === 'courses') {
        // Tous les cours
        $stmt = $pdo->query("SELECT * FROM courses");
        $courses = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $courses]);
    } 
    else {
        echo json_encode(['status' => 'error', 'message' => 'Action non reconnue']);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
