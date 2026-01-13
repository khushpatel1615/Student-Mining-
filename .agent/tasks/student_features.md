# Student Dashboard Feature Expansion Plan

Based on the "Student Data Mining" theme, the following features are proposed to be added to the Main Menu.

## 1. Skills Competency Map (Completed)
- **Status**: Implemented.
- **Description**: Visualizes student strengths (Logic, Creativity, etc.) based on grades.
- **Files**: `StudentSkills.jsx`, `skills.php`.

## 2. Interactive Degree Roadmap (Proposed)
- **Concept**: A Kanban-style or Timeline view of the student's 4-year journey.
- **Why**: Helps students visualize their progress towards graduation ("Mining" their path).
- **Features**:
    - "Completed", "In Progress", "Planned" columns.
    - Drag-and-drop course planning.
    - Credit calculation per semester.
- **Backend**: Needs `degree_requirements` logic (can mock for now based on subjects).

## 3. Career Pathways Predictor (Proposed)
- **Concept**: Uses the student's "Skill Map" to suggest potential career paths.
- **Why**: The ultimate goal of "Data Mining" student performance is career optimization.
- **Features**:
    - "Match Score" for careers (e.g., "90% Match for Data Scientist").
    - Recommended electives to boost specific career matches.
    - Internship suggestions.

## 4. Resource & Document Hub (Proposed)
- **Concept**: Centralized library for finding subject materials.
- **Why**: Utility feature requested by users.
- **Features**:
    - Filter by Subject.
    - Download past papers/notes.
    - (Optional) Upload notes (Community feature).

## Implementation Order
1.  **Skills Map** (Done).
2.  **Degree Roadmap** (High Visual Impact).
3.  **Career Predictor** (High/Advanced Value).
4.  **Resource Hub** (Utility).
