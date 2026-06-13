// js/admin.js : Gère le tableau de bord Administrateur

// On attend que la page se charge
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Récupération du nom dans le stockage local
    const adminName = sessionStorage.getItem('userName') || 'Administrateur';
    // On l'affiche dans l'en-tête
    document.getElementById('adminName').textContent = adminName;

    // 2. Gestion de la déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Appel AJAX vers le script de déconnexion
            fetch('api/logout.php')
            .then(res => res.json()) // Lecture de la réponse
            .then(data => {
                sessionStorage.clear(); // Suppression des données de session client
                window.location.href = 'index.html'; // Retour à l'accueil
            });
        });
    }

    // 3. Appel AJAX vers une API (ex: api/admin.php) pour récupérer les stats globales
    // et remplacer les chiffres statiques. (À faire dans une prochaine étape)
});
