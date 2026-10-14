#!/usr/bin/env python3
"""Back up the checked-out Git commit to the authorised OneDrive project folder.

Credentials stay in a temporary 0600 file outside the checkout. Rclone output
is never logged. Existing files and backups are never synchronised or deleted.
"""

import configparser
import datetime
import fnmatch
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

PROJECT = "onedrive:DainyelOnTheMove website"
EXCLUDED_DIRS = {"private", ".git", ".firebase", "node_modules", "__pycache__", "backups"}


def eligible(path):
    return not (any(part in EXCLUDED_DIRS for part in path.parts)
                or path.name.startswith(".env")
                or path.name == "rclone.conf"
                or fnmatch.fnmatch(path.name.lower(), "*service-account*.json"))


def snapshot(repo, archive, commit):
    tracked = subprocess.run(["git", "ls-files", "-z"], cwd=repo,
                             check=True, capture_output=True).stdout
    count = 0
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for name in tracked.split(b"\0"):
            if not name:
                continue
            relative = Path(os.fsdecode(name))
            if not eligible(relative):
                continue
            source = repo / relative
            # Do not dereference symlinks, including a parent directory symlink.
            if any((repo / Path(*relative.parts[:i])).is_symlink()
                   for i in range(1, len(relative.parts) + 1)):
                continue
            if not source.is_file():
                raise RuntimeError("Een gevolgd websitebestand ontbreekt in de checkout.")
            if source.suffix.lower() == ".mp4":
                with source.open("rb") as media:
                    if media.read(80).startswith(b"version https://git-lfs.github.com/spec/v1"):
                        raise RuntimeError("Git LFS-media zijn nog niet gedownload; back-up afgebroken.")
            output.write(source, relative.as_posix())
            count += 1
        output.writestr("cloud-backup-info.txt", (
            f"Git commit: {commit}\n"
            f"Created UTC: {datetime.datetime.now(datetime.timezone.utc).isoformat()}\n"
            "Source: tracked website files from the GitHub checkout\n"
            "Excluded: private material, credentials, caches, dependencies and Git internals\n"
        ))
    if not count:
        raise RuntimeError("De checkout bevat geen websitebestanden voor een back-up.")
    return count


def run_rclone(config, arguments, message):
    result = subprocess.run(["rclone", "--config", str(config),
                             "--retries", "3", *arguments],
                            capture_output=True, text=True)
    if result.returncode:
        # Errors may include sensitive provider payloads; keep them out of logs.
        raise RuntimeError(message)


def main():
    value = os.environ.pop("ONEDRIVE_RCLONE_CONFIG", "")
    if not value.strip():
        print("Het GitHub-geheim ONEDRIVE_RCLONE_CONFIG ontbreekt.")
        return 1
    config = configparser.ConfigParser(interpolation=None)
    try:
        config.read_string(value.lstrip("\ufeff"))
        if config.get("onedrive", "type", fallback="") != "onedrive":
            raise ValueError()
    except (configparser.Error, ValueError):
        print("Het geheim moet de rclone-configuratie met de verbinding 'onedrive' bevatten.")
        return 1
    if not shutil.which("rclone"):
        print("Rclone ontbreekt op de cloudrunner.")
        return 1
    repo = Path(os.environ.get("GITHUB_WORKSPACE", Path.cwd())).resolve()
    runner_temp = Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir()))
    temporary = runner_temp / "dainyel-onedrive"
    if temporary.exists():
        print("De tijdelijke back-upmap bestaat al; start op een schone cloudrunner.")
        return 1
    temporary.mkdir(mode=0o700)
    try:
        credential = temporary / "rclone.conf"
        descriptor = os.open(credential, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as output:
            output.write(value.lstrip("\ufeff"))
        del value
        del config
        for name in ("website", "backups"):
            run_rclone(credential, ["lsf", f"{PROJECT}/{name}", "--max-depth", "1",
                                   "--exclude", "/private/**"],
                       f"Cloudtoegang tot de map '{name}' mislukt. Controleer het geheim en de Microsoft-aanmelding.")
        print("Cloudtoegang tot website en backups gecontroleerd.")
        commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo,
                                check=True, capture_output=True, text=True).stdout.strip()
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
        run = os.environ.get("GITHUB_RUN_ID", "local")
        attempt = os.environ.get("GITHUB_RUN_ATTEMPT", "1")
        name = f"cloud_website_{stamp}_{commit[:12]}_{run}_{attempt}.zip"
        archive = temporary / name
        count = snapshot(repo, archive, commit)
        destination = f"{PROJECT}/backups/{name}"
        run_rclone(credential, ["copyto", str(archive), destination, "--immutable"],
                   "Upload van de nieuwe back-up mislukt; bestaande back-ups zijn behouden.")
        print(f"Cloudback-up opgeslagen: backups/{name} ({count} bestanden).")
        summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary:
            with Path(summary).open("a") as output:
                output.write(f"OneDrive-projectmappen bereikbaar. Nieuwe back-up: `backups/{name}`.\n")
        return 0
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(str(error) if isinstance(error, RuntimeError) else "De cloudback-up kon niet worden voltooid.")
        return 1
    finally:
        shutil.rmtree(temporary)


if __name__ == "__main__":
    sys.exit(main())
