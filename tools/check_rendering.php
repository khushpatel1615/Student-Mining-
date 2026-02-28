<?php
$pdo = new PDO('mysql:host=localhost;dbname=student_data_mining', 'root', '');
// Let's check exactly where the "Total Students" vs "Total Teachers" bug is.
// When looking at AdminDashboard Data hooks:
// `systemStats.totalTeachers` is rendered alongside the student count in DashboardKPIs:
// <div className="kpi-trend neutral">
//      <Users size={14} />
//      <span>{systemStats.totalTeachers} teachers</span>
// </div>

// So why does the actual front-end display show the teacher string instead of the student count?
// In useAdminDashboardData.js:
// setSystemStats(prev => ({
//      totalStudents: system_overview?.total_students || 0,
//      totalTeachers: system_overview?.total_teachers || 0,
// ...

$stmt = $pdo->query("SELECT role, COUNT(*), is_active FROM users GROUP BY role, is_active");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
