<?php
session_start();
require 'db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Non autorisé"]);
    exit;
}

$role = $_SESSION['role'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action === 'get_evaluation') {
        $lesson_id = $_GET['lesson_id'] ?? null;
        if (!$lesson_id) {
            echo json_encode(["status" => "error", "message" => "ID leçon manquant."]);
            exit;
        }

        // Fetch eval
        $stmt = $pdo->prepare("SELECT id, title, required_score FROM evaluations WHERE lesson_id = :lesson_id LIMIT 1");
        $stmt->execute(['lesson_id' => $lesson_id]);
        $eval = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$eval) {
            echo json_encode(["status" => "error", "message" => "Pas d'évaluation pour cette leçon."]);
            exit;
        }

        // Fetch questions
        $stmtQ = $pdo->prepare("SELECT id, question_text FROM questions WHERE evaluation_id = :eval_id");
        $stmtQ->execute(['eval_id' => $eval['id']]);
        $questions = $stmtQ->fetchAll(PDO::FETCH_ASSOC);

        foreach ($questions as &$q) {
            $stmtC = $pdo->prepare("SELECT id, choice_text, is_correct FROM choices WHERE question_id = :q_id ORDER BY RAND()");
            $stmtC->execute(['q_id' => $q['id']]);
            $q['choices'] = $stmtC->fetchAll(PDO::FETCH_ASSOC);
        }

        $eval['questions'] = $questions;
        echo json_encode(["status" => "success", "evaluation" => $eval]);
    }
}
elseif ($method === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create' && $role === 'teacher') {
        $lesson_id = $_POST['lesson_id'] ?? null;
        $eval_title = trim($_POST['eval_title'] ?? '');
        $required_score = $_POST['required_score'] ?? 100;
        $questions_json = $_POST['questions_json'] ?? '[]';

        $questionsArray = json_decode($questions_json, true);

        if (!$lesson_id || empty($eval_title) || empty($questionsArray)) {
            echo json_encode(["status" => "error", "message" => "Données incomplètes ou aucune question fournie."]);
            exit;
        }

        try {
            try { $pdo->exec("ALTER TABLE evaluations ADD COLUMN required_score INT DEFAULT 100"); } catch (PDOException $e) { }

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO evaluations (lesson_id, title, required_score) VALUES (:lesson_id, :title, :score)");
            $stmt->execute(['lesson_id' => $lesson_id, 'title' => $eval_title, 'score' => $required_score]);
            $eval_id = $pdo->lastInsertId();

            foreach ($questionsArray as $q) {
                $stmtQ = $pdo->prepare("INSERT INTO questions (evaluation_id, question_text, type) VALUES (:eval_id, :text, 'multiple_choice')");
                $stmtQ->execute(['eval_id' => $eval_id, 'text' => $q['q']]);
                $question_id = $pdo->lastInsertId();

                $stmtC = $pdo->prepare("INSERT INTO choices (question_id, choice_text, is_correct) VALUES (:q_id, :text, :is_correct)");
                
                $stmtC->execute(['q_id' => $question_id, 'text' => $q['c'], 'is_correct' => 1]);
                if (!empty($q['w1'])) $stmtC->execute(['q_id' => $question_id, 'text' => $q['w1'], 'is_correct' => 0]);
                if (!empty($q['w2'])) $stmtC->execute(['q_id' => $question_id, 'text' => $q['w2'], 'is_correct' => 0]);
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
