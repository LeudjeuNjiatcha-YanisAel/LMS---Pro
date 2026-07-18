// js/register.js : Inscription AJAX (Gère la création de compte sans recharger la page)

// On attend que tout le code HTML soit chargé avant d'exécuter le script
document.addEventListener('DOMContentLoaded', function() {
    // 1. Récupération du formulaire d'inscription via son ID
    const registerForm = document.getElementById('registerForm');
    // Récupération de la zone où afficher les messages d'erreur/succès
    const messageDiv = document.getElementById('registerMessage');
    const roleSelect = document.getElementById('role');
    const studentFields = document.getElementById('studentFields');
    const teacherFields = document.getElementById('teacherFields');
    const matriculeInput = document.getElementById('matricule');
    const filiereInput = document.getElementById('filiere');
    const numeroUniqueInput = document.getElementById('numero_unique');

    if (roleSelect) {
        roleSelect.addEventListener('change', function() {
            if (this.value === 'student') {
                studentFields.classList.remove('hidden');
                teacherFields.classList.add('hidden');
                matriculeInput.required = true;
                filiereInput.required = true;
                numeroUniqueInput.required = false;
            } else {
                studentFields.classList.add('hidden');
                teacherFields.classList.remove('hidden');
                matriculeInput.required = false;
                filiereInput.required = false;
                numeroUniqueInput.required = true;
            }
        });
        
        // Initialiser l'état (par défaut c'est student)
        roleSelect.dispatchEvent(new Event('change'));
    }

    // 2. Vérifier si le formulaire existe sur la page actuelle
    if (registerForm) {
        // 3. On "écoute" le moment où l'utilisateur clique sur "S'inscrire" (submit)
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Empêche la page de se recharger (comportement par défaut)
            
            // 4. On capture automatiquement toutes les données saisies dans le formulaire
            const formData = new FormData(registerForm);

            // 5. On envoie ces données vers notre fichier PHP (Backend) de façon invisible
            fetch('api/register.php', { method: 'POST', body: formData })
            .then(response => response.json()) // On transforme la réponse du serveur en format JSON compréhensible
            .then(data => {
                // 6. Si le PHP nous renvoie "success" (L'inscription a réussi)
                if (data.status === 'success') {
                    // 7. On affiche une jolie alerte de succès avec SweetAlert2
                    Swal.fire({
                        title: 'Inscription réussie !',
                        text: 'Votre compte a été créé avec succès.',
                        icon: 'success',
                        timer: 2000, // Fermeture automatique après 2 secondes
                        showConfirmButton: false,
                        background: '#1a1d2d',
                        color: '#f8fafc',
                    }).then(() => {
                        // 8. Après les 2 secondes, on redirige le nouvel utilisateur vers l'accueil
                        window.location.href = 'index.html';
                    });
                    registerForm.reset(); // On vide les champs du formulaire
                } else {
                    // 9. Si le PHP renvoie une erreur (ex: Email déjà utilisé), on affiche une alerte d'erreur
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
                // 10. Si le serveur PHP est inaccessible (ex: erreur 500 ou pas de réseau)
                messageDiv.classList.remove('hidden');
                messageDiv.className = 'msg-box error';
                messageDiv.textContent = "Erreur serveur critique. Veuillez réessayer.";
            });
        });
    }
});
