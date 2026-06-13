<?php
require_once 'db.php';

// Création des tables
$pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'etudiant',
    xp INTEGER DEFAULT 0,
    heures_etude INTEGER DEFAULT 0
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    categorie TEXT NOT NULL,
    description TEXT,
    image_class TEXT,
    professeur TEXT
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    course_id INTEGER,
    progression INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(course_id) REFERENCES courses(id)
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    titre TEXT NOT NULL,
    date_limite DATETIME,
    est_urgent BOOLEAN DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
)");

// Insertion de données par défaut si la base est vide
$stmt = $pdo->query("SELECT COUNT(*) FROM users");
if ($stmt->fetchColumn() == 0) {
    // Insertion Utilisateur
    $pdo->exec("INSERT INTO users (nom, email, xp, heures_etude) VALUES ('Alexandre Dupont', 'alex@etu.fr', 1250, 12)");
    $user_id = $pdo->lastInsertId();

    // Autres utilisateurs pour le classement
    $pdo->exec("INSERT INTO users (nom, email, xp) VALUES ('Sarah M.', 'sarah@etu.fr', 2450)");
    $pdo->exec("INSERT INTO users (nom, email, xp) VALUES ('Julien R.', 'julien@etu.fr', 980)");

    // Insertion Cours
    $pdo->exec("INSERT INTO courses (titre, categorie, description, image_class, professeur) VALUES 
        ('Algorithmique & Structures de Données', 'Informatique', 'Maitrisez les arbres, graphes et la complexité.', 'alg', 'Prof. Martin'),
        ('Technologies Web Modernes', 'Développement Web', 'HTML5, CSS3, JS et introduction aux API.', 'web', 'Prof. Dubois'),
        ('Modélisation et SQL Avancé', 'Bases de données', 'PostgreSQL, optimisation de requêtes et triggers.', 'db', 'Prof. Leroy'),
        ('Maîtriser React.js', 'Frameworks', 'Hooks, Context API, Redux et Next.js.', 'react', 'Prof. Moreau')
    ");

    // Inscriptions (Enrollments)
    $pdo->exec("INSERT INTO enrollments (user_id, course_id, progression) VALUES 
        ($user_id, 1, 45),
        ($user_id, 2, 80),
        ($user_id, 3, 15),
        ($user_id, 4, 0)
    ");

    // Tâches
    $pdo->exec("INSERT INTO tasks (user_id, titre, date_limite, est_urgent) VALUES 
        ($user_id, 'Projet Node.js', datetime('now', '+1 day'), 1),
        ($user_id, 'QCM Base de données', datetime('now', '+2 days'), 0)
    ");

    echo "<h3>Base de données initialisée avec succès !</h3>";
    echo "<p><a href='index.php'>Aller à l'accueil</a></p>";
} else {
    echo "<h3>La base de données est déjà initialisée.</h3>";
    echo "<p><a href='index.php'>Aller à l'accueil</a></p>";
}
?>
