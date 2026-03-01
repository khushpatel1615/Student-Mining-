import os, glob, re

target_dir = r'e:\XAMP\htdocs\StudentDataMining\frontend\src\__tests__'

files = glob.glob(os.path.join(target_dir, '*.test.jsx'))

def fix_imports_and_providers(content):
    # Fix import paths for Management components
    # Replace '../components/XYZ' with '../components/XYZ/XYZ'
    def replace_comp_import(m):
        comp = m.group(1)
        return f"from '../components/{comp}/{comp}'"
    
    # Fix explicit imports like from '../components/SubjectManagement';
    content = re.sub(r"from '../components/([A-Za-z0-9_]+Management)'", replace_comp_import, content)
    content = re.sub(r"from '../components/(Sidebar)'", replace_comp_import, content)
    content = re.sub(r"from '../components/(Header)'", replace_comp_import, content)
    
    # Also EnrollmentManagement is lowercase component/enrollment/EnrollmentManagement.jsx
    content = content.replace("from '../components/EnrollmentManagement/EnrollmentManagement'", "from '../components/enrollment/EnrollmentManagement'")
    content = content.replace("from '../components/EnrollmentManagement'", "from '../components/enrollment/EnrollmentManagement'")

    # Mock ThemeContext globally in the file if not already
    if 'useTheme' in content or 'renders correctly' in content or 'App' in content:
        if 'ThemeContext' not in content:
            content = "import { ThemeProvider } from '../context/ThemeContext';\n" + content
            
            # Add ThemeProvider wrap
            content = content.replace('<MemoryRouter>', '<ThemeProvider>\n<MemoryRouter>')
            content = content.replace('</MemoryRouter>', '</MemoryRouter>\n</ThemeProvider>')
            content = content.replace("<MemoryRouter initialEntries={['/']}>", "<ThemeProvider>\n<MemoryRouter initialEntries={['/']}>")
            content = content.replace("<MemoryRouter initialEntries={['/admin/dashboard']}>", "<ThemeProvider>\n<MemoryRouter initialEntries={['/admin/dashboard']}>")
            
            # Wait, some places render without MemoryRouter
            if 'MemoryRouter' not in content and 'render(' in content:
                # Mocking the ThemeContext directly
                pass
            
    return content

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = fix_imports_and_providers(content)

    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)
print('Done fixing test files!')
