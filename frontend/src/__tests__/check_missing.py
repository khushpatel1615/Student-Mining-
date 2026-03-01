import os, glob

test_files = glob.glob(r'e:\XAMP\htdocs\StudentDataMining\frontend\src\__tests__\*.test.jsx')

failed_imports = []

for tf in test_files:
    with open(tf, 'r', encoding='utf-8') as f:
        content = f.read()

    for line in content.split('\n'):
        if line.startswith('import ') and 'from ' in line:
            parts = line.split("from ")
            if len(parts) > 1:
                path_str = parts[1].strip().strip(';').strip('\'"')
                
                if path_str.startswith('../'):
                    # relative to __tests__
                    target = os.path.normpath(os.path.join(os.path.dirname(tf), path_str))
                    # check if ends with .jsx or .js
                    
                    if not os.path.exists(target):
                        if not os.path.exists(target + '.jsx') and not os.path.exists(target + '.js') and not os.path.exists(target + '.ts') and not os.path.exists(target + '.tsx') and not os.path.exists(target + '/index.js'):
                            failed_imports.append((tf, path_str))

for f, imp in failed_imports:
    print(f"File {os.path.basename(f)}: missing {imp}")
