<?php
require_once '../config/database.php';
$pdo = getDBConnection();

// Get Program IDs
$stmt = $pdo->query("SELECT id, name, code FROM programs WHERE code IN ('BCA', 'MCA') OR name LIKE '%Bachelor of Computer Applications%' OR name LIKE '%Master of Computer Applications%'");
$programs = $stmt->fetchAll();

echo "Found Programs:\n";
print_r($programs);

// Define Subjects Data
$bca_subjects = [
    1 => [ // Semester 1
        ['name' => 'Fundamentals of IT', 'code' => 'BCA101', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Programming in Python', 'code' => 'BCA102', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Descriptive Statistics', 'code' => 'BCA103', 'type' => 'Core', 'credits' => 3],
        ['name' => 'Communication Skills-I', 'code' => 'BCA104', 'type' => 'Core', 'credits' => 2],
        ['name' => 'Environmental Studies', 'code' => 'BCA105', 'type' => 'Open', 'credits' => 2]
    ],
    2 => [ // Semester 2
        ['name' => 'Data Structures', 'code' => 'BCA201', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Networking Essentials', 'code' => 'BCA202', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Operating Systems', 'code' => 'BCA203', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Software Engineering', 'code' => 'BCA204', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Communication Skills-II', 'code' => 'BCA205', 'type' => 'Open', 'credits' => 2]
    ],
    3 => [ // Semester 3
        ['name' => 'Database Management Systems', 'code' => 'BCA301', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Object-Oriented Programming (Java)', 'code' => 'BCA302', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Web Technologies', 'code' => 'BCA303', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Discrete Mathematics', 'code' => 'BCA304', 'type' => 'Core', 'credits' => 3],
        ['name' => 'Technical Writing', 'code' => 'BCA305', 'type' => 'Elective', 'credits' => 2]
    ],
    4 => [ // Semester 4
        ['name' => 'Mobile Application Development', 'code' => 'BCA401', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Computer Graphics', 'code' => 'BCA402', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Cloud Computing', 'code' => 'BCA403', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Principles of AI', 'code' => 'BCA404', 'type' => 'Elective', 'credits' => 3],
        ['name' => 'Advanced Networking', 'code' => 'BCA405', 'type' => 'Elective', 'credits' => 3]
    ],
    5 => [ // Semester 5
        ['name' => 'Cybersecurity', 'code' => 'BCA501', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Software Testing', 'code' => 'BCA502', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Machine Learning Basics', 'code' => 'BCA503', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Open-Source Technologies', 'code' => 'BCA504', 'type' => 'Elective', 'credits' => 3],
        ['name' => 'Project Phase I', 'code' => 'BCA505', 'type' => 'Core', 'credits' => 2]
    ],
    6 => [ // Semester 6
        ['name' => 'Advanced AI and ML', 'code' => 'BCA601', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Internet of Things (IoT)', 'code' => 'BCA602', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Data Analytics', 'code' => 'BCA603', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Major Capstone Project', 'code' => 'BCA604', 'type' => 'Core', 'credits' => 8]
    ]
];

$mca_subjects = [
    1 => [
        ['name' => 'Advanced Java Programming', 'code' => 'MCA101', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Advanced Database Management', 'code' => 'MCA102', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Mathematical Foundation of CS', 'code' => 'MCA103', 'type' => 'Core', 'credits' => 3],
        ['name' => 'Software Project Management', 'code' => 'MCA104', 'type' => 'Core', 'credits' => 3],
        ['name' => 'Python for Data Science', 'code' => 'MCA105', 'type' => 'Core', 'credits' => 4]
    ],
    2 => [
        ['name' => 'Distributed Systems', 'code' => 'MCA201', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Full Stack Web Development', 'code' => 'MCA202', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Cloud Infrastructure Services', 'code' => 'MCA203', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Cyber Security and Forensics', 'code' => 'MCA204', 'type' => 'Elective', 'credits' => 3],
        ['name' => 'Mobile Computing', 'code' => 'MCA205', 'type' => 'Elective', 'credits' => 3]
    ],
    3 => [
        ['name' => 'Big Data Analytics', 'code' => 'MCA301', 'type' => 'Core', 'credits' => 5],
        ['name' => 'Artificial Intelligence & Deep Learning', 'code' => 'MCA302', 'type' => 'Core', 'credits' => 5],
        ['name' => 'DevOps and Containerization', 'code' => 'MCA303', 'type' => 'Core', 'credits' => 4],
        ['name' => 'Blockchain Technology', 'code' => 'MCA304', 'type' => 'Elective', 'credits' => 3]
    ],
    4 => [
        ['name' => 'Industry Internship / Major Project', 'code' => 'MCA401', 'type' => 'Core', 'credits' => 12]
    ]
];

// Insert Function
function insertSubjects($pdo, $programId, $subjectsBySem)
{
    global $bca_subjects;
    $stmt = $pdo->prepare("INSERT IGNORE INTO subjects (program_id, semester, name, code, subject_type, credits, description) VALUES (:pid, :sem, :name, :code, :type, :credits, :desc)");

    foreach ($subjectsBySem as $sem => $subjects) {
        foreach ($subjects as $sub) {
            try {
                $stmt->execute([
                    'pid' => $programId,
                    'sem' => $sem,
                    'name' => $sub['name'],
                    'code' => $sub['code'],
                    'type' => $sub['type'],
                    'credits' => $sub['credits'],
                    'desc' => "Ganpat University Curriculum - Semester $sem"
                ]);
                echo "Inserted: {$sub['name']} ($sem)\n";
            } catch (PDOException $e) {
                echo "Error inserting {$sub['name']}: " . $e->getMessage() . "\n";
            }
        }
    }
}

foreach ($programs as $prog) {
    if (strpos($prog['code'], 'BCA') !== false || strpos($prog['name'], 'Bachelor of Computer Applications') !== false) {
        echo "Inserting BCA subjects for Program ID: {$prog['id']}\n";
        insertSubjects($pdo, $prog['id'], $bca_subjects);
    }
    if (strpos($prog['code'], 'MCA') !== false || strpos($prog['name'], 'Master of Computer Applications') !== false) {
        echo "Inserting MCA subjects for Program ID: {$prog['id']}\n";
        insertSubjects($pdo, $prog['id'], $mca_subjects);
    }
}

?>