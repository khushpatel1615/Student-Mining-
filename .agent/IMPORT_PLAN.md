# Complete Excel Data Import Plan

## Data Source
- File: `1st 3rd 5th 2025 Attendance sheet.xlsx`
- Students: 621 active records
- Semester: 5th
- Subjects: 7 (CPT, NS, PHP-CGM, JAVA, Python, PRO, INE)

## Database Schema Required

### New/Updated Tables Needed:

1. **users table** - Add fields:
   - `batch` (VARCHAR)
   - `class` (VARCHAR)
   - `coordinator` (VARCHAR)
   - `mobile_primary` (VARCHAR)
   - `mobile_secondary` (VARCHAR)

2. **subjects table** - Already exists, populate with:
   - CPT, NS, PHP-CGM, JAVA, Python, PRO, INE

3. **evaluation_criteria table** - Add detailed criteria:
   - T1, T2, MID1 (Tests)
   - P1-P10 (Practicals)
   - A1-A5 (Assignments)

4. **student_grades table** - Use existing structure

5. **attendance table** - New table needed:
   - student_id
   - subject_id
   - date
   - status (lecture/practical)
   - present/absent

## Import Steps

1. Read Excel sheets using SheetJS/PhpSpreadsheet
2. Insert/update 621 students
3. Create 7 subjects for 5th semester
4. Create evaluation criteria for each subject
5. Import marks data (T1, T2, MID1, Practicals, Assignments)
6. Import daily attendance records

## Files to Create

1. `import_student_data.php` - Main import script
2. `update_schema_for_import.sql` - Schema changes
