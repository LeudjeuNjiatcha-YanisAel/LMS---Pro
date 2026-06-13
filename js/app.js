// js/app.js : Gère la connexion AJAX

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(loginForm);

            fetch('api/auth.php', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    sessionStorage.setItem('userName', data.name || 'Utilisateur');
                    Swal.fire({
                        title: 'Connexion réussie !',
                        text: 'Bienvenue ' + (data.name || ''),
                        icon: 'success',
                        iconColor: '#10b981', // Vert émeraude stylé
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false,
                        background: '#1a1d2d',
                        color: '#f8fafc',
                        customClass: {
                            popup: 'animated tada'
                        },
                        showClass: {
                            popup: 'animate__animated animate__fadeInDown'
                        },
                        hideClass: {
                            popup: 'animate__animated animate__fadeOutUp'
                        }
                    }).then(() => {
                        if (data.role === 'admin') window.location.href = 'admin_dashboard.html';
                        else if (data.role === 'teacher') window.location.href = 'teacher_dashboard.html';
                        else window.location.href = 'student_dashboard.html';
                    });
                } else {
                    Swal.fire({
                        title: 'Erreur',
                        text: data.message,
                        icon: 'error',
                        background: '#1a1d2d',
                        color: '#f8fafc'
                    });
                }
            })
            .catch(error => {
                messageDiv.classList.remove('hidden');
                messageDiv.className = 'msg-box error';
                messageDiv.textContent = "Erreur serveur.";
            });
        });
    }
});
