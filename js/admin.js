document.addEventListener('DOMContentLoaded', function() {
    // Déconnexion Admin
    const logoutBtn = document.getElementById('logoutBtnAdmin');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('api/logout.php').then(() => {
                sessionStorage.clear();
                window.location.href = 'landing.html';
            });
        });
    }

    const navDashboard = document.getElementById('navDashboard');
    const navUsers = document.getElementById('navUsers');
    const navModules = document.getElementById('navModules');
    const navCategories = document.getElementById('navCategories');
    const secDashboard = document.getElementById('sectionDashboard');
    const secUsers = document.getElementById('sectionUsers');
    const secModules = document.getElementById('sectionModules');
    const secCategories = document.getElementById('sectionCategories');

    function hideAllSections() {
        secDashboard.classList.add('hidden');
        secUsers.classList.add('hidden');
        secModules.classList.add('hidden');
        secCategories.classList.add('hidden');
        navDashboard.classList.remove('active');
        navUsers.classList.remove('active');
        navModules.classList.remove('active');
        navCategories.classList.remove('active');
    }

    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSections();
        secDashboard.classList.remove('hidden');
        navDashboard.classList.add('active');
        loadDashboard();
    });

    navUsers.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSections();
        secUsers.classList.remove('hidden');
        navUsers.classList.add('active');
        loadUsers();
    });

    navModules.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSections();
        secModules.classList.remove('hidden');
        navModules.classList.add('active');
        loadModules();
    });

    navCategories.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllSections();
        secCategories.classList.remove('hidden');
        navCategories.classList.add('active');
        loadCategories();
    });

    loadDashboard(); // Charge par défaut

    //  GESTION DU MENU MOBILE 
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    if (mobileMenuBtn && sidebar) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        function toggleMobileMenu() {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        }

        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        overlay.addEventListener('click', toggleMobileMenu);

        document.querySelectorAll('.main-nav .nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                }
            });
        });
    }

    //  CHARGEMENT DASHBOARD 
    function loadDashboard() {
        fetch('api/admin.php?action=dashboard_stats')
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                document.getElementById('statStudents').textContent = data.stats.students || 0;
                document.getElementById('statTeachers').textContent = data.stats.teachers || 0;
                document.getElementById('statCourses').textContent = data.stats.courses || 0;
                document.getElementById('statCertsPending').textContent = data.stats.certs_pending || 0;

                // 1. Remplir le tableau des certificats en attente
                const tbodyCerts = document.getElementById('pendingCertsList');
                tbodyCerts.innerHTML = '';

                if (data.pending_requests && data.pending_requests.length > 0) {
                    data.pending_requests.forEach(req => {
                        const date = new Date(req.issued_at).toLocaleDateString('fr-FR');
                        tbodyCerts.innerHTML += `
                            <tr>
                                <td>${req.first_name} ${req.last_name}</td>
                                <td style="color:var(--text-muted);">${req.course_title}</td>
                                <td>${date}</td>
                                <td style="display:flex; gap:10px;">
                                    <button onclick="approveCert(${req.id})" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.8rem;">Approuver</button>
                                    <button onclick="rejectCert(${req.id})" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.8rem;">Rejeter</button>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                    tbodyCerts.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">Aucune demande en attente.</td></tr>`;
                }

                // 2. Remplir le tableau de progression des modules
                const tbodyModulesProg = document.getElementById('modulesProgressList');
                tbodyModulesProg.innerHTML = '';
                if (data.modules_progress && data.modules_progress.length > 0) {
                    data.modules_progress.forEach(mod => {
                        let progFormat = parseFloat(mod.avg_progress).toFixed(0) + '%';
                        tbodyModulesProg.innerHTML += `
                            <tr>
                                <td style="font-weight:500;">${mod.title}</td>
                                <td style="color:var(--text-muted);">${mod.first_name} ${mod.last_name}</td>
                                <td>${mod.student_count}</td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="flex:1; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                                            <div style="height:100%; width:${progFormat}; background:var(--primary);"></div>
                                        </div>
                                        <span style="font-size:0.85rem; font-weight:600;">${progFormat}</span>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                } else {
                    tbodyModulesProg.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">Aucun module trouvé.</td></tr>`;
                }
            } else {
                if (data.message.includes('Accès refusé')) setTimeout(() => window.location.href = 'login.html', 2000);
            }
        });
    }

    //  CHARGEMENT UTILISATEURS 
    function loadUsers() {
        fetch('api/admin.php?action=get_users')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('usersList');
            tbody.innerHTML = '';
            if (data.status === 'success' && data.users.length > 0) {
                data.users.forEach(u => {
                    let roleSelect = `
                        <select onchange="changeUserRole(${u.id}, this.value)" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.1); padding:4px 8px; border-radius:6px; font-family:'Outfit',sans-serif; outline:none;">
                            <option value="student" ${u.role === 'student' ? 'selected' : ''}>Étudiant</option>
                            <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Enseignant</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    `;
                    const date = new Date(u.created_at).toLocaleDateString('fr-FR');
                    tbody.innerHTML += `
                        <tr>
                            <td style="font-weight:500;">${u.first_name} ${u.last_name}</td>
                            <td style="color:var(--text-muted);">${u.email}</td>
                            <td>${roleSelect}</td>
                            <td>${date}</td>
                            <td>
                                <button onclick="deleteUser(${u.id})" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.8rem;">Supprimer</button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">Aucun utilisateur.</td></tr>`;
            }
        });
    }

    //  CHARGEMENT MODULES 
    function loadModules() {
        fetch('api/admin.php?action=get_modules')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('modulesList');
            tbody.innerHTML = '';
            if (data.status === 'success' && data.modules.length > 0) {
                data.modules.forEach(m => {
                    const date = new Date(m.created_at).toLocaleDateString('fr-FR');
                    tbody.innerHTML += `
                        <tr>
                            <td style="font-weight:500;">${m.title}</td>
                            <td style="color:var(--text-muted);">${m.category_name || 'Général'}</td>
                            <td>${m.first_name} ${m.last_name}</td>
                            <td>
                                <button onclick="deleteModule(${m.id})" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.8rem;">Supprimer</button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">Aucun cours créé.</td></tr>`;
            }
        });
    }

    //  CHARGEMENT CATEGORIES 
    function loadCategories() {
        fetch('api/admin.php?action=get_categories')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('categoriesList');
            tbody.innerHTML = '';
            if (data.status === 'success' && data.categories.length > 0) {
                data.categories.forEach(c => {
                    tbody.innerHTML += `
                        <tr>
                            <td style="color:var(--text-muted); font-weight:600;">#${c.id}</td>
                            <td style="font-weight:500;">${c.name}</td>
                            <td style="text-align:right;">
                                <button onclick="deleteCategory(${c.id})" style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.8rem; transition:0.2s;">
                                    Supprimer
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-muted);">Aucune catégorie.</td></tr>`;
            }
        });
    }

    //  ACTIONS SUR CERTIFICATS 
    window.approveCert = function(id) { processAction(id, 'approve_cert', 'approuver ce certificat', loadDashboard); };
    window.rejectCert = function(id) { processAction(id, 'reject_cert', 'rejeter ce certificat', loadDashboard); };

    //  ACTIONS SUR UTILISATEURS / MODULES / CATEGORIES 
    window.deleteUser = function(id) { processAction(id, 'delete_user', 'supprimer cet utilisateur', loadUsers); };
    window.deleteModule = function(id) { processAction(id, 'delete_module', 'supprimer ce module', loadModules); };
    window.deleteCategory = function(id) { processAction(id, 'delete_category', 'supprimer cette catégorie', loadCategories); };

    window.changeUserRole = function(userId, newRole) {
        const fd = new FormData();
        fd.append('action', 'change_role');
        fd.append('user_id', userId);
        fd.append('role', newRole);
        
        fetch('api/admin.php', { method: 'POST', body: fd })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({ title: 'Rôle modifié !', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
            } else {
                Swal.fire('Erreur', res.message, 'error');
                loadUsers(); // Reset UI
            }
        });
    };

    window.addCategory = function() {
        Swal.fire({
            title: 'Nouvelle catégorie',
            input: 'text',
            inputPlaceholder: 'Nom de la catégorie (ex: Informatique)',
            showCancelButton: true,
            confirmButtonText: 'Ajouter',
            cancelButtonText: 'Annuler',
            background: '#1a1d2d',
            color: '#f8fafc',
            inputValidator: (value) => {
                if (!value) return 'Veuillez saisir un nom';
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const fd = new FormData();
                fd.append('action', 'add_category');
                fd.append('name', result.value);
                
                fetch('api/admin.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(res => {
                    if (res.status === 'success') {
                        Swal.fire({ title: 'Ajoutée !', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
                        loadCategories();
                    } else {
                        Swal.fire('Erreur', res.message, 'error');
                    }
                });
            }
        });
    };

    window.createUser = function() {
        Swal.fire({
            title: 'Nouvel Utilisateur',
            html: `
                <input type="text" id="swal-fn" class="swal2-input" placeholder="Prénom" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                <input type="text" id="swal-ln" class="swal2-input" placeholder="Nom" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                <input type="email" id="swal-em" class="swal2-input" placeholder="Email" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                <input type="password" id="swal-pw" class="swal2-input" placeholder="Mot de passe" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                <select id="swal-role" class="swal2-input" style="background:rgba(0,0,0,0.2); color:#fff; border:1px solid rgba(255,255,255,0.1);">
                    <option value="student">Étudiant</option>
                    <option value="teacher">Enseignant</option>
                    <option value="admin">Administrateur</option>
                </select>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Créer',
            cancelButtonText: 'Annuler',
            background: '#1a1d2d',
            color: '#f8fafc',
            preConfirm: () => {
                const fn = document.getElementById('swal-fn').value;
                const ln = document.getElementById('swal-ln').value;
                const em = document.getElementById('swal-em').value;
                const pw = document.getElementById('swal-pw').value;
                const role = document.getElementById('swal-role').value;
                if (!fn || !ln || !em || !pw) {
                    Swal.showValidationMessage(`Tous les champs sont requis.`);
                }
                return { fn: fn, ln: ln, em: em, pw: pw, role: role };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const fd = new FormData();
                fd.append('action', 'add_user');
                fd.append('first_name', result.value.fn);
                fd.append('last_name', result.value.ln);
                fd.append('email', result.value.em);
                fd.append('password', result.value.pw);
                fd.append('role', result.value.role);
                
                fetch('api/admin.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(res => {
                    if (res.status === 'success') {
                        Swal.fire({ title: 'Utilisateur créé !', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
                        loadUsers(); // Recharger la liste
                    } else {
                        Swal.fire('Erreur', res.message, 'error');
                    }
                });
            }
        });
    };

    function processAction(id, action, actionName, callback) {
        let payloadKey = action.includes('cert') ? 'cert_id' : (action === 'delete_user' ? 'user_id' : (action === 'delete_category' ? 'category_id' : 'module_id'));
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: `Voulez-vous vraiment ${actionName} ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui',
            cancelButtonText: 'Annuler',
            background: '#1a1d2d',
            color: '#f8fafc'
        }).then((result) => {
            if (result.isConfirmed) {
                const fd = new FormData();
                fd.append('action', action);
                fd.append(payloadKey, id);
                
                fetch('api/admin.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(res => {
                    if (res.status === 'success') {
                        Swal.fire({ title: 'Succès !', text: res.message, icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
                        callback();
                    } else {
                        Swal.fire({ title: 'Erreur', text: res.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
                    }
                });
            }
        });
    }
});
