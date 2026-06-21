from oletools.olevba import VBA_Parser

parser = VBA_Parser('Party Manager 2.7.xlsm')
if parser.detect_vba_macros():
    with open('macros.txt', 'w', encoding='utf-8') as f:
        for (filename, stream_path, vba_filename, vba_code) in parser.extract_macros():
            f.write(f'==========================================\n')
            f.write(f'File: {filename}\n')
            f.write(f'Stream: {stream_path}\n')
            f.write(f'VBA Filename: {vba_filename}\n')
            f.write(f'------------------------------------------\n')
            f.write(vba_code)
            f.write(f'\n\n')
parser.close()
