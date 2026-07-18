<?php
// api/courses.php : Gère les requêtes liées aux cours (Création, Lecture)

session_start(); // On récupère la session
require 'db.php'; // On inclut la connexion PDO à MySQL

header('Content-Type: application/json'); // On définit la réponse en JSON

// Vérifie si l'utilisateur est bien connecté (s'il a un ID en session)
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Non autorisé"]);
    exit;
}

$user_id = $_SESSION['user_id']; // ID de l'utilisateur connecté
$role = $_SESSION['role'];       // Son rôle (admin, teacher, student)
$method = $_SERVER['REQUEST_METHOD']; // POST (Créer) ou GET (Lire)

// --- SI LA MÉTHODE EST GET (Récupération des données) ---
if ($method === 'GET') {
    $action = $_GET['action'] ?? ''; // On vérifie ce qu'on veut lister

    // L'enseignant veut voir la liste de SES cours
    if ($action === 'list_teacher' && $role === 'teacher') {
        // Préparation de la requête : On sélectionne les cours du prof, avec le nom de la catégorie,
        // on compte le nombre de leçons grâce à un LEFT JOIN et un GROUP BY,
        // et on compte le nombre d'inscriptions (étudiants) avec un sous-requête
        $stmt = $pdo->prepare("
            SELECT c.id, c.title, cat.name as category_name, COUNT(DISTINCT l.id) as lesson_count,
            (SELECT COUNT(e.id) FROM enrollments e WHERE e.course_id = c.id) as student_count
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN lessons l ON c.id = l.course_id
            WHERE c.teacher_id = :teacher_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        ");
        $stmt->execute(['teacher_id' => $user_id]); // On exécute avec l'ID du prof
        $courses = $stmt->fetchAll(); // On récupère toutes les lignes

        // On renvoie un JSON avec le statut succès et le tableau de cours
        echo json_encode(["status" => "success", "courses" => $courses]);
    } 
    // Un étudiant (ou n'importe qui) veut voir TOUS les cours de la plateforme
    elseif ($action === 'list_all') {
        $stmt = $pdo->prepare("
            SELECT c.id, c.title, c.description, cat.name as category_name, COUNT(l.id) as lesson_count
            FROM courses c
            LEFT JOIN categories cat ON c.category_id = cat.id
            LEFT JOIN lessons l ON c.id = l.course_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        ");
        $stmt->execute();
        $courses = $stmt->fetchAll();
        echo json_encode(["status" => "success", "courses" => $courses]);
    }
    // Un étudiant veut voir SES cours rejoints
    elseif ($action === 'list_enrolled' && $role === 'student') {
        $stmt = $pdo->prepare("
            SELECT c.id, c.title, c.description, c.total_lessons, cat.name as category_name, e.progress_percentage
            FROM courses c
            JOIN enrollments e ON c.id = e.course_id
            LEFT JOIN categories cat ON c.category_id = cat.id
            WHERE e.student_id = :student_id
            ORDER BY e.enrolled_at DESC
        ");
        $stmt->execute(['student_id' => $user_id]);
        $courses = $stmt->fetchAll();
        echo json_encode(["status" => "success", "courses" => $courses]);
    }
    // Récupérer le contenu d'un cours pour le player
    elseif ($action === 'get_course_content') {
        $course_id = $_GET['course_id'] ?? null;
        if(!$course_id) {
            echo json_encode(["status" => "error", "message" => "ID du cours manquant"]);
            exit;
        }

        // On récupère le titre du cours
        $stmt = $pdo->prepare("SELECT title FROM courses WHERE id = :id");
        $stmt->execute(['id' => $course_id]);
        $course = $stmt->fetch();

        // On récupère la première leçon (pour simplifier la démo)
        $stmt2 = $pdo->prepare("SELECT id, title, content_type, content_url FROM lessons WHERE course_id = :course_id ORDER BY order_index ASC LIMIT 1");
        $stmt2->execute(['course_id' => $course_id]);
        $lesson = $stmt2->fetch();

        echo json_encode([
            "status" => "success", 
            "course_title" => $course ? $course['title'] : "Cours",
            "lesson" => $lesson
        ]);
    }
    elseif ($action === 'get_teacher_results' && $role === 'teacher') {
        $stmt = $pdo->prepare("
            SELECT u.first_name, u.last_name, c.title as course_title, e.progress_percentage,
                   IFNULL(cert.status, 'Non demandé') as cert_status
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN certificates cert ON cert.student_id = u.id AND cert.course_id = c.id
            WHERE c.teacher_id = :teacher_id
            ORDER BY e.enrolled_at DESC
        ");
        $stmt->execute(['teacher_id' => $user_id]);
        $results = $stmt->fetchAll();
        echo json_encode(["status" => "success", "results" => $results]);
    }
    // Alias 'list' = liste des cours du prof (pour peupler le select Prog.Eval)
    elseif ($action === 'list' && $role === 'teacher') {
        $stmt = $pdo->prepare("
            SELECT c.id, c.title
            FROM courses c
            WHERE c.teacher_id = :teacher_id
            ORDER BY c.created_at DESC
        ");
        $stmt->execute(['teacher_id' => $user_id]);
        echo json_encode(["status" => "success", "courses" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
    // Liste des étudiants inscrits aux cours de ce professeur
    elseif ($action === 'list_my_students' && $role === 'teacher') {
        $stmt = $pdo->prepare("
            SELECT u.first_name, u.last_name, c.title as course_title, e.progress_percentage, e.enrolled_at,
                   IFNULL(cert.status, 'Aucun') as cert_status
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN certificates cert ON cert.student_id = u.id AND cert.course_id = c.id
            WHERE c.teacher_id = :teacher_id
            ORDER BY e.enrolled_at DESC
        ");
        $stmt->execute(['teacher_id' => $user_id]);
        echo json_encode(["status" => "success", "students" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
    else {
        echo json_encode(["status" => "error", "message" => "Action invalide"]);
    }
}

// --- SI LA MÉTHODE EST POST (Envoi de données) ---
elseif ($method === 'POST') {
    $action = $_POST['action'] ?? '';

    // L'étudiant s'inscrit à un cours
    if ($action === 'enroll' && $role === 'student') {
        $course_id = $_POST['course_id'] ?? null;
        if (!$course_id) {
            echo json_encode(["status" => "error", "message" => "ID du cours manquant."]);
            exit;
        }
        
        // Vérifier s'il est déjà inscrit
        $check = $pdo->prepare("SELECT id FROM enrollments WHERE student_id = :student_id AND course_id = :course_id");
        $check->execute(['student_id' => $user_id, 'course_id' => $course_id]);
        if ($check->rowCount() > 0) {
            echo json_encode(["status" => "error", "message" => "Vous êtes déjà inscrit à ce cours."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO enrollments (student_id, course_id, progress_percentage) VALUES (:student_id, :course_id, 0.00)");
            $stmt->execute(['student_id' => $user_id, 'course_id' => $course_id]);
            echo json_encode(["status" => "success", "message" => "Inscription réussie"]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
    // L'étudiant met à jour sa progression (après chaque leçon)
    elseif ($action === 'update_progress' && $role === 'student') {
        $course_id = $_POST['course_id'] ?? null;
        $new_progress = isset($_POST['new_progress']) ? (float)$_POST['new_progress'] : null;
        
        if (!$course_id) {
            echo json_encode(["status" => "error", "message" => "ID du cours manquant."]);
            exit;
        }

        try {
            if ($new_progress !== null) {
                // Mettre à jour la progression avec la nouvelle valeur si elle est plus grande
                $stmtUpdate = $pdo->prepare("
                    UPDATE enrollments 
                    SET progress_percentage = LEAST(GREATEST(progress_percentage, :new_progress), 100) 
                    WHERE student_id = :student_id AND course_id = :course_id
                ");
                $stmtUpdate->execute([
                    'new_progress' => $new_progress,
                    'student_id' => $user_id,
                    'course_id' => $course_id
                ]);
            } else {
                // Fallback (old behavior with increment, but guarded)
                $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM lessons WHERE course_id = :course_id");
                $stmtCount->execute(['course_id' => $course_id]);
                $total_lessons = (int)$stmtCount->fetchColumn();
                if ($total_lessons <= 0) $total_lessons = 1; 
                $increment = 100 / $total_lessons;

                $stmtUpdate = $pdo->prepare("
                    UPDATE enrollments 
                    SET progress_percentage = LEAST(progress_percentage + :increment, 100) 
                    WHERE student_id = :student_id AND course_id = :course_id
                ");
                $stmtUpdate->execute([
                    'increment' => $increment,
                    'student_id' => $user_id,
                    'course_id' => $course_id
                ]);
            }
            
            // 3. Récupérer la nouvelle progression pour la renvoyer
            $stmtCheck = $pdo->prepare("SELECT progress_percentage FROM enrollments WHERE student_id = :student_id AND course_id = :course_id");
            $stmtCheck->execute(['student_id' => $user_id, 'course_id' => $course_id]);
            $current_progress = $stmtCheck->fetchColumn();

            echo json_encode(["status" => "success", "message" => "Progression mise à jour", "new_progress" => $current_progress]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
    // L'enseignant veut CRÉER un nouveau cours
    elseif ($action === 'create' && $role === 'teacher') {
        $title = trim($_POST['title'] ?? '');
        $category_id = $_POST['category_id'] ?? 1; 
        $description = trim($_POST['description'] ?? '');
        $total_lessons = (int)($_POST['total_lessons'] ?? 1);

        if (empty($title) || empty($description)) {
            echo json_encode(["status" => "error", "message" => "Titre et description requis."]);
            exit;
        }

        try {
            // Optionnel : s'assurer que la colonne total_lessons existe
            try {
                $pdo->exec("ALTER TABLE courses ADD COLUMN total_lessons INT DEFAULT 1");
            } catch (PDOException $e) { }

            $stmt = $pdo->prepare("
                INSERT INTO courses (title, category_id, teacher_id, description, total_lessons) 
                VALUES (:title, :cat, :teacher, :desc, :total_lessons)
            ");
            
            $stmt->execute([
                'title' => $title,
                'cat' => $category_id,
                'teacher' => $user_id,
                'desc' => $description,
                'total_lessons' => $total_lessons
            ]);

            echo json_encode(["status" => "success", "message" => "Cours créé"]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
    elseif ($action === 'delete' && $role === 'teacher') {
        $course_id = $_POST['course_id'] ?? null;
        if (!$course_id) {
            echo json_encode(["status" => "error", "message" => "ID manquant."]);
            exit;
        }

        // Vérifier que le cours appartient bien au prof
        $stmt = $pdo->prepare("SELECT id FROM courses WHERE id = :id AND teacher_id = :teacher_id");
        $stmt->execute(['id' => $course_id, 'teacher_id' => $user_id]);
        if ($stmt->rowCount() === 0) {
            echo json_encode(["status" => "error", "message" => "Non autorisé à supprimer ce cours."]);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM courses WHERE id = :id");
            $stmt->execute(['id' => $course_id]);
            echo json_encode(["status" => "success", "message" => "Cours supprimé"]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
    // L'étudiant quitte un cours (désinscription)
    elseif ($action === 'unenroll' && $role === 'student') {
        $course_id = $_POST['course_id'] ?? null;
        if (!$course_id) {
            echo json_encode(["status" => "error", "message" => "ID du cours manquant."]);
            exit;
        }
        try {
            // Supprimer la progression et les résultats liés
            $pdo->prepare("DELETE FROM results WHERE student_id = :uid AND evaluation_id IN (SELECT id FROM evaluations WHERE course_id = :cid OR lesson_id IN (SELECT id FROM lessons WHERE course_id = :cid2))")
                ->execute(['uid' => $user_id, 'cid' => $course_id, 'cid2' => $course_id]);
            // Supprimer l'inscription
            $stmt = $pdo->prepare("DELETE FROM enrollments WHERE student_id = :student_id AND course_id = :course_id");
            $stmt->execute(['student_id' => $user_id, 'course_id' => $course_id]);
            echo json_encode(["status" => "success", "message" => "Vous avez quitté ce cours."]);
        } catch(PDOException $e) {
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
}
?>
