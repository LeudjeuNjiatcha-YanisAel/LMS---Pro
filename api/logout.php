<?php
// api/logout.php : Fichier gérant la déconnexion de l'utilisateur

// 1. On démarre ou on récupère la session existante pour y accéder
session_start();

// 2. On vide complètement le tableau $_SESSION de toutes ses variables (id, role, name)
$_SESSION = [];

// 3. On détruit la session côté serveur pour invalider le cookie de session
session_destroy();

// 4. On indique au navigateur que la réponse renvoyée sera au format JSON
header('Content-Type: application/json');

// 5. On renvoie un objet JSON confirmant que la déconnexion a bien été effectuée
echo json_encode(["status" => "success", "message" => "Déconnexion réussie."]);

// 6. On arrête l'exécution du script par sécurité
exit;
?>
