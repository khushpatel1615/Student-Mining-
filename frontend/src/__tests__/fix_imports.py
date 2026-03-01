import re
import os

files_to_fix = [
    (r"e:\XAMP\htdocs\StudentDataMining\frontend\src\__tests__\AdminDashboard.test.jsx",
     "import AdminDashboard from '../pages/AdminDashboard'; // Assuming it's in pages",
     "import AdminDashboard from '../pages/AdminDashboard';"),
    
    (r"e:\XAMP\htdocs\StudentDataMining\frontend\src\__tests__\AttendanceManagement.test.jsx",
     "import AttendanceManagement from '../components/AttendanceManagement/AttendanceManagement';",
     "import AttendanceManagement from '../components/AttendanceManagement/AdminAttendance';"),

    (r"e:\XAMP\htdocs\StudentDataMining\frontend\src\__tests__\Header.test.jsx",
     "import Header from '../components/Header/Header';",
     "import Header from '../components/layout/Header';"),
     
    (r"e:\XAMP\htdocs\StudentDataMining\frontend\src\__tests__\Sidebar.test.jsx",
     "import Sidebar from '../components/Sidebar/Sidebar';",
     "import Sidebar from '../components/layout/Sidebar';")
]

for file_path, old_text, new_text in files_to_fix:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = content.replace(old_text, new_text)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
print("Fixed missing imports.")
