import os, sys, json, base64, subprocess, time, urllib.request, urllib.error

GITHUB_TOKEN  = os.environ.get("GITHUB_TOKEN", "")
NETLIFY_TOKEN = os.environ.get("NETLIFY_TOKEN", "")
GITHUB_USER   = os.environ.get("GITHUB_USER", "")
REPO_NAME     = "lila-black-visualizer"
REPO_DIR      = r"d:\game"

if not GITHUB_TOKEN or not GITHUB_USER:
    print("ERROR: Set GITHUB_TOKEN and GITHUB_USER env vars")
    sys.exit(1)

GIT = r"C:\Users\dell\AppData\Local\PortableGit\bin\git.exe"

def gh_api(method, path, data=None, accept="application/vnd.github+json"):
    url = f"https://api.github.com{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"Bearer {GITHUB_TOKEN}")
    req.add_header("Accept", accept)
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  GitHub API error {e.code}: {body}")
        return None

def netlify_api(method, path, data=None, token=None):
    url = f"https://api.netlify.com/api/v1{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"Bearer {token or NETLIFY_TOKEN}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  Netlify API error {e.code}: {body[:300]}")
        return None

def run(cmd, cwd=REPO_DIR, env=None):
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        print(f"  CMD failed: {' '.join(cmd)}")
        print(f"  STDERR: {result.stderr[:500]}")
    return result

print("\n=== STEP 1: Configure Git identity ===")
run([GIT, "config", "user.email", "deploy@lilatools.dev"])
run([GIT, "config", "user.name", "LILA Deploy"])

print("\n=== STEP 2: Commit all latest changes ===")
run([GIT, "add", "-A"])
result = run([GIT, "commit", "-m", "feat: final UI polish - heatmap pills, overview bar, date filtering"])
print(result.stdout.strip() or "Nothing to commit or committed")

print("\n=== STEP 3: Create/verify GitHub repo ===")
existing = gh_api("GET", f"/repos/{GITHUB_USER}/{REPO_NAME}")
if existing:
    print(f"  Repo already exists: {existing['html_url']}")
    clone_url = existing["clone_url"]
else:
    print("  Creating new repo...")
    new_repo = gh_api("POST", "/user/repos", {
        "name": REPO_NAME,
        "description": "LILA BLACK Player Journey Visualization Tool — Level Designer Telemetry Dashboard",
        "private": False,
        "has_issues": False,
        "has_projects": False,
        "has_wiki": False
    })
    if not new_repo:
        print("ERROR: Could not create repo")
        sys.exit(1)
    clone_url = new_repo["clone_url"]
    print(f"  Created: {new_repo['html_url']}")
    time.sleep(2)

print("\n=== STEP 4: Push to GitHub ===")
# Set authenticated remote
auth_url = clone_url.replace("https://", f"https://{GITHUB_TOKEN}@")
run([GIT, "remote", "remove", "origin"])
run([GIT, "remote", "add", "origin", auth_url])
result = run([GIT, "push", "-u", "origin", "master", "--force"])
if result.returncode == 0:
    print(f"  Pushed to: https://github.com/{GITHUB_USER}/{REPO_NAME}")
else:
    print("  Push failed, trying main branch...")
    run([GIT, "branch", "-M", "main"])
    result = run([GIT, "push", "-u", "origin", "main", "--force"])
    if result.returncode != 0:
        print("ERROR: Push failed")
        sys.exit(1)

if NETLIFY_TOKEN:
    print("\n=== STEP 5: Deploy to Netlify ===")
    # Check for existing site
    sites = netlify_api("GET", "/sites")
    site = next((s for s in (sites or []) if s.get("name", "").startswith(REPO_NAME)), None)
    
    if site:
        site_id = site["id"]
        print(f"  Found existing site: {site['ssl_url']}")
    else:
        print("  Creating Netlify site...")
        site = netlify_api("POST", "/sites", {
            "name": REPO_NAME,
            "custom_domain": None
        })
        if not site:
            print("  Could not create site")
            site_id = None
        else:
            site_id = site["id"]
            print(f"  Created site: {site.get('ssl_url', '?')}")
    
    if site_id:
        print("  Uploading public/ directory as deploy...")
        # Use zip deploy
        import zipfile, io
        buf = io.BytesIO()
        public_dir = os.path.join(REPO_DIR, "public")
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(public_dir):
                for file in files:
                    filepath = os.path.join(root, file)
                    arcname = os.path.relpath(filepath, public_dir)
                    zf.write(filepath, arcname)
        zip_data = buf.getvalue()
        print(f"  Zip size: {len(zip_data)/1024/1024:.1f} MB")
        
        deploy_url = f"https://api.netlify.com/api/v1/sites/{site_id}/deploys"
        req = urllib.request.Request(deploy_url, data=zip_data, method="POST")
        req.add_header("Authorization", f"Bearer {NETLIFY_TOKEN}")
        req.add_header("Content-Type", "application/zip")
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                deploy = json.loads(r.read())
            print(f"\n  Deploy ID: {deploy.get('id')}")
            print(f"  State: {deploy.get('state')}")
            live_url = site.get("ssl_url") or site.get("url") or f"https://{REPO_NAME}.netlify.app"
            print(f"\n{'='*50}")
            print(f"  LIVE URL:   {live_url}")
            print(f"  GITHUB:     https://github.com/{GITHUB_USER}/{REPO_NAME}")
            print(f"{'='*50}")
        except Exception as ex:
            print(f"  Deploy upload error: {ex}")
else:
    print("\n=== STEP 5: Netlify token not set — enabling GitHub Pages instead ===")
    # Enable GitHub Pages
    gh_api("POST", f"/repos/{GITHUB_USER}/{REPO_NAME}/pages", {
        "source": {"branch": "master", "path": "/public"}
    })
    print(f"\n  GitHub Pages URL: https://{GITHUB_USER}.github.io/{REPO_NAME}/")
    print(f"  (May take 1-2 min to go live)")
    print(f"\n  GITHUB: https://github.com/{GITHUB_USER}/{REPO_NAME}")

print("\nDone!")
