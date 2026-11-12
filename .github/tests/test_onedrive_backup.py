"""Synthetic backup checks. No OneDrive connection or credential is used."""
import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('source_backup',Path(__file__).parents[1]/'tools/onedrive-backup.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)


class SourceBackup(unittest.TestCase):
    def test_git_source_backup_requires_its_real_destination_not_the_retired_working_folder(self):
        with (tempfile.TemporaryDirectory() as folder, patch.dict(worker.os.environ,{
            'ONEDRIVE_RCLONE_CONFIG':'[onedrive]\ntype=onedrive\n',
            'RUNNER_TEMP':folder,'GITHUB_WORKSPACE':folder,'GITHUB_STEP_SUMMARY':'',
        }), patch.object(worker.shutil,'which',return_value='/fixture/rclone'), patch.object(worker.subprocess,'run',return_value=SimpleNamespace(stdout='a'*40+'\n')),
             patch.object(worker,'snapshot',return_value=42), patch.object(worker,'run_rclone') as remote, contextlib.redirect_stdout(io.StringIO())):
            self.assertEqual(worker.main(),0)
        arguments=[call.args[1] for call in remote.call_args_list]
        self.assertEqual(len(arguments),2)
        self.assertEqual(arguments[0][:2],['lsf',worker.PROJECT+'/backups'])
        self.assertIn('/private/**',arguments[0])
        self.assertEqual(arguments[1][0],'copyto')
        self.assertEqual(arguments[1][-1],'--immutable')
        self.assertFalse(any('/website' in str(part) for command in arguments for part in command))

    def test_provider_failure_is_classified_without_echoing_paths_or_credentials(self):
        result=SimpleNamespace(returncode=1,stderr='Sensitive fixture detail: directory not found',stdout='')
        with patch.object(worker.subprocess,'run',return_value=result):
            with self.assertRaises(RuntimeError) as caught:
                worker.run_rclone(Path('/fixture/config'),['lsf','fixture'],'Backup destination unavailable.')
        self.assertIn('Category: folder-not-found',str(caught.exception))
        self.assertNotIn('Sensitive fixture detail',str(caught.exception))


if __name__=='__main__':unittest.main()
