import os
import shutil
import subprocess
import sys

os.environ['DEBUG'] = 'electron-packager'

webapp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
api_dir = os.path.abspath(os.path.join(webapp_dir, '../api'))
dest_api_dir = os.path.join(webapp_dir, 'dist-packaged', 'Party Manager-win32-x64', 'resources', 'api')

npm_cmd = 'npm.cmd' if sys.platform == 'win32' else 'npm'

print('Building Electron services...', flush=True)
subprocess.run([npm_cmd, 'run', 'build:electron-services'], cwd=webapp_dir, shell=False, check=True)

print('Building API dependencies...', flush=True)
subprocess.run([npm_cmd, 'run', 'build:api-deps'], cwd=webapp_dir, shell=False, check=True)

print('Building frontend assets...', flush=True)
subprocess.run([npm_cmd, 'run', 'build'], cwd=webapp_dir, shell=False, check=True)

# Find npx-cli.js path to run it via Node.js directly. This bypasses cmd.exe wrappers
# on Windows which strip caret (^) characters from command arguments.
npx_cli_path = None
import shutil as py_shutil
node_path = py_shutil.which('node')
if node_path:
    # Windows default structure
    candidate1 = os.path.join(os.path.dirname(node_path), 'node_modules', 'npm', 'bin', 'npx-cli.js')
    if os.path.exists(candidate1):
        npx_cli_path = candidate1
    else:
        # Unix/macOS default structure
        candidate2 = os.path.join(os.path.dirname(node_path), '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js')
        candidate2 = os.path.abspath(candidate2)
        if os.path.exists(candidate2):
            npx_cli_path = candidate2

print('Running electron-packager...', flush=True)
packager_args = [
    'electron-packager', '.', 'Party Manager',
    '--platform=win32', '--arch=x64', '--out=dist-packaged', '--overwrite',
    '--ignore=^/node_modules/rpg-party-manager$',
    '--ignore=^/node_modules/rpg-party-manager/',
    '--ignore=^/src$',
    '--ignore=^/src/',
    '--ignore=^/dist-packaged$',
    '--ignore=^/dist-packaged/',
    '--ignore=^/dist-electron$',
    '--ignore=^/dist-electron/',
    '--ignore=^/Documents$',
    '--ignore=^/Documents/',
    '--ignore=^/scripts$',
    '--ignore=^/scripts/',
    '--ignore=\\.rar$'
]

if npx_cli_path:
    subprocess.run(['node', npx_cli_path, '-y'] + packager_args, cwd=webapp_dir, shell=False, check=True)
else:
    npx_cmd = 'npx.cmd' if sys.platform == 'win32' else 'npx'
    subprocess.run([npx_cmd, '-y'] + packager_args, cwd=webapp_dir, shell=False, check=True)

print('Copying api folder to packaged app resources...', flush=True)
if os.path.exists(dest_api_dir):
    shutil.rmtree(dest_api_dir)

def ignore_patterns(path, names):
    ignored = []
    for name in names:
        if name in ('.git', '.env', '.env.local', 'party-manager', 'rpg-party-manager'):
            ignored.append(name)
    return ignored

shutil.copytree(api_dir, dest_api_dir, ignore=ignore_patterns)
print('Portable packaging complete! Executable is at: webapp/dist-packaged/Party Manager-win32-x64/Party Manager.exe', flush=True)

