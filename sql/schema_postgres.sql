-- ================================================================
-- LMS Pro - Schéma PostgreSQL (compatible Render)
-- Converti depuis MySQL par Antigravity
-- ================================================================

-- Table des rôles
CREATE TABLE IF NOT EXISTS roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('admin'), ('teacher'), ('student')
ON CONFLICT (name) DO NOTHING;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    role_id        INT NOT NULL,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    filiere        VARCHAR(100) NULL,
    matricule      VARCHAR(50)  NULL UNIQUE,
    numero_unique  VARCHAR(50)  NULL UNIQUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Table des catégories de cours
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT
);

-- Table des cours
CREATE TABLE IF NOT EXISTS courses (
    id            SERIAL PRIMARY KEY,
    category_id   INT NULL,
    teacher_id    INT NOT NULL,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    total_lessons INT DEFAULT 1,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- Table des leçons
CREATE TABLE IF NOT EXISTS lessons (
    id           SERIAL PRIMARY KEY,
    course_id    INT NOT NULL,
    title        VARCHAR(200) NOT NULL,
    content_type VARCHAR(10) NOT NULL CHECK (content_type IN ('pdf', 'video')),
    content_url  VARCHAR(255) NOT NULL,
    order_index  INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Table des évaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id                       SERIAL PRIMARY KEY,
    lesson_id                INT NULL,
    course_id                INT NULL,
    title                    VARCHAR(200) NOT NULL,
    scheduled_date           TIMESTAMP NULL,
    end_date                 TIMESTAMP NULL,
    required_score           DECIMAL(5,2) DEFAULT 50.00,
    eval_type                VARCHAR(50) DEFAULT 'standard',
    time_limit_per_question  INT DEFAULT 0,
    is_final_exam            BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (lesson_id)  REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE CASCADE
);

-- Table des questions
CREATE TABLE IF NOT EXISTS questions (
    id             SERIAL PRIMARY KEY,
    evaluation_id  INT NOT NULL,
    question_text  TEXT NOT NULL,
    type           VARCHAR(20) NOT NULL DEFAULT 'multiple_choice' CHECK (type IN ('multiple_choice', 'single_choice')),
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
);

-- Table des réponses
CREATE TABLE IF NOT EXISTS choices (
    id           SERIAL PRIMARY KEY,
    question_id  INT NOT NULL,
    choice_text  TEXT NOT NULL,
    is_correct   BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Table des inscriptions
CREATE TABLE IF NOT EXISTS enrollments (
    id                  SERIAL PRIMARY KEY,
    student_id          INT NOT NULL,
    course_id           INT NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    enrolled_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE CASCADE
);

-- Table des résultats d'évaluation
CREATE TABLE IF NOT EXISTS results (
    id             SERIAL PRIMARY KEY,
    student_id     INT NOT NULL,
    evaluation_id  INT NOT NULL,
    score          DECIMAL(5,2) NOT NULL,
    passed         BOOLEAN NOT NULL,
    attempted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
);

-- Table des certificats
CREATE TABLE IF NOT EXISTS certificates (
    id         SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    course_id  INT NOT NULL,
    status     VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    issued_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(id) ON DELETE CASCADE
);

-- Table des sessions Live
CREATE TABLE IF NOT EXISTS live_sessions (
    id           SERIAL PRIMARY KEY,
    teacher_id   INT NOT NULL,
    course_id    INT NULL,
    session_code VARCHAR(50) NOT NULL UNIQUE,
    status       VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);
