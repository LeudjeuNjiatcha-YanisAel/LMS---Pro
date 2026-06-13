// js/course_player.js : Gère l'affichage du contenu (PDF/Vidéo) et le QCM de validation

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Éléments de l'interface
    const mediaViewer = document.getElementById('mediaViewer');
    const evaluationSection = document.getElementById('evaluationSection');
    const courseTitle = document.getElementById('courseTitle');
    
    // 2. Récupérer l'ID du cours depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');

    if (!courseId) {
        courseTitle.textContent = "Erreur : Aucun cours sélectionné";
        mediaViewer.innerHTML = "<p style='color:red;'>ID du cours introuvable.</p>";
        return;
    }

    // 3. Charger le cours depuis l'API
    fetch(`api/courses.php?action=get_course_content&course_id=${courseId}`)
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            courseTitle.textContent = data.course_title;

            if (data.lesson) {
                const lesson = data.lesson;
                
                // 4. Injection du lecteur selon le format (Vidéo ou PDF)
                if (lesson.content_type === 'video') {
                    // Convertir intelligemment l'URL pour la rendre compatible iframe (YouTube & Vimeo)
                    let url = lesson.content_url;
                    if(url.includes("watch?v=")) {
                        url = url.replace("watch?v=", "embed/");
                        url = url.split('&')[0]; // Enlever les paramètres supplémentaires
                    } else if (url.includes("youtu.be/")) {
                        url = url.replace("youtu.be/", "youtube.com/embed/");
                        url = url.split('?')[0];
                    } else if (url.includes("vimeo.com/")) {
                        let vimeoId = url.split("vimeo.com/")[1];
                        url = "https://player.vimeo.com/video/" + vimeoId;
                    }
                    
                    mediaViewer.innerHTML = `<iframe src="${url}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" style="width:100%; height:100%; border:none; border-radius:12px;"></iframe>`;
                } else if (lesson.content_type === 'pdf') {
                    mediaViewer.innerHTML = `<iframe src="${lesson.content_url}#toolbar=0" type="application/pdf" style="width:100%; height:100%; border:none; border-radius:12px;"></iframe>`;
                }

                // 5. Simuler le fait que l'étudiant a fini de lire/regarder
                setTimeout(() => {
                    // Affiche la section d'évaluation
                    evaluationSection.classList.remove('hidden');
                    
                    // Pour simplifier on garde la question en dur
                    document.getElementById('evalQuestionText').textContent = "Avez-vous bien compris cette leçon ?";
                    const optionsContainer = document.getElementById('evalOptionsContainer');
                    
                    const options = ["Oui, parfaitement", "Non, je dois relire", "Je n'ai rien compris"];
                    options.forEach((opt, index) => {
                        const div = document.createElement('div');
                        div.className = 'eval-option';
                        div.innerHTML = `
                            <input type="radio" name="answer" id="opt${index}" value="${opt}" required>
                            <label for="opt${index}" style="width:100%; cursor:pointer;">${opt}</label>
                        `;
                        div.addEventListener('click', () => {
                            document.getElementById(`opt${index}`).checked = true;
                        });
                        optionsContainer.appendChild(div);
                    });
                }, 2000);

            } else {
                mediaViewer.innerHTML = "<p style='color:var(--text-muted);'>L'enseignant n'a pas encore ajouté de leçon à ce cours.</p>";
            }
        } else {
            courseTitle.textContent = "Erreur de chargement";
            mediaViewer.innerHTML = `<p style='color:red;'>${data.message}</p>`;
        }
    })
    .catch(err => {
        courseTitle.textContent = "Erreur réseau";
        mediaViewer.innerHTML = "<p style='color:red;'>Impossible de contacter le serveur.</p>";
    });

    // 6. Soumission de l'évaluation
    const evalForm = document.getElementById('evaluationForm');
    if (evalForm) {
        evalForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Empêche le rechargement

            const selectedOption = document.querySelector('input[name="answer"]:checked');
            if (!selectedOption) return;
            
            const selectedAnswer = selectedOption.value;
            
            // Simuler la validation
            if (selectedAnswer === "Oui, parfaitement") {
                // Marquer la progression (simulé ici par un appel API factice, ou on peut laisser le frontend gérer pour la démo)
                Swal.fire({
                    title: 'Félicitations !',
                    text: 'Leçon validée. Vous avez terminé ce cours à 100% !',
                    icon: 'success',
                    confirmButtonText: 'Obtenir mon Certificat',
                    confirmButtonColor: '#10b981',
                    background: '#1a1d2d',
                    color: '#f8fafc',
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = "certificate.html"; // Redirection vers le certificat
                    }
                });
            } else {
                Swal.fire({
                    title: 'Oups...',
                    text: 'Prenez le temps de revoir le cours.',
                    icon: 'info',
                    confirmButtonText: 'Revoir le cours',
                    background: '#1a1d2d',
                    color: '#f8fafc'
                });
            }
        });
    }
});
