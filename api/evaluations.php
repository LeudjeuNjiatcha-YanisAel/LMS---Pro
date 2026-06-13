<?php
session_start();
require 'db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    echo json_encode(["status" => "error", "message" => "Non autorisé"]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create') {
        $lesson_id = $_POST['lesson_id'] ?? null;
        $eval_title = trim($_POST['eval_title'] ?? '');
        $question_text = trim($_POST['question_text'] ?? '');
        $correct_answer = trim($_POST['correct_answer'] ?? '');
        $wrong1 = trim($_POST['wrong1'] ?? '');
        $wrong2 = trim($_POST['wrong2'] ?? '');
        $required_score = $_POST['required_score'] ?? 100;

        if (!$lesson_id || empty($eval_title) || empty($question_text) || empty($correct_answer)) {
            echo json_encode(["status" => "error", "message" => "Données incomplètes."]);
            exit;
        }

        try {
            // Optionnel : s'assurer que la colonne required_score existe
            try {
                $pdo->exec("ALTER TABLE evaluations ADD COLUMN required_score INT DEFAULT 100");
            } catch (PDOException $e) {
                // Ignore l'erreur si la colonne existe déjà
            }

            // Démarrer une transaction
            $pdo->beginTransaction();

            // 1. Créer l'évaluation
            $stmt = $pdo->prepare("INSERT INTO evaluations (lesson_id, title, required_score) VALUES (:lesson_id, :title, :score)");
            $stmt->execute([
                'lesson_id' => $lesson_id, 
                'title' => $eval_title,
                'score' => $required_score
            ]);
            $eval_id = $pdo->lastInsertId();

            // 2. Créer la question
            $stmtQ = $pdo->prepare("INSERT INTO questions (evaluation_id, question_text, type) VALUES (:eval_id, :text, 'multiple_choice')");
            $stmtQ->execute(['eval_id' => $eval_id, 'text' => $question_text]);
            $question_id = $pdo->lastInsertId();

            // 3. Ajouter les choix
            $stmtC = $pdo->prepare("INSERT INTO choices (question_id, choice_text, is_correct) VALUES (:q_id, :text, :is_correct)");
            
            // Bonne réponse
            $stmtC->execute(['q_id' => $question_id, 'text' => $correct_answer, 'is_correct' => 1]);
            
            // Mauvaises réponses
            if (!empty($wrong1)) {
                $stmtC->execute(['q_id' => $question_id, 'text' => $wrong1, 'is_correct' => 0]);
            }
            if (!empty($wrong2)) {
                $stmtC->execute(['q_id' => $question_id, 'text' => $wrong2, 'is_correct' => 0]);
            }

            $pdo->commit();
            echo json_encode(["status" => "success", "message" => "Évaluation ajoutée"]);

        } catch(PDOException $e) {
            $pdo->rollBack();
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Action invalide"]);
    }
}
?>
