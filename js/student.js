// js/student.js : Gère le tableau de bord étudiant

document.addEventListener('DOMContentLoaded', function() {
    
    // Afficher le nom de l'étudiant depuis le sessionStorage
    var studentName = sessionStorage.getItem('userName') || 'Étudiant';
    var nameEl = document.getElementById('studentName');
    if(nameEl) nameEl.textContent = studentName;

    // DÉCONNEXION 
    var logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            Swal.fire({
                title: 'Déconnexion...',
                text: 'À bientôt !',
                allowOutsideClick: true,
                showConfirmButton: true,
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

    // NAVIGATION SIDEBAR 
    var tabs = {
        'tabDashboard': 'section-dashboard',
        'tabCourses': 'section-courses',
        'tabExplore': 'section-explore',
        'tabEvals': 'section-evals',
        'tabCerts': 'section-certs',
        'tabLive': 'section-live'
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

        // 5.5 Les barres de recherche sont maintenant intégrées dans chaque section

        // 6. Charger les données dynamiques si besoin
        if(tabId === 'tabExplore') {
            loadAllCourses();
        } else if(tabId === 'tabCourses') {
            loadEnrolledCourses();
        } else if (tabId === 'tabCerts') {
            loadCertificates();
        } else if (tabId === 'tabEvals') {
            loadScheduledEvaluations();
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

    //  GESTION DU MENU MOBILE 
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    if (mobileMenuBtn && sidebar) {
        // Créer l'overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        function toggleMobileMenu() {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        }

        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        overlay.addEventListener('click', toggleMobileMenu);

        // Fermer le menu si on clique sur un lien (sur mobile)
        document.querySelectorAll('.main-nav .nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                }
            });
        });
    }

    //  CHARGEMENT DES COURS (EXPLORER) 
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
                    html += `
                    <div class="explore-card">
                        <span class="explore-tag">${course.category_name || 'Général'}</span>
                        <h3>${course.title}</h3>
                        <p>${course.description || 'Cours disponible sur la plateforme.'}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <span style="color:var(--text-muted); font-size:0.85rem; font-weight:500;">
                                <svg style="width:14px; height:14px; display:inline-block; vertical-align:-2px; margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                ${course.lesson_count || 0} leçons
                            </span>
                        </div>
                        <button class="btn-enroll" onclick="enrollCourse(${course.id})">Rejoindre ce cours</button>
                    </div>`;
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

    //  INSCRIPTION A UN COURS 
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
                    icon: 'info',
                    title: 'Oups',
                    text: data.message,
                    timer: 2000, // Fermeture automatique après 2 secondes
                    timerProgressBar: true,
                    background: '#1a1d2d',
                    color: '#f8fafc',
                    didOpen: () =>{
                        let progressBar = Swal.getTimerProgressBar();
                        progressBar.style.background = 'rgb(65 17 195)';
                    }
                });
            }
        })
        .catch(function(err) {
            Swal.fire('Erreur', 'Impossible de joindre le serveur.', 'error');
        });
    };

    //  CHARGEMENT DES COURS REJOINTS (MES COURS & RÉCENTS) 
    function loadEnrolledCourses() {
        var container = document.getElementById('coursesGrid');
        var recentContainer = document.getElementById('recentCoursesGrid');
        
        if(container) container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">Chargement de vos cours...</div>';
        if(recentContainer) recentContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); grid-column:1/-1;">Chargement...</div>';

        fetch('api/courses.php?action=list_enrolled')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if(data.status === 'success' && data.courses && data.courses.length > 0) {
                var html = '';
                var recentHtml = '';
                var completedCount = 0;
                
                for(var i = 0; i < data.courses.length; i++) {
                    var course = data.courses[i];
                    var progress = parseFloat(course.progress_percentage || 0);
                    
                    if (progress >= 100) completedCount++;

                    var cardHtml = `
                    <div class="course-card-premium" style="position:relative;">
                        <!-- Bouton Quitter -->
                        <button
                            onclick="event.preventDefault(); event.stopPropagation(); leaveCourse(${course.id}, '${course.title.replace(/'/g, "\\'")}')"
                            title="Quitter ce cours"
                            style="position:absolute; top:12px; right:12px; z-index:5; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25); color:#f87171; width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.9rem; transition:all 0.2s;"
                            onmouseenter="this.style.background='rgba(239,68,68,0.25)'"
                            onmouseleave="this.style.background='rgba(239,68,68,0.12)'">
                            <i class="fa-solid fa-right-from-bracket"></i>
                        </button>
                        <a href="course_player.html?id=${course.id}" style="text-decoration:none; color:inherit; display:block;">
                            <div class="card-gradient-bar"></div>
                            <div class="card-body">
                                <span class="course-category">${course.category_name || 'G\u00e9n\u00e9ral'}</span>
                                <h3>${course.title}</h3>
                                <div class="progress-row">
                                    <div class="progress-track">
                                        <div class="progress-fill" style="width:${progress}%;"></div>
                                    </div>
                                    <span class="progress-pct">${progress}%</span>
                                </div>
                                <span class="card-action">Continuer <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
                            </div>
                        </a>
                    </div>`;

                    
                    html += cardHtml;
                    if (i < 3) recentHtml += cardHtml; // 3 cours max pour la section "Récents"
                }
                
                if(container) container.innerHTML = html;
                if(recentContainer) recentContainer.innerHTML = recentHtml;
                
                // Met à jour les stats du dashboard
                var statEvals = document.getElementById('statEvals');
                if(statEvals) statEvals.textContent = completedCount;
                var statCompleted = document.getElementById('statCompleted');
                if(statCompleted) statCompleted.textContent = completedCount;
                // Mise à jour des stats Hero Banner
                var heroCoursesCount = document.getElementById('heroCoursesCount');
                if(heroCoursesCount) heroCoursesCount.textContent = data.courses.length;
                var heroEvalsCount = document.getElementById('heroEvalsCount');
                if(heroEvalsCount) heroEvalsCount.textContent = completedCount;
                
                
            } else {
                var emptyMsg = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); grid-column:1/-1;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><p style="margin-top:15px;">Vous n\'êtes inscrit à aucun cours pour le moment.</p></div>';
                if(container) container.innerHTML = emptyMsg;
                if(recentContainer) recentContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); grid-column:1/-1; padding:20px;">Aucun cours récent. Allez dans Explorer pour commencer !</div>';
            }
        })
        .catch(function(err) {
            if(container) container.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); grid-column:1/-1;">Erreur de chargement.</div>';
            if(recentContainer) recentContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); grid-column:1/-1; padding:20px;">Erreur de chargement.</div>';
        });
    }

    // ===== QUITTER UN COURS =====
    window.leaveCourse = function(courseId, courseTitle) {
        Swal.fire({
            title: 'Quitter ce cours ?',
            html: `Êtes-vous sûr de vouloir quitter <strong>${courseTitle}</strong> ?<br><span style="color:#f87171; font-size:0.9rem;">Votre progression et vos résultats seront supprimés.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#4f46e5',
            confirmButtonText: 'Oui, quitter',
            cancelButtonText: 'Annuler',
            background: '#1a1d2d',
            color: '#f8fafc'
        }).then((result) => {
            if (result.isConfirmed) {
                const fd = new FormData();
                fd.append('action', 'unenroll');
                fd.append('course_id', courseId);

                fetch('api/courses.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'success') {
                        Swal.fire({
                            title: 'Vous avez quitté le cours',
                            icon: 'success',
                            timer: 1500,
                            showConfirmButton: false,
                            background: '#1a1d2d',
                            color: '#f8fafc'
                        }).then(() => {
                            // Recharger les cours
                            loadEnrolledCourses();
                        });
                    } else {
                        Swal.fire({ title: 'Erreur', text: data.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
                    }
                });
            }
        });
    };

    // Les barres de recherche sont intégrées dans les sections Mes Cours et Explorer

    //  CHARGEMENT DES CERTIFICATS 
    window.loadCertificates = function() {
        const container = document.getElementById('certificatesGrid');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); grid-column:1/-1;">Chargement...</div>';

        fetch('api/certificates.php')
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success' && data.certificates && data.certificates.length > 0) {
                let html = '';
                data.certificates.forEach(cert => {
                    let actionHtml = '';
                    let statusLabel = '';
                    
                    if (!cert.cert_id) {
                        statusLabel = `<span style="background:rgba(99,102,241,0.15); color:var(--primary); padding:6px 14px; border-radius:8px; font-size:0.8rem; font-weight:600;">100% (Non demandé)</span>`;
                        actionHtml = `<button onclick="requestCertificate(${cert.course_id})" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer;">Obtenir le certificat</button>`;
                    } else if (cert.cert_status === 'pending') {
                        statusLabel = `<span style="background:rgba(245,158,11,0.15); color:#f59e0b; padding:6px 14px; border-radius:8px; font-size:0.8rem; font-weight:600;">En attente</span>`;
                        actionHtml = `<span style="color:var(--text-muted); font-size:0.85rem;">Validation admin...</span>`;
                    } else if (cert.cert_status === 'approved') {
                        statusLabel = `<span style="background:rgba(16,185,129,0.15); color:#10b981; padding:6px 14px; border-radius:8px; font-size:0.8rem; font-weight:600;">Approuvé</span>`;
                        actionHtml = `
                            <button onclick="window.location.href='certificate.html?course=' + encodeURIComponent('${cert.course_title}')" style="background:transparent; color:var(--primary); border:1px solid var(--primary); padding:6px 12px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px;">
                                Voir
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </button>
                        `;
                    } else if (cert.cert_status === 'rejected') {
                        statusLabel = `<span style="background:rgba(239,68,68,0.15); color:#ef4444; padding:6px 14px; border-radius:8px; font-size:0.8rem; font-weight:600;">Rejeté</span>`;
                        actionHtml = `<span style="color:#ef4444; font-size:0.85rem;">Contactez l'admin</span>`;
                    }

                    html += `
                    <div class="cert-card">
                        <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                            <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, rgba(99,102,241,0.15), rgba(236,72,153,0.15)); display:flex; align-items:center; justify-content:center;">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                            </div>
                            <div>
                                <h4>${cert.course_title}</h4>
                                <p style="font-size:0.75rem; color:var(--text-muted);">${cert.issued_at ? 'Demandé le ' + new Date(cert.issued_at).toLocaleDateString() : 'Terminé à 100%'}</p>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            ${statusLabel}
                            ${actionHtml}
                        </div>
                    </div>`;
                });
                container.innerHTML = html;
                
                // Update stats
                var statCertsCount = document.getElementById('statCertsCount');
                const approvedCount = data.certificates.filter(c => c.cert_status === 'approved').length;
                if(statCertsCount) statCertsCount.textContent = approvedCount;
            } else {
                container.innerHTML = `
                <div style="background:var(--bg-card); border-radius:16px; border:1px dashed rgba(255,255,255,0.1); padding:30px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; min-height:180px; grid-column:1/-1;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                    <p style="color:var(--text-muted); margin-top:15px; font-size:0.9rem;">Terminez des cours à 100% pour débloquer vos certificats.</p>
                </div>`;
            }
        });
    }

    // DEMANDER UN CERTIFICAT 
    window.requestCertificate = function(courseId) {
        Swal.fire({
            title: 'Demander le certificat',
            text: "L'administrateur devra approuver votre demande. Continuer ?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Oui, demander',
            cancelButtonText: 'Annuler',
            background: '#1a1d2d',
            color: '#f8fafc'
        }).then((result) => {
            if (result.isConfirmed) {
                const fd = new FormData();
                fd.append('action', 'request');
                fd.append('course_id', courseId);
                
                fetch('api/certificates.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(res => {
                    if (res.status === 'success') {
                        Swal.fire({ title: 'Envoyé !', text: 'Demande transmise à l\'admin.', icon: 'success', background: '#1a1d2d', color: '#f8fafc' });
                        loadCertificates(); // Recharger la liste
                    } else {
                        Swal.fire({ title: 'Erreur', text: res.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
                    }
                });
            }
        });
    };

    // RECHERCHE DANS LE CATALOGUE
    const searchExplore = document.getElementById('searchExplore');
    if (searchExplore) {
        searchExplore.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('#allCoursesGrid .explore-card');
            cards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const desc = card.querySelector('p').textContent.toLowerCase();
                if (title.includes(query) || desc.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // RECHERCHE DANS MES COURS
    const searchMyCourses = document.getElementById('searchMyCourses');
    if (searchMyCourses) {
        searchMyCourses.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('#coursesGrid a');
            cards.forEach(link => {
                const title = link.querySelector('h3').textContent.toLowerCase();
                if (title.includes(query)) {
                    link.style.display = 'block';
                } else {
                    link.style.display = 'none';
                }
            });
        });
    }

    let studentJitsiApiInstance = null;
    window.joinLiveSession = function() {
        const input = document.getElementById('liveSessionInput').value.trim();
        if (input === '') {
            Swal.fire('Erreur', 'Veuillez entrer un ID de session.', 'error');
            return;
        }
        
        Swal.fire({
            title: 'Connexion...',
            text: 'Recherche de la session...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const fd = new FormData();
        fd.append('action', 'join');
        fd.append('session_code', input);
        
        fetch('api/live.php', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.close();
                document.getElementById('joinLiveFormContainer').style.display = 'none';
                document.getElementById('jitsiContainerStudentWrapper').style.display = 'block';
                
                const container = document.getElementById('jitsiContainerStudent');
                container.innerHTML = '';
                const domain = 'meet.jit.si';
                const options = {
                    roomName: 'LearnHub_' + input,
                    width: '100%',
                    height: '100%',
                    parentNode: container,
                    userInfo: {
                        displayName: studentName
                    },
                    configOverwrite: {
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        requireDisplayName: true
                    },
                    interfaceConfigOverwrite: {
                        SHOW_JITSI_WATERMARK: false
                    }
                };
                studentJitsiApiInstance = new JitsiMeetExternalAPI(domain, options);
            } else {
                Swal.fire('Erreur', data.message, 'error');
            }
        });
    };

    window.leaveLiveSession = function() {
        if (studentJitsiApiInstance) {
            studentJitsiApiInstance.dispose();
            studentJitsiApiInstance = null;
        }
        document.getElementById('jitsiContainerStudent').innerHTML = '';
        document.getElementById('jitsiContainerStudentWrapper').style.display = 'none';
        document.getElementById('joinLiveFormContainer').style.display = 'block';
        document.getElementById('liveSessionInput').value = '';
    };

    window.loadScheduledEvaluations = function() {
        const container = document.getElementById('evalsTableBody');
        if(!container) return;
        
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">Chargement...</td></tr>';
        
        fetch('api/evaluations.php?action=list_scheduled')
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success' && data.evaluations && data.evaluations.length > 0) {
                let html = '';
                let newEvalsCount = 0;
                
                data.evaluations.forEach(ev => {
                    let isAvailable = false;
                    let dateStr = 'À votre rythme';
                    
                    if (ev.scheduled_date) {
                        const evalDate = new Date(ev.scheduled_date);
                        const now = new Date();
                        isAvailable = now >= evalDate;
                        dateStr = evalDate.toLocaleString();
                    } else {
                        isAvailable = true; // Lesson evaluation
                    }
                    
                    if (isAvailable && ev.score === null) newEvalsCount++;
                    
                    let statusHtml = '';
                    let noteHtml = '-';
                    let actionHtml = '';
                    
                    if (ev.score !== null) {
                        statusHtml = ev.passed 
                            ? '<span style="background:rgba(16,185,129,0.15); color:#10b981; padding:4px 8px; border-radius:6px; font-size:0.8rem;">Réussi</span>'
                            : '<span style="background:rgba(239,68,68,0.15); color:#ef4444; padding:4px 8px; border-radius:6px; font-size:0.8rem;">Échoué</span>';
                        noteHtml = `<strong style="color:var(--text-main);">${ev.score}%</strong>`;
                        actionHtml = `<span style="color:var(--text-muted); font-size:0.85rem;">Terminé</span>`;
                    } else {
                        statusHtml = '<span style="background:rgba(245,158,11,0.15); color:#f59e0b; padding:4px 8px; border-radius:6px; font-size:0.8rem;">En attente</span>';
                        actionHtml = isAvailable 
                            ? `<button class="btn-action" style="background:var(--primary); color:white; padding:6px 12px; border:none; border-radius:8px; cursor:pointer;" onclick="window.location.href='course_player.html?id=${ev.course_id}&eval=${ev.id}'">Participer</button>` 
                            : `<span style="color:var(--text-muted); font-size:0.85rem;">À venir</span>`;
                    }

                    html += `
                    <tr>
                        <td>
                            <div style="font-weight:600; color:var(--text-main);">${ev.title}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${dateStr}</div>
                        </td>
                        <td>${ev.course_title}</td>
                        <td>${statusHtml}</td>
                        <td>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span>${noteHtml}</span>
                                ${actionHtml}
                            </div>
                        </td>
                    </tr>`;
                });
                container.innerHTML = html;
                
                // Update Badge
                const badge = document.getElementById('evalNotificationBadge');
                if(badge) {
                    if(newEvalsCount > 0) {
                        badge.textContent = newEvalsCount;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            } else {
                container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">Aucune évaluation programmée.</td></tr>';
            }
        });
    };

    // Charger initialement le dashboard
    loadEnrolledCourses();
    loadCertificates(); // To pre-load the count
    loadScheduledEvaluations(); // Initial load for badge
});
