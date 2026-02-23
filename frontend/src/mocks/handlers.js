import { http, HttpResponse } from 'msw';
import { API_BASE } from '../config';

// Hardcode the MSW path to match any hostname with this route
const API_URL = '*/api/grades.php';

export const handlers = [
    // -------------------------------------------------------------
    // GRADES API
    // -------------------------------------------------------------

    // GET Grades
    http.get(API_URL, ({ request }) => {
        const url = new URL(request.url);
        if (!url.pathname.includes('/grades.php')) return;

        const auth = request.headers.get('Authorization');
        if (!auth) {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const enrollmentId = url.searchParams.get('enrollment_id');
        const subjectId = url.searchParams.get('subject_id');
        const userId = url.searchParams.get('user_id');

        // Case 1: Fetch by enrollment
        if (enrollmentId === '999') {
            return HttpResponse.json({ error: 'Enrollment not found' }, { status: 404 });
        }
        if (enrollmentId) {
            return HttpResponse.json({
                grades: [
                    { criteria_id: 1, component_name: 'Midterm', max_marks: 30, marks_obtained: 25 },
                    { criteria_id: 2, component_name: 'Final', max_marks: 100, marks_obtained: 80 }
                ],
                summary: { total_obtained: 105, total_max: 130, percentage: 80.76 }
            });
        }

        // Case 2: Fetch by subject (Admin views all students)
        if (subjectId) {
            if (subjectId === 'EMPTY') {
                return HttpResponse.json({ data: { criteria: [], enrollments: [], pagination: {} } });
            }
            return HttpResponse.json({
                data: {
                    criteria: [
                        { id: 1, component_name: 'Midterm', max_marks: 30 },
                        { id: 2, component_name: 'Final', max_marks: 100 }
                    ],
                    enrollments: [
                        {
                            id: 101,
                            user_id: 10,
                            full_name: 'John Doe',
                            student_id: 'STU10',
                            final_percentage: 85.5,
                            final_grade: 'A',
                            grades: { 1: 25, 2: 85 }
                        }
                    ],
                    pagination: { page: 1, totalPages: 1 }
                }
            });
        }

        // Case 3: Fetch by student (Student views own grades)
        if (userId) {
            return HttpResponse.json({
                data: [
                    {
                        subject_id: 1,
                        enrollment_id: 101,
                        semester: 1,
                        subject_name: 'Software Testing',
                        subject_code: 'CS101',
                        credits: 3,
                        grades: [
                            { component_name: 'Midterm', marks_obtained: 25, max_marks: 30, weight_percentage: 100 }
                        ],
                        summary: { total_obtained: 25, total_max: 30, percentage: 83.33 },
                        final_percentage: 83.33
                    }
                ]
            });
        }

        return HttpResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }),

    // PUT Grades
    http.put(API_URL, async ({ request }) => {
        const url = new URL(request.url);
        if (!url.pathname.includes('/grades.php')) return;

        const auth = request.headers.get('Authorization');
        if (!auth) {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (body.action === 'recalculate_subject') {
            return HttpResponse.json({ message: 'Grades recalculated successfully for subject' }, { status: 200 });
        }

        if (!body.grades || !Array.isArray(body.grades)) {
            return HttpResponse.json({ error: 'Missing grades array' }, { status: 400 });
        }

        if (body.grades.some(g => g.marks_obtained < 0)) {
            return HttpResponse.json({ error: 'Marks cannot be negative' }, { status: 400 });
        }

        return HttpResponse.json({ message: 'Grades updated successfully' }, { status: 200 });
    }),

    // POST Grades
    http.post(API_URL, async ({ request }) => {
        const url = new URL(request.url);
        if (!url.pathname.includes('/grades.php')) return;

        const auth = request.headers.get('Authorization');
        if (!auth) {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.subject_id || !body.component_name || !body.students) {
            return HttpResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (body.component_name === 'Weight_Too_High') {
            return HttpResponse.json({ error: 'Weights exceed 100%' }, { status: 400 });
        }

        return HttpResponse.json({ message: 'Grades inserted successfully for all assigned students' }, { status: 200 });
    }),
];
