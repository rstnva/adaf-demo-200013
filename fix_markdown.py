#!/usr/bin/env python3
import re
import sys

def fix_markdown_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    fixed_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Fix headings - add blank line before and after if needed
        if line.startswith('#'):
            # Add blank line before heading if previous line isn't blank
            if i > 0 and fixed_lines and fixed_lines[-1].strip() != '':
                fixed_lines.append('\n')
            
            fixed_lines.append(line)
            
            # Add blank line after heading if next line isn't blank and not another heading
            if i + 1 < len(lines) and lines[i + 1].strip() != '' and not lines[i + 1].startswith('#'):
                fixed_lines.append('\n')
        
        # Fix lists - add blank line before first list item if needed
        elif line.strip().startswith('-') and i > 0:
            prev_line = fixed_lines[-1] if fixed_lines else ''
            if prev_line.strip() != '' and not prev_line.strip().startswith('-'):
                fixed_lines.append('\n')
            fixed_lines.append(line)
        
        # Fix code blocks - add blank lines around them
        elif line.strip().startswith('```'):
            # Add blank line before code block
            if i > 0 and fixed_lines and fixed_lines[-1].strip() != '':
                fixed_lines.append('\n')
            fixed_lines.append(line)
            # Add blank line after closing code block
            if line.count('```') % 2 == 0:  # closing block
                if i + 1 < len(lines) and lines[i + 1].strip() != '':
                    fixed_lines.append('\n')
        
        # Fix bare URLs - wrap in <>
        elif 'http://' in line or 'https://' in line:
            # Look for bare URLs and wrap them
            line = re.sub(r'(\s|^)(https?://[^\s\]]+)(\s|$)', r'\1<\2>\3', line)
            fixed_lines.append(line)
        
        else:
            fixed_lines.append(line)
        
        i += 1
    
    # Clean up multiple consecutive blank lines
    result = []
    prev_blank = False
    for line in fixed_lines:
        if line.strip() == '':
            if not prev_blank:
                result.append(line)
            prev_blank = True
        else:
            result.append(line)
            prev_blank = False
    
    with open(filepath, 'w') as f:
        f.writelines(result)

if __name__ == '__main__':
    fix_markdown_file('docs/runbooks/README.md')
    print("Fixed docs/runbooks/README.md")
