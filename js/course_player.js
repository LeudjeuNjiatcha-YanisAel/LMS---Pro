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
            if (evalResponse.status !== 'success' || !evalResponse.evaluation) {
                // Pas d'eval disponible
                evaluationSection.classList.remove('hidden');
                document.getElementById('evalTitleHeader').textContent = "Fin du cours";
                document.getElementById('evalDesc').textContent = "Il n'y a pas d'evaluation finale pour ce cours.";
                if (document.getElementById('quizContainer')) document.getElementById('quizContainer').innerHTML = '';
                if (document.getElementById('btnSubmitEval')) {
                    document.getElementById('btnSubmitEval').textContent = "Terminer le cours";
                    window.currentEvalData = { is_empty: true, required_score: 0, questions: [] };
                }
                return;
            }

            const evalData = evalResponse.evaluation;
            window.currentEvalData = evalData;
            evaluationSection.classList.remove('hidden');
            document.getElementById('evalTitleHeader').textContent = evalData.title;

            // CAS 1 : L'etudiant a deja soumis
            if (evalData.user_result) {
                const quizContainer = document.getElementById('quizContainer');
                if (quizContainer) quizContainer.innerHTML = '';
                const btn = document.getElementById('btnSubmitEval');

                if (evalData.end_date && !evalData.is_ended) {
                    document.getElementById('evalDesc').innerHTML =
                        '\u2705 Vos r\u00e9ponses ont \u00e9t\u00e9 enregistr\u00e9es.<br>R\u00e9sultat disponible le <strong>' + new Date(evalData.end_date).toLocaleString() + '</strong>.';
                } else {
                    const scoreRounded = parseFloat(evalData.user_result.score).toFixed(0);
                    const statusLabel = evalData.user_result.passed == 1
                        ? '<span style="color:#10b981;">\u2705 R\u00e9ussi</span>'
                        : '<span style="color:#ef4444;">\u274c \u00c9chou\u00e9</span>';
                    document.getElementById('evalDesc').innerHTML =
                        '\u00c9valuation d\u00e9j\u00e0 pass\u00e9e.<br>Score : <strong style="font-size:1.2rem;">' + scoreRounded + '%</strong> \u2014 ' + statusLabel;
                }

                if (btn) {
                    btn.textContent = "Retour au tableau de bord";
                    btn.style.display = '';
                    btn.onclick = (e) => {
                        e.preventDefault();
                        window.location.href = "student_dashboard.html";
                    };
                }
                return;
            }

            // CAS 2 : Evaluation inactive (pas encore commencee ou expiree)
            if (evalData.is_active === false) {
                const quizContainer = document.getElementById('quizContainer');
                if (quizContainer) quizContainer.innerHTML = '';
                const btn = document.getElementById('btnSubmitEval');
                if (btn) btn.style.display = 'none';

                if (evalData.is_ended) {
                    document.getElementById('evalDesc').innerHTML =
                        '<span style="color:#ef4444;">\u26d4 Cette \u00e9valuation est termin\u00e9e depuis le ' + new Date(evalData.end_date).toLocaleString() + '.</span>';
                } else {
                    document.getElementById('evalDesc').innerHTML =
                        '<span style="color:#f59e0b;">\ud83d\udd50 D\u00e9marrage le ' + new Date(evalData.scheduled_date).toLocaleString() + '.</span>';
                }
                return;
            }

            // CAS 3 : Evaluation active, a passer
            const isTeleEval = (evalData.eval_type === 'tele-eval');
            const timeLimit  = parseInt(evalData.time_limit_per_question) || 30;

            document.getElementById('evalDesc').textContent = isTeleEval
                ? ('T\u00e9l\u00e9-\u00e9valuation : ' + timeLimit + 's par question. R\u00e9pondez vite !')
                : ('Score requis : ' + evalData.required_score + '%. R\u00e9pondez \u00e0 toutes les questions puis validez.');

            const quizContainer = document.getElementById('quizContainer');
            if (quizContainer) quizContainer.innerHTML = '';

            if (isTeleEval) {
                const timerHtml = '<div id="teleEvalTimer" style="background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(245,158,11,0.12));border:1px solid rgba(239,68,68,0.35);border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">'
                    + '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px;">'
                    + '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
                    + '<span style="font-size:1.5rem;font-weight:bold;color:#ef4444;"><span id="timerCountdown">' + timeLimit + '</span>s</span>'
                    + '<span style="font-size:0.85rem;color:var(--text-muted);">par question</span>'
                    + '</div>'
                    + '<div id="timerProgressBar" style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">'
                    + '<div id="timerFill" style="height:100%;width:100%;background:linear-gradient(90deg,#10b981,#f59e0b);border-radius:4px;transition:width 0.9s linear;"></div>'
                    + '</div>'
                    + '<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">Question <strong id="teleQNum">1</strong> / ' + evalData.questions.length + '</div>'
                    + '</div>';
                quizContainer.insertAdjacentHTML('beforeend', timerHtml);
                const btn = document.getElementById('btnSubmitEval');
                if (btn) btn.style.display = 'none';
            }

            window.currentEvalBlocks = [];
            evalData.questions.forEach((q, i) => {
                const block = document.createElement('div');
                block.className = 'eval-q-block';
                block.id = 'eval_q_' + i;
                block.style.cssText = 'margin-bottom:25px;padding:18px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--border-color);';
                if (isTeleEval) block.style.display = (i === 0) ? 'block' : 'none';

                const qTitle = document.createElement('div');
                qTitle.className = 'eval-question';
                qTitle.style.cssText = 'margin-bottom:15px;font-weight:600;font-size:1rem;line-height:1.5;';
                qTitle.textContent = 'Question ' + (i + 1) + '/' + evalData.questions.length + ' : ' + q.question_text;
                block.appendChild(qTitle);

                const optionsDiv = document.createElement('div');
                optionsDiv.className = 'eval-options';
                q.choices.forEach(choice => {
                    const label = document.createElement('label');
                    label.className = 'eval-option';
                    label.innerHTML = '<input type="radio" name="question_' + q.id + '" value="' + choice.is_correct + '"> <span>' + choice.choice_text + '</span>';
                    optionsDiv.appendChild(label);
                });
                block.appendChild(optionsDiv);

                if (isTeleEval) {
                    const nextBtn = document.createElement('button');
                    nextBtn.type = 'button';
                    nextBtn.style.cssText = 'margin-top:15px;padding:10px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.9rem;';
                    nextBtn.textContent = (i === evalData.questions.length - 1) ? '\u2705 Terminer l\'evaluation' : 'Question suivante \u2192';
                    nextBtn.onclick = () => window.nextTeleEvalQuestion(i, timeLimit);
                    block.appendChild(nextBtn);
                }

                quizContainer.appendChild(block);
                window.currentEvalBlocks.push(block);
            });

            if (isTeleEval && evalData.questions.length > 0) {
                setTimeout(() => window.startTeleEvalTimer(0, timeLimit), 150);
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
                // Pour la télé-évaluation, on ne bloque pas si certaines questions n'ont pas été répondues
                const isTeleEvalSubmit = evalData.eval_type === 'tele-eval';
                if (!isTeleEvalSubmit && answered < questions.length) {
                    Swal.fire('Attention', 'Veuillez répondre à toutes les questions.', 'warning'); return;
                }
                scoreObtained = questions.length > 0 ? (score / questions.length) * 100 : 100;
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
                if (evalData.end_date && !evalData.is_ended) {
                    // Masquer la note car l'évaluation n'est pas encore terminée globalement
                    Swal.fire({
                        title: 'Réponses enregistrées',
                        text: `Vos réponses ont bien été soumises. Votre résultat sera disponible le ${new Date(evalData.end_date).toLocaleString()}.`,
                        icon: 'success',
                        confirmButtonText: 'Retour au tableau de bord',
                        confirmButtonColor: '#10b981',
                        allowOutsideClick: false
                    }).then(() => {
                        window.location.href = "student_dashboard.html";
                    });
                    return;
                }

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

    // Gestion du timer de télé-évaluation
    window.teleEvalInterval = null;
    window.startTeleEvalTimer = function(index, timeLimit) {
        let timeLeft = timeLimit;
        const timerSpan = document.getElementById('timerCountdown');
        const timerFill = document.getElementById('timerFill');
        const teleQNum  = document.getElementById('teleQNum');
        if(!timerSpan) return;
        
        timerSpan.textContent = timeLeft;
        if (timerFill) timerFill.style.width = '100%';
        if (teleQNum) teleQNum.textContent = index + 1;
        
        clearInterval(window.teleEvalInterval);
        window.teleEvalInterval = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = timeLeft;
            // Mettre à jour la barre de progression
            if (timerFill) {
                const pct = (timeLeft / timeLimit) * 100;
                timerFill.style.width = pct + '%';
                timerFill.style.background = pct > 50
                    ? 'linear-gradient(90deg,#10b981,#f59e0b)'
                    : pct > 25
                        ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                        : '#ef4444';
            }
            if (timeLeft <= 0) {
                clearInterval(window.teleEvalInterval);
                window.nextTeleEvalQuestion(index, timeLimit);
            }
        }, 1000);
    };

    window.nextTeleEvalQuestion = function(currentIndex, timeLimit) {
        clearInterval(window.teleEvalInterval);
        const currentBlock = window.currentEvalBlocks[currentIndex];
        if (currentBlock) currentBlock.style.display = 'none';
        
        const nextIndex = currentIndex + 1;
        if (nextIndex < window.currentEvalBlocks.length) {
            window.currentEvalBlocks[nextIndex].style.display = 'block';
            window.startTeleEvalTimer(nextIndex, timeLimit);
        } else {
            // Fin de la télé-évaluation, on cache le timer et on simule un submit
            document.getElementById('teleEvalTimer').style.display = 'none';
            const evalForm = document.getElementById('evaluationForm');
            if (evalForm) {
                if (typeof evalForm.requestSubmit === 'function') {
                    evalForm.requestSubmit();
                } else {
                    evalForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            }
        }
    };
});
