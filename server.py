import os
from bottle import route, run, static_file

PUBLIC_DIR = os.path.abspath("public")

@route('/')
def index():
    return static_file('index.html', root=PUBLIC_DIR)

@route('/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root=PUBLIC_DIR)

if __name__ == '__main__':
    print(f"Starting server on http://localhost:8088 serving {PUBLIC_DIR}")
    run(host='127.0.0.1', port=8088, quiet=True)
