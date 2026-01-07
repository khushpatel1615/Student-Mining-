<?php
/**
 * Excel File Reader - Shows structure of attendance data
 * Install: composer require phpoffice/phpspreadsheet
 */

require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$file = __DIR__ . '/../../1st 3rd 5th 2025 Attendance sheet.xlsx';

if (!file_exists($file)) {
    die("File not found: $file");
}

try {
    $spreadsheet = IOFactory::load($file);
    $worksheet = $spreadsheet->getActiveSheet();

    echo "<h2>Excel File Structure</h2>";
    echo "<p><strong>Sheet Name:</strong> " . $worksheet->getTitle() . "</p>";
    echo "<p><strong>Dimensions:</strong> " . $worksheet->getHighestRow() . " rows × " . $worksheet->getHighestColumn() . " columns</p>";

    echo "<h3>First 20 Rows:</h3>";
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse; font-family: monospace;'>";

    $maxRow = min(20, $worksheet->getHighestRow());
    $highestColumn = $worksheet->getHighestColumn();
    $highestColumnIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn);

    for ($row = 1; $row <= $maxRow; $row++) {
        echo "<tr>";
        for ($col = 1; $col <= $highestColumnIndex; $col++) {
            $cell = $worksheet->getCellByColumnAndRow($col, $row);
            $value = $cell->getValue();

            // Highlight header row
            if ($row === 1) {
                echo "<th style='background: #667eea; color: white;'>" . htmlspecialchars($value) . "</th>";
            } else {
                echo "<td>" . htmlspecialchars($value) . "</td>";
            }
        }
        echo "</tr>";
    }

    echo "</table>";

    // Extract headers
    echo "<h3>Column Headers:</h3><ul>";
    for ($col = 1; $col <= $highestColumnIndex; $col++) {
        $header = $worksheet->getCellByColumnAndRow($col, 1)->getValue();
        echo "<li><strong>Column $col:</strong> " . htmlspecialchars($header) . "</li>";
    }
    echo "</ul>";

    echo "<h3>Total Rows:</h3><p>" . $worksheet->getHighestRow() . " rows (including header)</p>";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>