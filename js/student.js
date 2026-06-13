// js/student.js : Gère le tableau de bord étudiant

document.addEventListener('DOMContentLoaded', function() {
    
    // Afficher le nom de l'étudiant depuis le sessionStorage
    var studentName = sessionStorage.getItem('userName') || 'Étudiant';
    var nameEl = document.getElementById('studentName');
    if(nameEl) nameEl.textContent = studentName;

    // ========== DÉCONNEXION ==========
    var logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            Swal.fire({
                title: 'Déconnexion...',
                text: 'À bientôt !',
                allowOutsideClick: false,
                showConfirmButton: false,
                background: '#1a1d2d',
                color: '#f8fafc',
                didOpen: function() {
                    Swal.showLoading();
                }
            });

            setTimeout(function() {
                fetch('api/logout.php')
                .then(function(res) { return res.json(); })
                .then(function() {
                    sessionStorage.clear();
                    window.location.href = 'landing.html';
                })
                .catch(function() {
                    sessionStorage.clear();
                    window.location.href = 'landing.html';
                });
            }, 1200);
        });
    }

    // ========== NAVIGATION SIDEBAR ==========
    var tabs = {
        'tabDashboard': 'section-dashboard',
        'tabCourses': 'section-courses',
        'tabExplore': 'section-explore',
        'tabEvals': 'section-evals',
        'tabCerts': 'section-certs'
    };

    // Fonction pour changer de section
    function switchSection(tabId) {
        // 1. Retirer la classe active de tous les onglets
        var allNavItems = document.querySelectorAll('.nav-item');
        for(var i = 0; i < allNavItems.length; i++) {
            allNavItems[i].classList.remove('active');
        }
        
        // 2. Activer l'onglet cliqué
        var clickedTab = document.getElementById(tabId);
        if(clickedTab) clickedTab.classList.add('active');

        // 3. Cacher toutes les sections
        var allSections = document.querySelectorAll('.page-section');
        for(var j = 0; j < allSections.length; j++) {
            allSections[j].classList.add('hidden');
        }

        // 4. Afficher la section correspondante
        var targetSectionId = tabs[tabId];
        if(targetSectionId) {
            var targetSection = document.getElementById(targetSectionId);
            if(targetSection) {
                targetSection.classList.remove('hidden');
            }
        }

        // 5. Mettre à jour le titre
        var pageTitle = document.getElementById('pageTitle');
        if(pageTitle && clickedTab) {
            pageTitle.textContent = clickedTab.textContent.trim();
        }

        // 6. Charger les données dynamiques si besoin
        if(tabId === 'tabExplore') {
            loadAllCourses();
        } else if(tabId === 'tabCourses') {
            loadEnrolledCourses();
        }
    }

    // Attacher les événements de clic à chaque onglet de la sidebar
    var tabIds = Object.keys(tabs);
    for(var k = 0; k < tabIds.length; k++) {
        (function(id) {
            var tabElement = document.getElementById(id);
            if(tabElement) {
                tabElement.addEventListener('click', function(e) {
                    e.preventDefault();
                    switchSection(id);
                });
            }
        })(tabIds[k]);
    }

    // ========== CHARGEMENT DES COURS (EXPLORER) ==========
    function loadAllCourses() {
        var container = document.getElementById('allCoursesGrid');
        if(!container) return;

        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">Chargement des cours...</div>';

        fetch('api/courses.php?action=list_all')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if(data.status === 'success' && data.courses && data.courses.length > 0) {
                var html = '';
                for(var i = 0; i < data.courses.length; i++) {
                    var course = data.courses[i];
                    html += '<div style="background:var(--bg-card); border-radius:16px; border:1px solid var(--border-color); overflow:hidden; transition:transform 0.3s, box-shadow 0.3s;">';
                    html += '<div style="height:120px; background:linear-gradient(135deg, var(--primary), var(--accent-1));"></div>';
                    html += '<div style="padding:20px;">';
                    html += '<span style="background:rgba(99,102,241,0.1); color:var(--primary); padding:4px 10px; border-radius:6px; font-size:0.75rem; font-weight:600;">' + (course.category_name || 'Général') + '</span>';
                    html += '<h3 style="margin:10px 0; font-size:1.1rem;">' + course.title + '</h3>';
                    html += '<p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:15px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">' + (course.description || 'Cours disponible sur la plateforme.') + '</p>';
                    html += '<div style="display:flex; justify-content:space-between; align-items:center;">';
                    html += '<span style="color:var(--text-muted); font-size:0.8rem;">' + (course.lesson_count || 0) + ' leçons</span>';
                    html += '<button style="background:linear-gradient(135deg, var(--primary), var(--primary-hover)); color:white; border:none; padding:8px 18px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;" onclick="enrollCourse(' + course.id + ')">Rejoindre</button>';
                    html += '</div></div></div>';
                }
                container.innerHTML = html;
            } else {
                container.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); grid-column:1/-1;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><p style="margin-top:15px;">Aucun cours disponible pour le moment.</p></div>';
            }
        })
        .catch(function(err) {
            container.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); grid-column:1/-1;">Impossible de charger les cours.</div>';
        });
    }

    // ========== INSCRIPTION A UN COURS ==========
    window.enrollCourse = function(courseId) {
        Swal.fire({
            title: 'Inscription en cours...',
            allowOutsideClick: false,
            background: '#1a1d2d', color: '#f8fafc',
            didOpen: function() { Swal.showLoading(); }
        });

        var formData = new FormData();
        formData.append('action', 'enroll');
        formData.append('course_id', courseId);

        fetch('api/courses.php', {
            method: 'POST',
            body: formData
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if(data.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Inscrit !',
                    text: 'Vous avez rejoint ce cours.',
                    background: '#1a1d2d', color: '#f8fafc'
                }).then(function() {
                    // Rediriger vers l'onglet Mes Cours
                    switchSection('tabCourses');
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erreur',
                    text: data.message,
                    background: '#1a1d2d', color: '#f8fafc'
                });
            }
        })
        .catch(function(err) {
            Swal.fire('Erreur', 'Impossible de joindre le serveur.', 'error');
        });
    };

    // ========== CHARGEMENT DES COURS REJOINTS (MES COURS) ==========
    function loadEnrolledCourses() {
        var container = document.getElementById('coursesGrid');
        if(!container) return;

        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">Chargement de vos cours...</div>';

        fetch('api/courses.php?action=list_enrolled')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if(data.status === 'success' && data.courses && data.courses.length > 0) {
                var html = '';
                for(var i = 0; i < data.courses.length; i++) {
                    var course = data.courses[i];
                    var progress = parseFloat(course.progress_percentage || 0);
                    
                    html += '<a href="course_player.html?id=' + course.id + '" style="text-decoration: none; color: inherit;">';
                    html += '<div class="course-card" style="background:var(--bg-card); border-radius:20px; border:1px solid var(--border-color); overflow:hidden; transition:transform 0.3s ease, box-shadow 0.3s ease; display:flex; flex-direction:column; height:100%;">';
                    html += '<div style="height:140px; background:linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); position:relative;"></div>';
                    html += '<div style="padding:1.5rem; flex:1; display:flex; flex-direction:column;">';
                    html += '<span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--primary); font-weight:700; margin-bottom:0.5rem;">' + (course.category_name || 'Général') + '</span>';
                    html += '<h3 style="font-size:1.15rem; margin-bottom:1rem; line-height:1.3;">' + course.title + '</h3>';
                    html += '<div style="margin-top:auto;">';
                    html += '<div style="display:flex; align-items:center; gap:0.75rem;">';
                    html += '<div style="height:6px; flex:1; background-color:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">';
                    html += '<div style="height:100%; background-color:var(--primary); width:' + progress + '%;"></div>';
                    html += '</div>';
                    html += '<span style="font-size:0.85rem; color:var(--text-muted);">' + progress + '%</span>';
                    html += '</div></div></div></div></a>';
                }
                container.innerHTML = html;
            } else {
                container.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); grid-column:1/-1;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><p style="margin-top:15px;">Vous n\'êtes inscrit à aucun cours pour le moment.</p></div>';
            }
        })
        .catch(function(err) {
            container.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); grid-column:1/-1;">Erreur de chargement.</div>';
        });
    }

    // Charger initialement le dashboard
    loadEnrolledCourses();
});
