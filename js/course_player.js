// js/course_player.js : Gère l'affichage du contenu (PDF/Vidéo) et les leçons
document.addEventListener('DOMContentLoaded', function() {
    const mediaViewer = document.getElementById('mediaViewer');
    const evaluationSection = document.getElementById('evaluationSection');
    const courseTitle = document.getElementById('courseTitle');
    const lessonsListContainer = document.getElementById('courseLessonsList');
    const globalProgressBar = document.getElementById('globalProgressBar');
    const globalProgressText = document.getElementById('globalProgressText');
    
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');

    if (!courseId) {
        courseTitle.textContent = "Erreur : Aucun cours sélectionné";
        return;
    }

    let allLessons = [];
    let currentLessonIndex = 0;
    let studentProgress = 0;
    let courseTotalLessons = 1;

    const directEvalId = urlParams.get('eval');

    // Charger les détails du cours et l'inscription
    fetch(`api/courses.php?action=list_enrolled`)
    .then(r => r.json())
    .then(data => {
        if(data.status === 'success') {
            const course = data.courses.find(c => c.id == courseId);
            if(course) {
                courseTitle.textContent = course.title;
                studentProgress = parseFloat(course.progress_percentage || 0);
                courseTotalLessons = parseInt(course.total_lessons || 1);
            }
            if (directEvalId) {
                mediaViewer.style.display = 'none';
                loadEvaluation(null, directEvalId);
            } else {
                loadLessons();
            }
        }
    });

    function loadLessons() {
        fetch(`api/lessons.php?action=list&course_id=${courseId}`)
        .then(r => r.json())
        .then(data => {
            if(data.status === 'success' && data.lessons.length > 0) {
                allLessons = data.lessons;
                renderLessonsSidebar();
                
                // Déterminer la leçon actuelle (basée sur la progression)
                const completedLessonsCount = Math.round((studentProgress / 100) * courseTotalLessons);
                currentLessonIndex = completedLessonsCount < allLessons.length ? completedLessonsCount : allLessons.length - 1;
                
                loadLessonContent(currentLessonIndex);
                updateGlobalProgress();
            } else {
                lessonsListContainer.innerHTML = "<p style='color:var(--text-muted); font-size:0.85rem;'>Aucune leçon disponible.</p>";
                mediaViewer.innerHTML = "<p style='color:var(--text-muted);'>L'enseignant n'a pas encore ajouté de leçon à ce cours.</p>";
            }
        });
    }

    function renderLessonsSidebar() {
        lessonsListContainer.innerHTML = '';
        const completedLessonsCount = Math.round((studentProgress / 100) * courseTotalLessons);
        
        allLessons.forEach((lesson, index) => {
            const isCompleted = index < completedLessonsCount;
            const isLocked = index > completedLessonsCount;
            
            const div = document.createElement('div');
            div.className = `lesson-item ${isLocked ? 'locked' : ''} ${index === currentLessonIndex ? 'active' : ''}`;
            
            let circleClass = isCompleted ? 'completed' : '';
            let pctText = Math.round(((index + 1) / courseTotalLessons) * 100) + '%';
            
            div.innerHTML = `
                <div class="lesson-title-sidebar">${lesson.title}</div>
                <div class="circle-progress ${circleClass}" style="font-size:0.65rem; width:30px; height:30px;">${!isCompleted ? pctText : ''}</div>
            `;
            
            div.onclick = () => {
                if(!isLocked) {
                    currentLessonIndex = index;
                    renderLessonsSidebar();
                    loadLessonContent(index);
                }
            };
            
            lessonsListContainer.appendChild(div);
        });
    }

    function updateGlobalProgress() {
        globalProgressBar.style.width = studentProgress + '%';
        globalProgressText.textContent = studentProgress.toFixed(0) + '%';
    }

    function loadLessonContent(index) {
        const lesson = allLessons[index];
        evaluationSection.classList.add('hidden');

        // --- Mise à jour du panneau infos leçon ---
        const infoPanel = document.getElementById('lessonInfoPanel');
        const lessonNumBadge = document.getElementById('lessonNumBadge');
        const lessonInfoTitle = document.getElementById('lessonInfoTitle');
        const lessonInfoMeta = document.getElementById('lessonInfoMeta');
        const speedControls = document.getElementById('speedControls');

        if (infoPanel) {
            infoPanel.style.display = 'flex';
            lessonNumBadge.innerHTML = `${index + 1}<span>Leçon</span>`;
            lessonInfoTitle.textContent = lesson.title;
            const typeLabel = lesson.content_type === 'video' ? '🎬 Vidéo' : '📄 Document PDF';
            lessonInfoMeta.textContent = `${typeLabel} — ${index + 1} / ${allLessons.length}`;
        }

        // Gestion contenus video
        const isLocalVideo = lesson.content_type === 'video'
            && !lesson.content_url.includes('youtu')
            && !lesson.content_url.includes('vimeo');

        if (lesson.content_type === 'video') {
            let url = lesson.content_url;
            const isYoutube = url.includes("watch?v=") || url.includes("youtu.be/");
            const isVimeo = url.includes("vimeo.com/");

            if(isYoutube && url.includes("watch?v=")) url = url.replace("watch?v=", "embed/").split('&')[0];
            else if (isYoutube && url.includes("youtu.be/")) url = url.replace("youtu.be/", "youtube.com/embed/").split('?')[0];
            else if (isVimeo) url = "https://player.vimeo.com/video/" + url.split("vimeo.com/")[1];

            if (isLocalVideo) {
                mediaViewer.innerHTML = `<video id="localVideoPlayer" src="${url}" controls autoplay style="width:100%; height:100%; border-radius:12px; background:#000; outline:none;"></video>`;
                if (speedControls) speedControls.style.display = 'flex';
            } else {
                mediaViewer.innerHTML = `<iframe src="${url}" allowfullscreen style="width:100%; height:100%; border:none; border-radius:12px;"></iframe>`;
                if (speedControls) speedControls.style.display = 'none';
            }
        } else {
            mediaViewer.innerHTML = `<iframe src="${lesson.content_url}#toolbar=0" type="application/pdf" style="width:100%; height:100%; border:none; border-radius:12px;"></iframe>`;
            if (speedControls) speedControls.style.display = 'none';
        }

        // Reset media viewer style
        mediaViewer.style.flexDirection = '';
        mediaViewer.style.padding = '';

        // ----- CAS : PAS DERNIÈRE LEÇON (bouton Suivant) -----
        if(index < allLessons.length - 1) {
            if (isLocalVideo) {
                // Overlay qui s'affiche quand la vidéo se termine
                const vid = document.getElementById('localVideoPlayer');
                if(vid) {
                    vid.onended = () => {
                        const overlay = document.createElement('div');
                        overlay.className = 'video-end-overlay';
                        overlay.innerHTML = `
                            <div class="check-icon"><i class="fa-solid fa-check"></i></div>
                            <h3>Leçon terminée !</h3>
                            <p>Bravo, vous avez visionné toute la vidéo.</p>
                            <button class="overlay-btn" id="nextLessonOverlayBtn">
                                <i class="fa-solid fa-forward-step"></i>
                                Passer à la suite
                            </button>
                        `;
                        mediaViewer.appendChild(overlay);
                        document.getElementById('nextLessonOverlayBtn').onclick = () => markLessonCompleted();
                    };
                }
            } else {
                // PDF ou YouTube -> case à cocher sous le player (hors mediaViewer)
                const existing = document.getElementById('lessonConfirmZone');
                if (existing) existing.remove();

                const confirmZone = document.createElement('div');
                confirmZone.id = 'lessonConfirmZone';
                confirmZone.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:20px; margin-top:5px;';

                const btn = document.createElement('button');
                btn.className = 'btn-submit-eval';
                btn.innerHTML = '<i class="fa-solid fa-forward-step"></i> Leçon terminée, passer à la suivante';
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.onclick = () => markLessonCompleted();

                confirmZone.innerHTML = `
                    <label class="custom-checkbox-wrapper">
                        <input type="checkbox" id="confirmReadCheck">
                        <span>Je confirme avoir terminé cette leçon</span>
                    </label>
                `;
                confirmZone.appendChild(btn);

                // Insérer après le panneau infos
                const infoP = document.getElementById('lessonInfoPanel');
                infoP ? infoP.after(confirmZone) : document.getElementById('mediaViewer').after(confirmZone);

                document.getElementById('confirmReadCheck').addEventListener('change', function(e) {
                    btn.disabled = !e.target.checked;
                    btn.style.opacity = e.target.checked ? '1' : '0.5';
                    btn.style.cursor = e.target.checked ? 'pointer' : 'not-allowed';
                });
            }

        } else {
            // ----- CAS : DERNIÈRE LEÇON -> déclencher évaluation -----
            if (isLocalVideo) {
                const vid = document.getElementById('localVideoPlayer');
                if(vid) {
                    vid.onended = () => {
                        const overlay = document.createElement('div');
                        overlay.className = 'video-end-overlay';
                        overlay.innerHTML = `
                            <div class="check-icon"><i class="fa-solid fa-trophy"></i></div>
                            <h3>Cours terminé !</h3>
                            <p>Vous pouvez maintenant passer l'évaluation finale.</p>
                            <button class="overlay-btn" id="startFinalEvalBtn">
                                <i class="fa-solid fa-pen-to-square"></i>
                                Commencer l'évaluation
                            </button>
                        `;
                        mediaViewer.appendChild(overlay);
                        document.getElementById('startFinalEvalBtn').onclick = function() {
                            this.disabled = true;
                            loadEvaluation(lesson.id);
                        };
                    };
                }
            } else {
                // PDF / YouTube -> case à cocher hors mediaViewer
                const existing = document.getElementById('lessonConfirmZone');
                if (existing) existing.remove();

                const confirmZone = document.createElement('div');
                confirmZone.id = 'lessonConfirmZone';
                confirmZone.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:20px; margin-top:5px;';
                confirmZone.innerHTML = `
                    <label class="custom-checkbox-wrapper">
                        <input type="checkbox" id="confirmReadCheckEval">
                        <span>Je confirme avoir terminé cette dernière leçon pour passer l'évaluation</span>
                    </label>
                `;

                const infoP = document.getElementById('lessonInfoPanel');
                infoP ? infoP.after(confirmZone) : document.getElementById('mediaViewer').after(confirmZone);

                document.getElementById('confirmReadCheckEval').addEventListener('change', function(e) {
                    if (e.target.checked) {
                        this.disabled = true;
                        loadEvaluation(lesson.id);
                    }
                });
            }
        }
    }

    function markLessonCompleted() {
        const newCompletedCount = currentLessonIndex + 1;
        const newProgress = (newCompletedCount / courseTotalLessons) * 100;
        
        if(newProgress > studentProgress) {
            // Update in DB
            const fd = new FormData();
            fd.append('action', 'update_progress');
            fd.append('course_id', courseId);
            fd.append('new_progress', newProgress);
            fetch('api/courses.php', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(res => {
                studentProgress = newProgress;
                updateGlobalProgress();
                currentLessonIndex++;
                renderLessonsSidebar();
                loadLessonContent(currentLessonIndex);
            });
        } else {
            currentLessonIndex++;
            renderLessonsSidebar();
            loadLessonContent(currentLessonIndex);
        }
    }

    function loadEvaluation(lessonId, evalId = null) {
        let apiUrl = 'api/evaluations.php?action=get_evaluation';
        if (evalId) {
            apiUrl += '&eval_id=' + evalId;
        } else {
            apiUrl += '&lesson_id=' + lessonId;
        }
        
        fetch(apiUrl)
        .then(res => res.json())
        .then(evalResponse => {
            if (evalResponse.status === 'success' && evalResponse.evaluation) {
                const evalData = evalResponse.evaluation;
                window.currentEvalData = evalData;
                evaluationSection.classList.remove('hidden');
                document.getElementById('evalTitleHeader').textContent = evalData.title;
                
                if (evalData.user_result) {
                    document.getElementById('evalDesc').innerHTML = `Vous avez déjà passé cette évaluation.<br>Score obtenu : <strong style="color:var(--text-main);">${evalData.user_result.score}%</strong> (${evalData.user_result.passed ? 'Réussi' : 'Échoué'})`;
                    const btn = document.getElementById('btnSubmitEval');
                    if(btn) {
                        if (evalData.user_result.passed) {
                            btn.textContent = "Retour au tableau de bord";
                            btn.onclick = (e) => {
                                e.preventDefault();
                                window.location.href = "student_dashboard.html";
                            };
                        } else {
                            btn.style.display = 'none';
                        }
                    }
                    setTimeout(() => {
                        document.querySelectorAll('.eval-option input').forEach(input => input.disabled = true);
                    }, 100);
                } else {
                    document.getElementById('evalDesc').textContent = `Évaluation finale. Score requis : ${evalData.required_score}%. Vous devez valider pour obtenir le certificat.`;
                }
                
                const quizContainer = document.getElementById('quizContainer');
                if(quizContainer) quizContainer.innerHTML = '';
                
                evalData.questions.forEach((q, i) => {
                    let block = document.createElement('div');
                    block.style.marginBottom = '25px'; block.style.padding = '15px'; block.style.background = 'rgba(255,255,255,0.02)'; block.style.borderRadius = '10px'; block.style.border = '1px solid var(--border-color)';
                    let qTitle = document.createElement('div'); qTitle.className = 'eval-question'; qTitle.style.marginBottom = '15px'; qTitle.textContent = `${i + 1}. ${q.question_text}`; block.appendChild(qTitle);
                    let optionsDiv = document.createElement('div'); optionsDiv.className = 'eval-options';
                    q.choices.forEach(choice => {
                        let label = document.createElement('label'); label.className = 'eval-option';
                        label.innerHTML = `<input type="radio" name="question_${q.id}" value="${choice.is_correct}"> <span>${choice.choice_text}</span>`;
                        optionsDiv.appendChild(label);
                    });
                    block.appendChild(optionsDiv);
                    if(quizContainer) quizContainer.appendChild(block);
                });
            } else {
                // Pas d'éval
                evaluationSection.classList.remove('hidden');
                document.getElementById('evalTitleHeader').textContent = "Fin du cours";
                document.getElementById('evalDesc').textContent = "Il n'y a pas d'évaluation finale pour ce cours.";
                if(document.getElementById('quizContainer')) document.getElementById('quizContainer').innerHTML = '';
                if(document.getElementById('btnSubmitEval')) {
                    document.getElementById('btnSubmitEval').textContent = "Terminer le cours";
                    window.currentEvalData = { is_empty: true, required_score: 0, questions: [] };
                }
            }
        });
    }

    const evalForm = document.getElementById('evaluationForm');
    if (evalForm) {
        evalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!window.currentEvalData) return;
            const evalData = window.currentEvalData;
            let scoreObtained = 100;
            let passed = true;
            let required = 100;
            if (!evalData.is_empty) {
                const questions = evalData.questions;
                let score = 0; let answered = 0;
                questions.forEach(q => {
                    const selected = document.querySelector(`input[name="question_${q.id}"]:checked`);
                    if (selected) { answered++; if (selected.value === "1") score++; }
                });
                if (answered < questions.length) { Swal.fire('Attention', 'Veuillez répondre à toutes les questions.', 'warning'); return; }
                scoreObtained = (score / questions.length) * 100;
                required = parseInt(evalData.required_score || 100);
                passed = scoreObtained >= required;
            }
            
            // Submit eval result to DB
            const evalFd = new FormData();
            evalFd.append('action', 'submit_eval');
            evalFd.append('evaluation_id', evalData.id);
            evalFd.append('score', scoreObtained);
            evalFd.append('passed', passed ? 1 : 0);
            
            fetch('api/evaluations.php', { method: 'POST', body: evalFd })
            .then(() => {
                if (!passed) {
                    Swal.fire('Échec', `Score : ${scoreObtained.toFixed(0)}%. Requis : ${required}%. L'évaluation est terminée.`, 'error').then(() => {
                        window.location.reload();
                    });
                    return;
                }
                
                // Succès -> Redirection si c'est une évaluation directe
                if (directEvalId) {
                    Swal.fire({
                        title: 'Évaluation réussie !',
                        text: `Félicitations, vous avez passé cette évaluation avec un score de ${scoreObtained.toFixed(0)}%.`,
                        icon: 'success',
                        confirmButtonText: 'Retour au tableau de bord',
                        confirmButtonColor: '#10b981',
                        allowOutsideClick: false
                    }).then(() => {
                        window.location.href = "student_dashboard.html";
                    });
                    return;
                }

                // Succès (leçon classique) -> Update progress
                const newCompletedCount = currentLessonIndex + 1;
                const finalProgress = (newCompletedCount / courseTotalLessons) * 100;

                const fd = new FormData(); 
                fd.append('action', 'update_progress'); 
                fd.append('course_id', courseId);
                fd.append('new_progress', finalProgress);

                fetch('api/courses.php', { method: 'POST', body: fd }).then(r => r.json()).then(res => {
                    studentProgress = finalProgress; updateGlobalProgress(); renderLessonsSidebar();
                    
                    if (finalProgress >= 100) {
                        Swal.fire({
                            title: 'Félicitations !', text: 'Vous avez terminé ce cours à 100% !', icon: 'success',
                            confirmButtonText: 'Demander le certificat', confirmButtonColor: '#10b981', allowOutsideClick: false
                        }).then(() => {
                            window.location.href = "student_dashboard.html";
                        });
                    } else {
                        Swal.fire({
                            title: 'Évaluation terminée', text: `Mais il reste encore des leçons à venir par l'enseignant (${newCompletedCount}/${courseTotalLessons} terminées).`, icon: 'info',
                            confirmButtonText: 'Retour', confirmButtonColor: '#10b981', allowOutsideClick: false
                        }).then(() => {
                            window.location.href = "student_dashboard.html";
                        });
                    }
                });
            });
        });
    }
});
