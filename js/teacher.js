// js/teacher.js : Logique du dashboard enseignant

document.addEventListener('DOMContentLoaded', function() {

    // ====== 1. AFFICHAGE DU NOM ======
    const teacherName = sessionStorage.getItem('userName') || 'Professeur';
    document.getElementById('teacherName').textContent = teacherName;

    // ====== 2. DECONNEXION ======
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        
        Swal.fire({
            title: 'Déconnexion...',
            text: 'À bientôt !',
            allowOutsideClick: false,
            showConfirmButton: false,
            background: '#1a1d2d',
            color: '#f8fafc',
            didOpen: () => {
                Swal.showLoading();
            }
        });

        setTimeout(() => {
            fetch('api/logout.php').then(r => r.json()).then(() => {
                sessionStorage.clear();
                window.location.href = 'landing.html';
            });
        }, 1200);
    });

    // ====== 3. GESTION GENERIQUE DES MODALES ======
    // Ouvrir une modale par son ID
    function openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    }
    // Fermer une modale par son ID
    function closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    }

    // Tous les boutons avec data-close ferment leur modale
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    // Clic en dehors de la modale = fermer
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });

    // ====== 4. CREER UN COURS ======
    document.getElementById('btnCreateCourse').addEventListener('click', () => openModal('courseModal'));

    document.getElementById('createCourseForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        fd.append('action', 'create');

        fetch('api/courses.php', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                closeModal('courseModal');
                this.reset();
                loadCourses();  // Rafraîchir le tableau
                Swal.fire({ title: 'Succès !', text: 'Cours créé avec succès', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
            } else {
                Swal.fire({ title: 'Erreur', text: data.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
            }
        });
    });

    // ====== 5. CHARGER ET AFFICHER LES COURS ======
    function loadCourses() {
        fetch('api/courses.php?action=list_teacher')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('teacherCoursesList');
            tbody.innerHTML = '';

            if (data.status === 'success' && data.courses.length > 0) {
                // Mise à jour des stats
                document.getElementById('statCourses').textContent = data.courses.length;
                let totalLessons = 0;
                let totalStudents = 0;

                data.courses.forEach(course => {
                    totalLessons += parseInt(course.lesson_count || 0);
                    totalStudents += parseInt(course.student_count || 0);
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight:500;">${course.title}</td>
                        <td style="color:var(--text-muted);">${course.category_name || 'Général'}</td>
                        <td>${course.lesson_count || 0}</td>
                        <td>
                            <button class="btn-action lesson" onclick="openLessons(${course.id}, '${course.title.replace(/'/g, "\\'")}')">+ Leçons & Éval</button>
                            <button class="btn-action delete" onclick="deleteCourse(${course.id})">Supprimer</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                document.getElementById('statLessons').textContent = totalLessons;
                document.getElementById('statStudents').textContent = totalStudents;
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:40px;">
                    <p style="font-size:1.1rem;">Aucun cours pour le moment.</p>
                    <p style="font-size:0.85rem; margin-top:8px;">Cliquez sur "Nouveau Cours" pour commencer !</p>
                </td></tr>`;
            }
        });
    }

    loadCourses();

    // ====== NOUVEAU: GESTION DES ONGLETS ======
    const tabCourses = document.getElementById('tabTeacherCourses');
    const tabResults = document.getElementById('tabTeacherResults');
    const secCourses = document.getElementById('sectionCourses');
    const secResults = document.getElementById('sectionResults');

    tabCourses.addEventListener('click', (e) => {
        e.preventDefault();
        tabCourses.classList.add('active');
        tabResults.classList.remove('active');
        secCourses.classList.remove('hidden');
        secResults.classList.add('hidden');
    });

    tabResults.addEventListener('click', (e) => {
        e.preventDefault();
        tabResults.classList.add('active');
        tabCourses.classList.remove('active');
        secResults.classList.remove('hidden');
        secCourses.classList.add('hidden');
        loadTeacherResults();
    });

    function loadTeacherResults() {
        fetch('api/courses.php?action=get_teacher_results')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('teacherResultsList');
            tbody.innerHTML = '';
            
            if (data.status === 'success' && data.results && data.results.length > 0) {
                data.results.forEach(res => {
                    const tr = document.createElement('tr');
                    
                    let certBadge = `<span style="padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600; background:rgba(255,255,255,0.05); color:var(--text-muted);">${res.cert_status}</span>`;
                    if (res.cert_status === 'pending') {
                        certBadge = `<span style="padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600; background:rgba(245,158,11,0.15); color:#f59e0b;">En attente</span>`;
                    } else if (res.cert_status === 'approved') {
                        certBadge = `<span style="padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600; background:rgba(16,185,129,0.15); color:#10b981;">Approuvé</span>`;
                    } else if (res.cert_status === 'rejected') {
                        certBadge = `<span style="padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600; background:rgba(239,68,68,0.15); color:#ef4444;">Rejeté</span>`;
                    }
                    
                    let progressFormat = parseFloat(res.progress_percentage).toFixed(0) + '%';
                    
                    tr.innerHTML = `
                        <td style="font-weight:500;">${res.first_name} ${res.last_name}</td>
                        <td style="color:var(--text-muted);">${res.course_title}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="flex:1; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                                    <div style="height:100%; width:${progressFormat}; background:var(--primary);"></div>
                                </div>
                                <span style="font-size:0.85rem; font-weight:600;">${progressFormat}</span>
                            </div>
                        </td>
                        <td>${certBadge}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:30px;">Aucun étudiant inscrit pour le moment.</td></tr>`;
            }
        });
    }

    // ====== 6. OUVRIR LA MODALE LEÇONS ======
    window.openLessons = function(courseId, courseTitle) {
        document.getElementById('lesson_course_id').value = courseId;
        document.getElementById('lessonCourseTitle').textContent = 'Cours : ' + courseTitle;
        
        // Charger les leçons existantes pour ce cours
        fetch('api/lessons.php?action=list&course_id=' + courseId)
        .then(r => r.json())
        .then(data => {
            const container = document.getElementById('existingLessons');
            container.innerHTML = '';
            if (data.status === 'success' && data.lessons && data.lessons.length > 0) {
                data.lessons.forEach((lesson, i) => {
                    const titleEscaped = lesson.title.replace(/'/g, "\\'");
                    container.innerHTML += `
                        <div class="lesson-row">
                            <div class="lesson-label">
                                <div class="lesson-num">${i + 1}</div>
                                <span class="lesson-title">${lesson.title}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span class="lesson-type ${lesson.content_type}">${lesson.content_type}</span>
                                <button class="btn-action eval" style="margin:0; padding:4px 8px; font-size:0.7rem;" onclick="openEval(${lesson.id}, '${titleEscaped}')">+ Éval</button>
                            </div>
                        </div>
                    `;
                });
            } else {
                container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:15px;">Aucune leçon ajoutée.</p>';
            }
        });

        openModal('lessonModal');
    };

    // ====== 7. AJOUTER UNE LEÇON ======
    document.getElementById('createLessonForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        fd.append('action', 'create');

        fetch('api/lessons.php', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                // Recharger la liste des leçons dans la modale
                const courseId = document.getElementById('lesson_course_id').value;
                window.openLessons(courseId, document.getElementById('lessonCourseTitle').textContent.replace('Cours : ', ''));
                this.reset();
                document.getElementById('lesson_course_id').value = courseId; // Re-set car reset() vide le hidden
                loadCourses(); // Rafraîchir le compteur de leçons
                Swal.fire({ title: 'Leçon ajoutée', icon: 'success', timer: 1000, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
            } else {
                Swal.fire({ title: 'Erreur', text: data.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
            }
        });
    });

    // ====== 8. OUVRIR LA MODALE EVALUATION ======
    window.openEval = function(lessonId, lessonTitle) {
        // Fermer la modale leçon pour ne pas superposer bêtement
        closeModal('lessonModal');
        
        document.getElementById('eval_lesson_id').value = lessonId;
        document.getElementById('evalCourseTitle').textContent = 'Leçon : ' + lessonTitle;
        
        // Vider les questions existantes et ajouter un bloc vide
        const container = document.getElementById('questionsContainer');
        if (container) {
            container.innerHTML = '';
            questionCount = 0; // Réinitialise la variable globale du HTML
            addQuestionBlock(); // Ajoute une question vide
        }

        openModal('evalModal');
    };

    // ====== 9. CREER UNE EVALUATION ======
    document.getElementById('createEvalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Sérialiser les questions
        const blocks = document.querySelectorAll('.question-block');
        const questionsArray = [];
        blocks.forEach(block => {
            const q = block.querySelector('.q-text').value;
            const c = block.querySelector('.q-correct').value;
            const w1 = block.querySelector('.q-wrong1').value;
            const w2 = block.querySelector('.q-wrong2').value;
            if (q && c && w1) {
                questionsArray.push({ q, c, w1, w2 });
            }
        });
        
        if (questionsArray.length === 0) {
            Swal.fire({ title: 'Erreur', text: 'Ajoutez au moins une question valide.', icon: 'warning', background: '#1a1d2d', color: '#f8fafc' });
            return;
        }
        
        document.getElementById('questions_json').value = JSON.stringify(questionsArray);

        const fd = new FormData(this);
        fd.append('action', 'create');

        fetch('api/evaluations.php', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                closeModal('evalModal');
                this.reset();
                Swal.fire({ title: 'Succès !', text: 'Évaluation créée avec succès', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
            } else {
                Swal.fire({ title: 'Erreur', text: data.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
            }
        });
    });

    // ====== 10. SUPPRIMER UN COURS ======
    window.deleteCourse = function(courseId) {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Ce cours et toutes ses leçons seront supprimés !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#4f46e5',
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler',
            background: '#1a1d2d',
            color: '#f8fafc'
        }).then((result) => {
            if (result.isConfirmed) {
                const fd = new FormData();
                fd.append('action', 'delete');
                fd.append('course_id', courseId);

                fetch('api/courses.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'success') {
                        loadCourses();
                        Swal.fire({ title: 'Supprimé !', icon: 'success', timer: 1000, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
                    }
                    else {
                        Swal.fire({ title: 'Erreur', text: data.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
                    }
                });
            }
        });
    };
});
