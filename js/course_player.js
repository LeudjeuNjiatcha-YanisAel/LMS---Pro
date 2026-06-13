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

                // 5. Charger l'évaluation de cette leçon
                setTimeout(() => {
                    fetch('api/evaluations.php?action=get_evaluation&lesson_id=' + lesson.id)
                    .then(res => res.json())
                    .then(evalResponse => {
                        if (evalResponse.status === 'success' && evalResponse.evaluation) {
                            const evalData = evalResponse.evaluation;
                            window.currentEvalData = evalData;
                            
                            evaluationSection.classList.remove('hidden');
                            document.getElementById('evalTitleHeader').textContent = evalData.title;
                            document.getElementById('evalDesc').textContent = `Répondez aux questions pour valider cette leçon. Score requis : ${evalData.required_score}%`;
                            
                            const quizContainer = document.getElementById('quizContainer');
                            if(quizContainer) quizContainer.innerHTML = '';
                            
                            evalData.questions.forEach((q, index) => {
                                let block = document.createElement('div');
                                block.style.marginBottom = '25px';
                                block.style.padding = '15px';
                                block.style.background = 'rgba(255,255,255,0.02)';
                                block.style.borderRadius = '10px';
                                block.style.border = '1px solid var(--border-color)';

                                let qTitle = document.createElement('div');
                                qTitle.className = 'eval-question';
                                qTitle.style.marginBottom = '15px';
                                qTitle.textContent = `${index + 1}. ${q.question_text}`;
                                block.appendChild(qTitle);

                                let optionsDiv = document.createElement('div');
                                optionsDiv.className = 'eval-options';

                                q.choices.forEach(choice => {
                                    let label = document.createElement('label');
                                    label.className = 'eval-option';
                                    label.innerHTML = `
                                        <input type="radio" name="question_${q.id}" value="${choice.is_correct}">
                                        <span>${choice.choice_text}</span>
                                    `;
                                    optionsDiv.appendChild(label);
                                });

                                block.appendChild(optionsDiv);
                                if(quizContainer) quizContainer.appendChild(block);
                            });
                        } else {
                            // Pas d'évaluation
                            evaluationSection.classList.remove('hidden');
                            document.getElementById('evalTitleHeader').textContent = "Fin de la leçon";
                            document.getElementById('evalDesc').textContent = "Il n'y a pas d'évaluation pour cette leçon.";
                            
                            const quizContainer = document.getElementById('quizContainer');
                            if(quizContainer) quizContainer.innerHTML = '';
                            
                            const btnSubmitEval = document.getElementById('btnSubmitEval');
                            if (btnSubmitEval) {
                                btnSubmitEval.textContent = "Marquer comme terminée";
                                window.currentEvalData = { is_empty: true, required_score: 0, questions: [] };
                            }
                        }
                    });
                }, 1000);

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

    // 6. Gestion de la soumission de l'évaluation
    const evalForm = document.getElementById('evaluationForm');
    if (evalForm) {
        evalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!window.currentEvalData) return;

            const evalData = window.currentEvalData;
            let scoreObtained = 100;

            if (!evalData.is_empty) {
                const questions = evalData.questions;
                let score = 0;
                let answered = 0;

                questions.forEach(q => {
                    const selected = document.querySelector(`input[name="question_${q.id}"]:checked`);
                    if (selected) {
                        answered++;
                        if (selected.value === "1") score++;
                    }
                });

                if (answered < questions.length) {
                    Swal.fire({
                        title: 'Attention',
                        text: 'Veuillez répondre à toutes les questions.',
                        icon: 'warning',
                        background: '#1a1d2d',
                        color: '#f8fafc'
                    });
                    return;
                }

                scoreObtained = (score / questions.length) * 100;
                const required = parseInt(evalData.required_score || 100);

                if (scoreObtained < required) {
                    Swal.fire({
                        title: 'Échec',
                        text: `Votre score est de ${scoreObtained.toFixed(0)}%. Le score requis est de ${required}%. Veuillez réessayer.`,
                        icon: 'error',
                        confirmButtonText: 'Réessayer',
                        background: '#1a1d2d',
                        color: '#f8fafc'
                    }).then(() => {
                        evalForm.reset();
                    });
                    return; // Stoppe l'exécution si échec
                }
            }

            // Si succès ou pas d'évaluation (is_empty) -> update_progress
            const fd = new FormData();
            fd.append('action', 'update_progress');
            fd.append('course_id', courseId);
            
            fetch('api/courses.php', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(res => {
                let progress = res.new_progress ? parseFloat(res.new_progress) : 0;
                let textMsg = evalData.is_empty ? 'Leçon terminée !' : `Leçon validée (Score: ${scoreObtained.toFixed(0)}%) !`;

                if (progress >= 100) {
                    Swal.fire({
                        title: 'Félicitations !',
                        text: textMsg + ' Vous avez terminé ce cours à 100% !',
                        icon: 'success',
                        confirmButtonText: 'Obtenir mon Certificat',
                        confirmButtonColor: '#10b981',
                        background: '#1a1d2d',
                        color: '#f8fafc',
                        allowOutsideClick: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = "certificate.html";
                        }
                    });
                } else {
                    Swal.fire({
                        title: 'Bien joué !',
                        text: textMsg + ` Progression actuelle : ${progress.toFixed(0)}%`,
                        icon: 'success',
                        confirmButtonText: 'Continuer',
                        confirmButtonColor: '#6366f1',
                        background: '#1a1d2d',
                        color: '#f8fafc',
                        allowOutsideClick: false
                    }).then(() => {
                        window.location.href = "student_dashboard.html"; 
                    });
                }
            });
        });
    }
});
