// js/app.js : Gère la connexion AJAX

// js/app.js : Gère la connexion AJAX (Sans rechargement de page)

// On attend le chargement complet du document HTML
document.addEventListener('DOMContentLoaded', function() {
    // 1. Récupération du formulaire de connexion
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    // 2. On s'assure qu'on est bien sur la page de connexion
    if (loginForm) {
        // 3. Événement déclenché quand l'utilisateur clique sur "Se connecter"
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault(); // On bloque le rechargement de la page
            
            // 4. On encapsule les champs (email, mot de passe) dans un objet FormData
            const formData = new FormData(loginForm);

            // 5. Envoi des données vers le script de vérification côté serveur
            fetch('api/auth.php', { method: 'POST', body: formData })
            .then(response => response.json()) // Conversion de la réponse texte en objet JavaScript (JSON)
            .then(data => {
                // 6. Si les identifiants sont corrects
                if (data.status === 'success') {
                    // On sauvegarde le prénom de l'utilisateur dans le navigateur (Session)
                    sessionStorage.setItem('userName', data.name || 'Utilisateur');
                    
                    // 7. Affichage d'une notification visuelle impressionnante avec SweetAlert2
                    Swal.fire({
                        title: 'Connexion réussie !',
                        text: 'Bienvenue ' + (data.name?.toUpperCase() || ''),
                        icon: 'success',
                        iconColor: '#10b981', // Vert émeraude stylé
                        timer: 2000, // Durée d'affichage
                        timerProgressBar: true,
                        showConfirmButton: false,
                        background: '#1a1d2d',
                        color: '#f8fafc',
                        didOpen: () =>{
                            let progressBar = Swal.getTimerProgressBar();
                            progressBar.style.background = '#0FE8A0';
                            const popup = Swal.getPopup();
                            popup.style.fontFamily = "'Outfit',sans-serif"
                        },
                        customClass: { popup: 'animated tada' },
                        showClass: { popup: 'animate__animated animate__fadeInDown' },
                        hideClass: { popup: 'animate__animated animate__fadeOutUp' }

                    }).then(() => {
                        //  8. REDIRECTION INTELLIGENTE :
                        // Selon le rôle retourné par la BDD, on redirige vers le bon tableau de bord
                        if (data.role === 'admin') 
                            window.location.href = 'admin_dashboard.html';
                        else if (data.role === 'teacher') 
                            window.location.href = 'teacher_dashboard.html';
                        else 
                            window.location.href = 'student_dashboard.html';
                    });
                } else {
                    // 9. Si le mot de passe est faux ou l'email inconnu
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
                // 10. Gestion des erreurs critiques (serveur hors ligne, erreur PHP)
                console.error("Erreur détaillée :", error);
                messageDiv.classList.remove('hidden');
                messageDiv.className = 'msg-box error';
                messageDiv.innerHTML = "Erreur de communication avec le serveur.<br><small>(Vérifiez que vous utilisez un serveur local comme XAMPP et non file://)</small>";
            });
        });
    }
});
