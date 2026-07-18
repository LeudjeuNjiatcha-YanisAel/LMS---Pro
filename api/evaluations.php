<?php
// api/evaluations.php : Gère les quiz/évaluations (Création par le prof, lecture, et notation de l'étudiant)

session_start(); // On démarre la session utilisateur
require 'db.php'; // Connexion à la base de données
header('Content-Type: application/json'); // La réponse sera formatée en JSON

// Vérification de sécurité : l'utilisateur doit être connecté pour accéder aux évaluations
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Non autorisé"]);
    exit;
}

$role = $_SESSION['role'];
$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action === 'get_evaluation') {
        $lesson_id = $_GET['lesson_id'] ?? null;
        $eval_id = $_GET['eval_id'] ?? null;
        if (!$lesson_id && !$eval_id) {
            echo json_encode(["status" => "error", "message" => "ID leçon ou évaluation manquant."]);
            exit;
        }

        // Fetch eval
        if ($eval_id) {
            $stmt = $pdo->prepare("SELECT id, title, required_score FROM evaluations WHERE id = :eval_id LIMIT 1");
            $stmt->execute(['eval_id' => $eval_id]);
        } else {
            $stmt = $pdo->prepare("SELECT id, title, required_score FROM evaluations WHERE lesson_id = :lesson_id LIMIT 1");
            $stmt->execute(['lesson_id' => $lesson_id]);
        }
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

        // Fetch user result if any
        $stmtR = $pdo->prepare("SELECT score, passed FROM results WHERE evaluation_id = :eval_id AND student_id = :user_id LIMIT 1");
        $stmtR->execute(['eval_id' => $eval['id'], 'user_id' => $_SESSION['user_id']]);
        $result = $stmtR->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            $eval['user_result'] = $result;
        }

        echo json_encode(["status" => "success", "evaluation" => $eval]);
    }
    elseif ($action === 'list_scheduled') {
        // Auto-add missing columns if they don't exist
        try {
            $pdo->exec("ALTER TABLE evaluations ADD COLUMN scheduled_date DATETIME NULL DEFAULT NULL");
        } catch (PDOException $e) { /* column already exists */ }
        try {
            $pdo->exec("ALTER TABLE evaluations ADD COLUMN course_id INT NULL DEFAULT NULL");
        } catch (PDOException $e) { /* column already exists */ }
        try {
            $pdo->exec("ALTER TABLE evaluations ADD COLUMN is_final_exam BOOLEAN DEFAULT FALSE");
        } catch (PDOException $e) { /* column already exists */ }

        try {
            // Liste les évaluations programmées
            if ($role === 'teacher') {
                // Teacher: show scheduled evals for their courses (either via course_id or via lesson->course)
                $stmt = $pdo->prepare("
                    SELECT e.id, e.title, e.scheduled_date, 
                           COALESCE(c1.title, c2.title) as course_title
                    FROM evaluations e 
                    LEFT JOIN courses c1 ON e.course_id = c1.id 
                    LEFT JOIN lessons l ON e.lesson_id = l.id
                    LEFT JOIN courses c2 ON l.course_id = c2.id
                    WHERE (c1.teacher_id = :user_id OR c2.teacher_id = :user_id2)
                    ORDER BY e.scheduled_date ASC, e.id ASC
                ");
                $stmt->execute(['user_id' => $user_id, 'user_id2' => $user_id]);
                $evals = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                // Student: show all evaluations for enrolled courses
                $stmt = $pdo->prepare("
                    SELECT e.id, e.title, e.scheduled_date, 
                           COALESCE(e.course_id, l.course_id) as course_id,
                           COALESCE(c1.title, c2.title) as course_title, 
                           r.score, r.passed 
                    FROM evaluations e 
                    LEFT JOIN courses c1 ON e.course_id = c1.id 
                    LEFT JOIN lessons l ON e.lesson_id = l.id
                    LEFT JOIN courses c2 ON l.course_id = c2.id
                    LEFT JOIN results r ON r.evaluation_id = e.id AND r.student_id = :user_id
                    INNER JOIN enrollments en ON en.course_id = COALESCE(e.course_id, l.course_id) AND en.student_id = :user_id2
                    ORDER BY e.scheduled_date ASC, e.id ASC
                ");
                $stmt->execute(['user_id' => $user_id, 'user_id2' => $user_id]);
                $evals = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            echo json_encode(["status" => "success", "evaluations" => $evals]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur SQL: " . $e->getMessage()]);
        }
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
    } 
    elseif ($action === 'schedule' && $role === 'teacher') {
        $course_id = $_POST['course_id'] ?? null;
        $title = trim($_POST['title'] ?? '');
        $eval_date = $_POST['eval_date'] ?? null;
        $is_final_exam = isset($_POST['is_final_exam']) ? 1 : 0;
        $questions_json = $_POST['questions_json'] ?? '[]';
        $questionsArray = json_decode($questions_json, true);
        
        if (!$course_id || empty($title) || !$eval_date || empty($questionsArray)) {
            echo json_encode(["status" => "error", "message" => "Données incomplètes ou questions manquantes."]);
            exit;
        }
        
        try {
            try {
                $pdo->exec("ALTER TABLE evaluations ADD COLUMN is_final_exam BOOLEAN DEFAULT FALSE");
            } catch (PDOException $e) {}

            $pdo->beginTransaction();

            $stmt = $pdo->prepare("INSERT INTO evaluations (course_id, title, scheduled_date, is_final_exam, required_score) VALUES (:course_id, :title, :scheduled_date, :is_final_exam, 100)");
            $stmt->execute([
                'course_id' => $course_id,
                'title' => $title,
                'scheduled_date' => $eval_date,
                'is_final_exam' => $is_final_exam
            ]);
            
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
            echo json_encode(["status" => "success", "message" => "Évaluation programmée"]);
        } catch(PDOException $e) {
            $pdo->rollBack();
            echo json_encode(["status" => "error", "message" => "Erreur de programmation : " . $e->getMessage()]);
        }
    } elseif ($action === 'submit_eval' && $role === 'student') {
        $eval_id = $_POST['evaluation_id'] ?? null;
        $score = $_POST['score'] ?? null;
        $passed = $_POST['passed'] ?? 0;
        
        if (!$eval_id || $score === null) {
            echo json_encode(["status" => "error", "message" => "Données incomplètes."]);
            exit;
        }

        try {
            // Check if already submitted
            $check = $pdo->prepare("SELECT id FROM results WHERE student_id = :student_id AND evaluation_id = :eval_id");
            $check->execute(['student_id' => $user_id, 'eval_id' => $eval_id]);
            if ($check->rowCount() > 0) {
                // Update score if they somehow retry (though they shouldn't)
                $stmt = $pdo->prepare("UPDATE results SET score = :score, passed = :passed, attempted_at = CURRENT_TIMESTAMP WHERE student_id = :student_id AND evaluation_id = :eval_id");
                $stmt->execute(['score' => $score, 'passed' => $passed, 'student_id' => $user_id, 'eval_id' => $eval_id]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO results (student_id, evaluation_id, score, passed) VALUES (:student_id, :eval_id, :score, :passed)");
                $stmt->execute(['student_id' => $user_id, 'eval_id' => $eval_id, 'score' => $score, 'passed' => $passed]);
            }
            
            echo json_encode(["status" => "success", "message" => "Évaluation enregistrée"]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    } elseif ($action === 'delete_scheduled' && $role === 'teacher') {
        $eval_id = $_POST['eval_id'] ?? null;
        if (!$eval_id) {
            echo json_encode(["status" => "error", "message" => "ID d'évaluation manquant"]);
            exit;
        }
        try {
            // Delete only if it belongs to a course taught by this teacher
            $stmt = $pdo->prepare("DELETE FROM evaluations WHERE id = :id AND (course_id IN (SELECT id FROM courses WHERE teacher_id = :teacher_id) OR lesson_id IN (SELECT l.id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE c.teacher_id = :teacher_id2))");
            $stmt->execute(['id' => $eval_id, 'teacher_id' => $user_id, 'teacher_id2' => $user_id]);
            echo json_encode(["status" => "success", "message" => "Évaluation supprimée"]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Action invalide"]);
    }
}
?>
