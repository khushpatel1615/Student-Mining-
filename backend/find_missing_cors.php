<?php
$dir = 'api';
$it = new RecursiveDirectoryIterator($dir);
foreach (new RecursiveIteratorIterator($it) as $file) {
    if ($file->getExtension() === 'php') {
        $content = file_get_contents($file->getPathname());
        if (strpos($content, 'handleCORS') === false) {
            echo $file->getPathname() . "\n";
        }
    }
}
