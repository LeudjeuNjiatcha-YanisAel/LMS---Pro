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
        // Préparation de la requête : On sélectionne les cours du prof, avec le nom de la catégorie
        // et on compte le nombre de leçons grâce à un LEFT JOIN et un GROUP BY
        $stmt = $pdo->prepare("
            SELECT c.id, c.title, cat.name as category_name, COUNT(l.id) as lesson_count
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
            SELECT c.id, c.title, c.description, cat.name as category_name, e.progress_percentage
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
    // L'enseignant veut CRÉER un nouveau cours
    elseif ($action === 'create' && $role === 'teacher') {
        // On récupère et nettoie les données envoyées par le formulaire
        $title = trim($_POST['title'] ?? '');
        $category_id = $_POST['category_id'] ?? 1; // 1 par défaut si vide
        $description = trim($_POST['description'] ?? '');

        // Vérification de base
        if (empty($title) || empty($description)) {
            echo json_encode(["status" => "error", "message" => "Titre et description requis."]);
            exit;
        }

        try {
            // Requête d'insertion sécurisée avec des paramètres nommés (:title, :cat, :teacher, :desc)
            $stmt = $pdo->prepare("
                INSERT INTO courses (title, category_id, teacher_id, description) 
                VALUES (:title, :cat, :teacher, :desc)
            ");
            
            // Exécution de la requête en mappant les variables PHP aux paramètres SQL
            $stmt->execute([
                'title' => $title,
                'cat' => $category_id,
                'teacher' => $user_id, // L'ID de session garantit que le prof crée SON cours
                'desc' => $description
            ]);

            echo json_encode(["status" => "success", "message" => "Cours créé"]);
        } catch(PDOException $e) {
            // En cas d'erreur SQL (ex: clé étrangère category_id inexistante)
            echo json_encode(["status" => "error", "message" => "Erreur BDD: " . $e->getMessage()]);
        }
    }
    // L'enseignant supprime un cours
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
}
?>
