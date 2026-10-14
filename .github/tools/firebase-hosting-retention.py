#!/usr/bin/env python3
"""Inspect Hosting metadata and set Firebase's native release retention limits.

Only the two existing Hosting sites are in scope. This does not deploy, delete
sites or channels, read website files, or touch OneDrive or database records.
Old release content is removed by Firebase according to its retention policy.
"""

import argparse
from collections import Counter
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

PROJECT = "dainyelonthemove"
SITES = {"dainyelonthemove": 2, "dainyelonthemove-staging": 1}
ORIGIN = "https://firebasehosting.googleapis.com/v1beta1/"


class Hosting:
    def __init__(self, token):
        self.token = token

    def request(self, path, method="GET", body=None, query=None):
        url = ORIGIN + path
        if query:
            url += "?" + urllib.parse.urlencode(query)
        request = urllib.request.Request(
            url, method=method,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": "Bearer " + self.token,
                     "Content-Type": "application/json", "x-goog-user-project": PROJECT},
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            # Provider bodies and URLs are never printed; they can contain secrets.
            raise RuntimeError(f"Hosting metadata request: HTTP {error.code}") from None

    def collection(self, path, key, fields):
        items, token = [], ""
        seen = set()
        while True:
            query = {"pageSize": 100, "fields": "nextPageToken," + fields}
            if token:
                query["pageToken"] = token
            result = self.request(path, query=query)
            page = result.get(key, [])
            if not isinstance(page, list):
                raise RuntimeError("Hosting returned unexpected collection metadata.")
            items.extend(page)
            token = result.get("nextPageToken", "")
            if not token:
                return items
            if token in seen:
                raise RuntimeError("Hosting pagination did not complete.")
            seen.add(token)


def inspect_site(client, site):
    base = f"sites/{site}"
    channels = client.collection(
        base + "/channels", "channels",
        "channels(name,retainedReleaseCount,expireTime,release(name,releaseTime,"
        "version(name,status,versionBytes)))",
    )
    versions = client.collection(
        base + "/versions", "versions", "versions(name,status,versionBytes)",
    )
    if not any(channel.get("name", "").endswith("/channels/live") for channel in channels):
        raise RuntimeError("The existing live channel could not be verified.")
    stored = [version for version in versions if version.get("status") not in ("DELETED", "ABANDONED")]
    version_sizes = {version["name"]: int(version.get("versionBytes", 0)) for version in stored}
    report = {
        "site": site, "version_status_counts": dict(Counter(v.get("status", "UNKNOWN") for v in versions)),
        "stored_version_count": len(stored),
        # Sum of version sizes is not a measurement of deduplicated billing storage.
        "sum_of_stored_version_sizes_GiB": round(sum(version_sizes.values()) / 2**30, 4),
        "channels": [],
    }
    for channel in channels:
        match = re.fullmatch(rf"(?:projects/[^/]+/)?sites/{re.escape(site)}/channels/([A-Za-z0-9_-]+)",
                             channel.get("name", ""))
        if not match:
            raise RuntimeError("Hosting channel metadata is outside the expected site.")
        channel_id = match.group(1)
        release = channel.get("release", {})
        version = release.get("version", {})
        size = int(version.get("versionBytes", version_sizes.get(version.get("name"), 0)))
        report["channels"].append({
            "channel": channel_id,
            "retained_release_count": channel.get("retainedReleaseCount"),
            "desired_retained_release_count": SITES[site] if channel_id == "live" else 1,
            "active_version_size_GiB": round(size / 2**30, 4),
            "has_active_version": bool(version.get("name")),
            "expires": channel.get("expireTime", "never"),
        })
    return report


def apply_retention(client, report):
    site = report["site"]
    if site not in SITES:
        raise RuntimeError("The requested site is outside the existing project targets.")
    for channel in report["channels"]:
        desired = channel["desired_retained_release_count"]
        expected = SITES[site] if channel["channel"] == "live" else 1
        if desired != expected:
            raise RuntimeError("The requested retention limit is outside the fixed policy.")
        if channel["retained_release_count"] == desired:
            continue
        channel_id = channel["channel"]
        if not re.fullmatch(r"[A-Za-z0-9_-]+", channel_id):
            raise RuntimeError("The channel identifier is invalid.")
        path = f"sites/{site}/channels/{channel_id}"
        # Check existence immediately before patch: PATCH can otherwise create a channel.
        current = client.request(path, query={"fields": "name,retainedReleaseCount"})
        if not re.fullmatch(rf"(?:projects/[^/]+/)?sites/{re.escape(site)}/channels/{re.escape(channel_id)}",
                            current.get("name", "")):
            raise RuntimeError("The existing channel could not be confirmed.")
        result = client.request(path, method="PATCH", body={"retainedReleaseCount": desired},
                                query={"updateMask": "retainedReleaseCount",
                                       "fields": "name,retainedReleaseCount"})
        if result.get("retainedReleaseCount") != desired:
            raise RuntimeError("The release retention limit was not confirmed.")
        print(f"Retention set: {site}/{channel_id} = {desired}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Apply the native release retention limits.")
    arguments = parser.parse_args()
    config = json.loads(Path(".firebaserc").read_text())
    targets = config.get("targets", {}).get(PROJECT, {}).get("hosting", {})
    if targets.get("production") != ["dainyelonthemove"] or targets.get("staging") != ["dainyelonthemove-staging"]:
        raise RuntimeError("The existing Firebase project targets have changed.")
    token_result = subprocess.run(["gcloud", "auth", "print-access-token"],
                                  capture_output=True, text=True, timeout=60)
    if token_result.returncode or not token_result.stdout.strip():
        raise RuntimeError("The existing Google service account is not available.")
    client = Hosting(token_result.stdout.strip())
    sites = client.collection(f"projects/{PROJECT}/sites", "sites", "sites(name)")
    if not set(SITES) <= {site.get("name", "").split("/")[-1] for site in sites}:
        raise RuntimeError("The existing Hosting sites were not found in this project.")
    reports = [inspect_site(client, site) for site in SITES]
    print("Hosting retention mode: " + ("apply" if arguments.apply else "audit only"))
    for report in reports:
        print(json.dumps(report, sort_keys=True))
    if arguments.apply:
        for report in reports:
            apply_retention(client, report)
        print("After setting native retention:")
        for site in SITES:
            print(json.dumps(inspect_site(client, site), sort_keys=True))
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with Path(summary).open("a") as output:
            output.write("Hosting-opslag gecontroleerd via metadata, zonder websitebestanden te lezen.\n\n")
            output.write("Modus: " + ("native bewaarlimieten ingesteld" if arguments.apply else "alleen controle") + ".\n")
            output.write("De actieve publicaties blijven beschikbaar. Oude content wordt volgens Firebase-retentie opgeruimd.\n")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as error:
        print(str(error))
        sys.exit(1)
    except (OSError, ValueError, KeyError, subprocess.TimeoutExpired):
        print("De Hosting-opslagcontrole kon niet worden voltooid. Controleer de veilige workflow-uitvoer.")
        sys.exit(1)
