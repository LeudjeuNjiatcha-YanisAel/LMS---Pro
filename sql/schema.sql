-- Création de la base de données
CREATE DATABASE IF NOT EXISTS lms_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lms_db;

-- Table des rôles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY, -- Identifiant unique du rôle
    name VARCHAR(50) NOT NULL UNIQUE   -- Nom du rôle (admin, teacher, student)
);

-- Insertion des rôles de base
INSERT INTO roles (name) VALUES ('admin'), ('teacher'), ('student');

-- Table des utilisateurs
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY, -- Identifiant unique
    role_id INT NOT NULL,              -- Référence vers le rôle
    first_name VARCHAR(100) NOT NULL,  -- Prénom
    last_name VARCHAR(100) NOT NULL,   -- Nom de famille
    email VARCHAR(150) NOT NULL UNIQUE,-- Email (utilisé pour la connexion)
    password_hash VARCHAR(255) NOT NULL, -- Mot de passe crypté
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Date de création
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Table des catégories de cours
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Table des cours (créés par les enseignants ou admins)
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    teacher_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des leçons (liées aux cours)
CREATE TABLE lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content_type ENUM('pdf', 'video') NOT NULL,
    content_url VARCHAR(255) NOT NULL,
    order_index INT NOT NULL, -- Pour ordonner les leçons dans un cours
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Table des évaluations
CREATE TABLE evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Table des questions (pour les évaluations)
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    question_text TEXT NOT NULL,
    type ENUM('multiple_choice', 'single_choice') NOT NULL,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
);

-- Table des réponses possibles
CREATE TABLE choices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    choice_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Table des inscriptions des étudiants aux cours
CREATE TABLE enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Table des résultats d'évaluation
CREATE TABLE results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    evaluation_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    passed BOOLEAN NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
);

-- Table des certificats
CREATE TABLE certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
