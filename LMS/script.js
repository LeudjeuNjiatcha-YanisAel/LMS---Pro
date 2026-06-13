document.addEventListener('DOMContentLoaded', () => {
    // 1. Charger les données dynamiques depuis le backend (API)
    loadDashboardData();

    // 2. Animation simple des barres de progression au chargement
    const progressBars = document.querySelectorAll('.progress-bar, .fill');
    
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
            bar.style.width = width;
        }, 100);
    });

    // Interaction de navigation (visuelle)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
});

// Fonction pour récupérer les données du Backend en AJAX
async function loadDashboardData() {
    try {
        const response = await fetch('api.php?action=dashboard');
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log("Données du Backend reçues avec succès :", result.data);
            
            // Exemple : Mettre à jour dynamiquement l'XP de l'utilisateur
            // (Assure-toi d'ajouter un ID ou une classe sur l'élément HTML pour le cibler)
            // document.querySelector('.xp-score').textContent = result.data.user.xp;
        }
    } catch (error) {
        console.error("Erreur de connexion au backend PHP :", error);
    }
}
