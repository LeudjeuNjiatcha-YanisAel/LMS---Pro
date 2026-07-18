<?php
// api/parse_document.php – v3
// Extraction XML propre paragraphe par paragraphe + détection stricte des options

session_start();
require 'db.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'teacher') {
    echo json_encode(["status" => "error", "message" => "Accès refusé."]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['document'])) {
    echo json_encode(["status" => "error", "message" => "Aucun fichier reçu."]);
    exit;
}

$file = $_FILES['document'];
$ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($ext, ['pdf', 'docx', 'pptx'])) {
    echo json_encode(["status" => "error", "message" => "Format non supporté. Utilisez PDF, DOCX ou PPTX."]);
    exit;
}

if ($file['size'] > 20 * 1024 * 1024) {
    echo json_encode(["status" => "error", "message" => "Fichier trop volumineux (max 20 Mo)."]);
    exit;
}

$tmpPath = $file['tmp_name'];
$rawText = '';

// ================================================================
// EXTRACTION DU TEXTE
// ================================================================

if ($ext === 'docx' || $ext === 'pptx') {
    $zip = new ZipArchive();
    if ($zip->open($tmpPath) !== true) {
        echo json_encode(["status" => "error", "message" => "Impossible de lire le fichier."]);
        exit;
    }

    $xmlList = [];
    if ($ext === 'docx') {
        $content = $zip->getFromName('word/document.xml');
        if ($content) $xmlList[] = $content;
    } else {
        for ($s = 1; $s <= 500; $s++) {
            $slide = $zip->getFromName("ppt/slides/slide{$s}.xml");
            if ($slide === false) break;
            $xmlList[] = $slide;
        }
    }
    $zip->close();

    foreach ($xmlList as $xml) {
        $rawText .= xmlToLines($xml, $ext) . "\n\n";
    }

} elseif ($ext === 'pdf') {
    $ep  = escapeshellarg($tmpPath);
    $out = shell_exec("pdftotext -enc UTF-8 {$ep} - 2>/dev/null");
    if ($out && strlen(trim($out)) > 20) {
        $rawText = $out;
    } else {
        $pdf = file_get_contents($tmpPath);
        preg_match_all('/BT\s*(.*?)\s*ET/s', $pdf, $m);
        foreach ($m[1] as $block) {
            preg_match_all('/\(([^)]*)\)/', $block, $s);
            $rawText .= implode(' ', $s[1]) . "\n";
        }
        $rawText = str_replace(['\\n','\\r'], "\n", $rawText);
    }
    if (strlen(trim($rawText)) < 20) {
        echo json_encode(["status" => "error", "message" => "Impossible d'extraire le texte du PDF. Essayez DOCX ou PPTX."]);
        exit;
    }
}

// ================================================================
// EXTRACTION XML → LIGNES (une ligne = un paragraphe)
// ================================================================
function xmlToLines(string $xml, string $ext): string {
    $ptag = ($ext === 'docx') ? 'w:p' : 'a:p';
    $ttag = ($ext === 'docx') ? 'w:t' : 'a:t';

    // Forcer les sauts de ligne Word/PPT en \n
    $xml = preg_replace('/<(?:w|a):br[^>]*\/?>/i', "\n", $xml);

    preg_match_all('/<' . preg_quote($ptag, '/') . '[\s>].*?<\/' . preg_quote($ptag, '/') . '>/s', $xml, $paras);

    $lines = [];
    foreach ($paras[0] as $para) {
        preg_match_all('/<' . preg_quote($ttag, '/') . '(?:\s[^>]*)?>([^<]*)<\/' . preg_quote($ttag, '/') . '>/s', $para, $tnodes);
        $line = implode('', $tnodes[1]);
        $line = html_entity_decode(trim($line), ENT_QUOTES | ENT_XML1, 'UTF-8');
        $line = preg_replace('/[ \t]+/', ' ', $line);
        if ($line !== '') {
            foreach (explode("\n", $line) as $sub) {
                $sub = trim($sub);
                if ($sub !== '') $lines[] = $sub;
            }
        }
    }
    return implode("\n", $lines);
}

// ================================================================
// MOTEUR DE DÉTECTION
// ================================================================
$questions = parseQA($rawText);

if (empty($questions)) {
    echo json_encode([
        "status"      => "warning",
        "message"     => "Aucune question détectée. Vérifiez le format (voir conseil ci-dessous).",
        "questions"   => [],
        "raw_preview" => mb_substr($rawText, 0, 800)
    ]);
    exit;
}

echo json_encode(["status" => "success", "questions" => $questions, "count" => count($questions)]);

// ================================================================
// FONCTIONS DE PARSING
// ================================================================

/**
 * Détecte si une ligne est une ligne-question (numérotée ou se terminant par ?)
 */
