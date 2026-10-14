#!/usr/bin/env python3
"""Read-only Firebase administration preflight using the existing GitHub identity.

Print only the service account, granted/missing IAM permission names and safe
metadata. No credential files, tokens, users or database documents are logged.
"""

import json
import os
from pathlib import Path
import queue
import subprocess
import sys
import threading
import urllib.error
import urllib.request

PROJECT = "dainyelonthemove"
DATABASE = "dainyel-content"
REQUIRED = {
    "Firebase project": ["firebase.projects.get"],
    "Hosting": ["firebasehosting.sites.get", "firebasehosting.sites.update"],
    "Authentication": ["firebaseauth.configs.get", "firebaseauth.configs.update",
                       "firebaseauth.users.get", "firebaseauth.users.update"],
    "Firestore": ["datastore.databases.getMetadata", "datastore.entities.get",
                  "datastore.entities.list", "datastore.entities.create",
                  "datastore.entities.update", "datastore.entities.delete",
                  "datastore.indexes.create"],
    "Security rules": ["firebaserules.rulesets.get", "firebaserules.rulesets.create",
                       "firebaserules.releases.get", "firebaserules.releases.update"],
    "App Check": ["firebaseappcheck.services.get", "firebaseappcheck.services.update"],
}


def command(arguments):
    result = subprocess.run(arguments, capture_output=True, text=True, timeout=180)
    if result.returncode:
        raise RuntimeError("De geconfigureerde Google-identiteit kon niet worden gecontroleerd.")
    return result.stdout.strip()


class FirebaseMcp:
    def __init__(self):
        self.messages = queue.Queue()
        self.sequence = 0
        self.process = subprocess.Popen(
            ["npx", "-y", "firebase-tools@latest", "mcp", "--dir", str(Path.cwd()), "--only", "core"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, env={**os.environ, "PROJECT_ROOT": str(Path.cwd())},
        )
        threading.Thread(target=self.read_messages, daemon=True).start()

    def read_messages(self):
        for line in self.process.stdout:
            try:
                self.messages.put(json.loads(line))
            except json.JSONDecodeError:
                pass
        self.messages.put(None)

    def send(self, message):
        self.process.stdin.write(json.dumps({"jsonrpc": "2.0", **message}) + "\n")
        self.process.stdin.flush()

    def request(self, method, parameters):
        self.sequence += 1
        request_id = self.sequence
        self.send({"id": request_id, "method": method, "params": parameters})
        while True:
            message = self.messages.get(timeout=90)
            if message is None:
                raise RuntimeError("Firebase MCP is gestopt voordat de controle voltooid was.")
            if message.get("method") == "roots/list" and "id" in message:
                self.send({"id": message["id"], "result": {"roots": [{"uri": Path.cwd().as_uri()}]}})
            elif message.get("id") == request_id:
                if "error" in message:
                    raise RuntimeError("Firebase MCP kon de gevraagde controle niet uitvoeren.")
                return message.get("result", {})

    def initialise(self):
        self.request("initialize", {"protocolVersion": "2024-11-05",
                                    "capabilities": {"roots": {"listChanged": False}},
                                    "clientInfo": {"name": "firebase-admin-check", "version": "1.0"}})
        self.send({"method": "notifications/initialized"})

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()


def check_project_mcp():
    client = FirebaseMcp()
    try:
        client.initialise()
        tools = client.request("tools/list", {}).get("tools", [])
        tool = next((item["name"] for item in tools
                     if item["name"] in ("firebase_get_project", "get_project")), None)
        if not tool:
            return False
        result = client.request("tools/call", {"name": tool, "arguments": {}})
        return bool(result.get("content")) and not result.get("isError", False)
    finally:
        client.close()


def main():
    account = command(["gcloud", "auth", "list", "--filter=status:ACTIVE", "--format=value(account)"])
    if not account.endswith(".gserviceaccount.com") or "\n" in account:
        raise RuntimeError("De controle verwacht het bestaande Google-serviceaccount.")
    print(f"Service account: {account}")
    token = command(["gcloud", "auth", "print-access-token"])
    permissions = [permission for group in REQUIRED.values() for permission in group]
    request = urllib.request.Request(
        f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT}:testIamPermissions",
        data=json.dumps({"permissions": permissions}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json",
                 "x-goog-user-project": PROJECT},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            granted = set(json.load(response).get("permissions", []))
    except urllib.error.HTTPError as error:
        # Print only the HTTP status; response bodies may contain private context.
        try:
            response_error = json.load(error).get("error", {})
            message = response_error.get("message", "")
            referenced = [permission for permission in permissions if permission in message]
            if referenced:
                print("IAM rejected requested permissions: " + ", ".join(referenced))
        except (ValueError, OSError):
            pass
        raise RuntimeError(f"IAM permission check: HTTP {error.code}") from None
    del token
    missing = []
    for name, needed in REQUIRED.items():
        absent = sorted(set(needed) - granted)
        print(f"{name}: {'MISSING ' + ', '.join(absent) if absent else 'OK'}")
        missing.extend(absent)
    metadata_ok = check_project_mcp()
    print(f"Firebase MCP project metadata: {'OK' if metadata_ok else 'not accessible'}")
    if set(REQUIRED["Firestore"]) <= granted:
        raw = command(["npx", "-y", "firebase-tools@latest", "firestore:databases:get", DATABASE,
                       "--project", PROJECT, "--json", "--non-interactive"])
        # Keep the complete command output out of logs; print only the edition.
        parsed = json.loads(raw)
        database = parsed.get("result", {})
        print(f"Firestore database edition: {database.get('databaseEdition', 'not reported')}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with Path(summary).open("a") as output:
            output.write(f"Serviceaccount: `{account}`.\n\n")
            for name, needed in REQUIRED.items():
                absent = sorted(set(needed) - granted)
                output.write(f"- {name}: {'ontbrekend: ' + ', '.join(absent) if absent else 'OK'}\n")
            output.write("\nDeze controle wijzigt geen Firebase-instellingen, gebruikers of gegevens.\n")
    return 1 if missing or not metadata_ok else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError, ValueError, queue.Empty, subprocess.TimeoutExpired) as error:
        if isinstance(error, RuntimeError):
            print(str(error))
        print("De beheercontrole kon niet worden voltooid; er zijn geen Firebase-instellingen gewijzigd.")
        sys.exit(1)
