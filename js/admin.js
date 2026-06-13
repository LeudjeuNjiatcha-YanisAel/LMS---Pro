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

    loadDashboard();

    function loadDashboard() {
        fetch('api/admin.php?action=dashboard_stats')
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                document.getElementById('statStudents').textContent = data.stats.students || 0;
                document.getElementById('statTeachers').textContent = data.stats.teachers || 0;
                document.getElementById('statCourses').textContent = data.stats.courses || 0;
                document.getElementById('statCertsPending').textContent = data.stats.certs_pending || 0;

                const tbody = document.getElementById('pendingCertsList');
                tbody.innerHTML = '';

                if (data.pending_requests && data.pending_requests.length > 0) {
                    data.pending_requests.forEach(req => {
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                        
                        const date = new Date(req.issued_at).toLocaleDateString('fr-FR');
                        
                        tr.innerHTML = `
                            <td style="padding:15px; font-weight:500;">${req.first_name} ${req.last_name}</td>
                            <td style="padding:15px; color:var(--text-muted);">${req.course_title}</td>
                            <td style="padding:15px;">${date}</td>
                            <td style="padding:15px; display:flex; gap:10px;">
                                <button onclick="approveCert(${req.id})" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.8rem;">Approuver</button>
                                <button onclick="rejectCert(${req.id})" style="background:transparent; color:#ef4444; border:1px solid #ef4444; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.8rem;">Rejeter</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">Aucune demande en attente.</td></tr>`;
                }
            } else {
                Swal.fire({ title: 'Erreur', text: data.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
                // Si non autorisé, retour au login
                if (data.message.includes('Accès refusé')) {
                    setTimeout(() => window.location.href = 'login.html', 2000);
                }
            }
        })
        .catch(err => {
            console.error(err);
            Swal.fire({ title: 'Erreur réseau', text: 'Impossible de contacter le serveur.', icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
        });
    }

    window.approveCert = function(id) {
        processCert(id, 'approve_cert', 'approuver');
    };

    window.rejectCert = function(id) {
        processCert(id, 'reject_cert', 'rejeter');
    };

    function processCert(id, action, actionName) {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: `Voulez-vous vraiment ${actionName} ce certificat ?`,
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
                fd.append('cert_id', id);
                
                fetch('api/admin.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(res => {
                    if (res.status === 'success') {
                        Swal.fire({ title: 'Succès !', text: res.message, icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1d2d', color: '#f8fafc' });
                        loadDashboard(); // Recharger
                    } else {
                        Swal.fire({ title: 'Erreur', text: res.message, icon: 'error', background: '#1a1d2d', color: '#f8fafc' });
                    }
                });
            }
        });
    }
});
