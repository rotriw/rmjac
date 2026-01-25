import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Regex to find async functions
    # Group 1: function name
    # Group 2: params part (e.g. "params: GetListParams" or "")
    # Group 3: body
    # This is hard because of nested braces. 
    # Instead, let's process line by line or use a simpler heuristic.
    
    # Heuristic:
    # If a function signature line has "params:", then subsequent "get<...>(url)" should be "get<...>(url, params)".
    
    lines = content.split('\n')
    new_lines = []
    in_function_with_params = False
    
    for line in lines:
        if 'export async function' in line:
            if 'params:' in line:
                in_function_with_params = True
            else:
                in_function_with_params = False
        
        if in_function_with_params and 'await get<' in line and '(url)' in line:
            line = line.replace('(url)', '(url, params)')
            
        new_lines.append(line)
        
    new_content = '\n'.join(new_lines)
    
    if new_content != content:
        print(f"Updating {filepath}")
        with open(filepath, 'w') as f:
            f.write(new_content)

def main():
    dirs = ['packages/frontend/src/api/client', 'packages/frontend/src/api/server']
    for d in dirs:
        if not os.path.exists(d):
            continue
        for filename in os.listdir(d):
            if filename.endswith('.ts'):
                process_file(os.path.join(d, filename))

if __name__ == '__main__':
    main()

