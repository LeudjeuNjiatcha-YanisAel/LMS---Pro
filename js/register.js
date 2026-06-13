// js/register.js : Inscription AJAX

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('registerMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(registerForm);

            fetch('api/register.php', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    Swal.fire({
                        title: 'Inscription réussie !',
                        text: 'Votre compte a été créé avec succès.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#1a1d2d',
                        color: '#f8fafc'
                    }).then(() => {
                        window.location.href = 'index.html';
                    });
                    registerForm.reset();
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
