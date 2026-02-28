<?php
$pdo = new PDO('mysql:host=localhost;dbname=student_data_mining', 'root', '');

echo "--- Find exact remaining duplicates in academic_calendar ---\n";
// The scanner found DUPLICATES on title+event_date: 2 copies: title=Meeting with Silky, event_date=2026-01-30
$sql = "SELECT id, title, event_date, type FROM academic_calendar WHERE title = 'Meeting with Silky' AND event_date = '2026-01-30'";
$res = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
print_r($res);

// Manually delete the oldest one (smallest ID)
if (count($res) > 1) {
    $ids_to_delete = [];
    // Sort by id descending
    usort($res, function ($a, $b) {
        return $b['id'] - $a['id']; });

    // Keep the first (highest id), delete the rest
    for ($i = 1; $i < count($res); $i++) {
        $ids_to_delete[] = $res[$i]['id'];
    }

    $id_list = implode(',', $ids_to_delete);
    echo "Deleting IDs: $id_list\n";
    $pdo->exec("DELETE FROM academic_calendar WHERE id IN ($id_list)");
}