function isQuestionLine(string $line): bool {
    // Numérotée : "1. ...", "1) ..."
    if (preg_match('/^(\d+)[\.\)]\s+.{5,}/', $line)) return true;
    // "Q1:" / "Question 1:" 
    if (preg_match('/^(?:Q\d*|Question\s*\d*)\s*[:\.][ \t]*.{3,}/i', $line)) return true;
    // Phrase se terminant par "?"
    if (str_ends_with(rtrim($line), '?') && strlen($line) > 5) return true;
    return false;
}

/**
 * Détecte si une ligne est une ligne-option (a), b), c), d), A., B. etc.)
 * STRICT : interdit les numéros seuls (pas de "2. Question..." qui matcherait)
 */
function isOptionLine(string $line): bool {
    // Doit commencer par une lettre a-d (ou A-D) suivie de ) ou .
    if (preg_match('/^[a-dA-D]\s*[\.\)]\s*.+/', $line)) return true;
    // Ou une puce classique -, •, *
    if (preg_match('/^[\-\*\•]\s+.+/', $line)) return true;
    return false;
}

/**
 * Extrait le texte de la réponse en supprimant le marqueur * et les espaces
 */
function cleanAnswerText(string $text): string {
    return trim(preg_replace('/\s*\*\s*$/', '', $text));
}

/**
 * La bonne réponse est marquée par * à la fin
 */
function isCorrectOption(string $line): bool {
    // Marqueurs : *, ✓, ☑, ✔, ✅, [x], (correct)
    if (preg_match('/\*\s*$/', $line)) return true;
    if (preg_match('/[✓☑✔✅]/', $line)) return true;
    if (preg_match('/\[(x|X|ok)\]/', $line)) return true;
    if (preg_match('/\(correct(e)?\)/i', $line)) return true;
    return false;
}

/**
 * Parser principal Q&R
 */
function parseQA(string $text): array {
    $lines = array_values(array_filter(
        array_map('trim', explode("\n", $text)),
        fn($l) => strlen($l) > 1
    ));

    $questions = [];
    $i = 0;
    $n = count($lines);

    while ($i < $n) {
        $line = $lines[$i];

        if (!isQuestionLine($line)) {
            $i++;
            continue;
        }

        // Extraire le texte de la question (sans numéro)
        $qText = preg_replace('/^(\d+[\.\)]\s+|(?:Q\d*|Question\s*\d*)\s*[:\.][ \t]*)/i', '', $line);
        $qText = trim($qText);

        $options       = [];
        $correctAnswer = '';
        $j = $i + 1;

        // Lire les lignes suivantes jusqu'à 10 (pour 4 options + ligne "Réponse:")
        while ($j < $n && $j < $i + 10) {
            $opt = $lines[$j];

            // Ligne "Réponse: ..." explicite
            if (preg_match('/^(?:R[ée]ponse|Answer|Correct|Bonne\s+r[ée]ponse)\s*[:=]\s*(.+)/i', $opt, $rm)) {
                $correctAnswer = trim($rm[1]);
                $j++;
                break;
            }

            // Ligne option valide
            if (isOptionLine($opt)) {
                // Extraire le texte (sans le préfixe a), b), etc.)
                $answerText = preg_replace('/^[a-dA-D\-\*\•]\s*[\.\)]?\s*/', '', $opt);
                $isCorrect  = isCorrectOption($opt);
                $clean      = cleanAnswerText($answerText);
                if ($clean !== '') {
                    $options[] = ['text' => $clean, 'correct' => $isCorrect];
                }
                $j++;
            } else {
                // Ni option ni "Réponse:" → fin du bloc
                break;
            }
        }

        // Construire l'entrée
        $entry = buildEntry($qText, $options, $correctAnswer);
        if ($entry) $questions[] = $entry;

        $i = $j;
    }

    return $questions;
}

function buildEntry(string $qText, array $options, string $explicitCorrect): ?array {
    if (strlen($qText) < 3) return null;

    $correct = '';
    $wrongs  = [];

    if ($explicitCorrect !== '') {
        $correct = $explicitCorrect;
        foreach ($options as $o) {
            if (mb_strtolower(trim($o['text'])) !== mb_strtolower($correct)) {
                $wrongs[] = $o['text'];
            }
        }
    } elseif (!empty($options)) {
        $correctOpts = array_filter($options, fn($o) => $o['correct']);
        $wrongOpts   = array_filter($options, fn($o) => !$o['correct']);

        if (!empty($correctOpts)) {
            $correct = array_values($correctOpts)[0]['text'];
        } else {
            // Aucun marqueur → première option marquée "à vérifier"
            $correct = $options[0]['text'] . ' ⚠️ À vérifier';
            array_shift($options);
            $wrongOpts = $options;
        }
        foreach ($wrongOpts as $wo) $wrongs[] = $wo['text'];
    } else {
        // Question sans options → À définir
        return ['q' => $qText, 'c' => '⚠️ À définir', 'w1' => '', 'w2' => '', 'w3' => ''];
    }

    return [
        'q'  => $qText,
        'c'  => $correct,
        'w1' => $wrongs[0] ?? '',
        'w2' => $wrongs[1] ?? '',
        'w3' => $wrongs[2] ?? '',
    ];
}
?>
