"""Tests for scheduler functionality."""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


def test_get_scheduler_status_not_running():
    """Test status when scheduler is not running."""
    from app.scheduler import get_scheduler_status, scheduler

    with patch.object(scheduler, 'running', False):
        status = get_scheduler_status()
        assert status["running"] is False
        assert status["jobs"] == []
        assert "scheduled_reports_count" in status


def test_get_scheduler_status_running():
    """Test status when scheduler is running."""
    from app.scheduler import get_scheduler_status, scheduler

    mock_job = MagicMock()
    mock_job.id = "test_job"
    mock_job.next_run_time = datetime.now()
    mock_job.trigger = "cron[hour='*']"

    with patch.object(scheduler, 'running', True):
        with patch.object(scheduler, 'get_jobs', return_value=[mock_job]):
            status = get_scheduler_status()
            assert status["running"] is True
            assert len(status["jobs"]) == 1
            assert status["jobs"][0]["id"] == "test_job"
            assert status["jobs"][0]["next_run"] is not None
            assert "cron" in status["jobs"][0]["trigger"]


def test_get_scheduler_status_running_no_next_run():
    """Test status when scheduler is running but job has no next_run_time."""
    from app.scheduler import get_scheduler_status, scheduler

    mock_job = MagicMock()
    mock_job.id = "paused_job"
    mock_job.next_run_time = None
    mock_job.trigger = "cron[hour='*']"

    with patch.object(scheduler, 'running', True):
        with patch.object(scheduler, 'get_jobs', return_value=[mock_job]):
            status = get_scheduler_status()
            assert status["running"] is True
            assert len(status["jobs"]) == 1
            assert status["jobs"][0]["next_run"] is None


def test_scheduler_status_endpoint_requires_admin(client, auth_headers):
    """Test that non-admin cannot access scheduler status."""
    response = client.get("/api/admin/scheduler/status", headers=auth_headers)
    assert response.status_code == 403


def test_scheduler_status_endpoint_admin_access(client, admin_auth_headers):
    """Test that admin can access scheduler status."""
    response = client.get("/api/admin/scheduler/status", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "running" in data
    assert "jobs" in data
    assert "scheduled_reports_count" in data


def test_is_scheduler_enabled_default_true():
    """Test that scheduler is enabled by default."""
    import os
    from app.config import is_scheduler_enabled

    # Save current value
    original = os.environ.get("SCHEDULER_ENABLED")

    # Remove the env var to test default
    if "SCHEDULER_ENABLED" in os.environ:
        del os.environ["SCHEDULER_ENABLED"]

    try:
        assert is_scheduler_enabled() is True
    finally:
        # Restore original value
        if original is not None:
            os.environ["SCHEDULER_ENABLED"] = original
        else:
            os.environ["SCHEDULER_ENABLED"] = "false"  # Re-disable for tests


def test_is_scheduler_enabled_false():
    """Test that scheduler can be disabled via env var."""
    import os
    from app.config import is_scheduler_enabled

    original = os.environ.get("SCHEDULER_ENABLED")
    os.environ["SCHEDULER_ENABLED"] = "false"

    try:
        assert is_scheduler_enabled() is False
    finally:
        if original is not None:
            os.environ["SCHEDULER_ENABLED"] = original


def test_is_scheduler_enabled_case_insensitive():
    """Test that SCHEDULER_ENABLED handles case variations."""
    import os
    from app.config import is_scheduler_enabled

    original = os.environ.get("SCHEDULER_ENABLED")

    try:
        os.environ["SCHEDULER_ENABLED"] = "TRUE"
        assert is_scheduler_enabled() is True

        os.environ["SCHEDULER_ENABLED"] = "True"
        assert is_scheduler_enabled() is True

        os.environ["SCHEDULER_ENABLED"] = "FALSE"
        assert is_scheduler_enabled() is False
    finally:
        if original is not None:
            os.environ["SCHEDULER_ENABLED"] = original
        else:
            os.environ["SCHEDULER_ENABLED"] = "false"


def test_start_scheduler_with_initial_checks_false():
    """Test that start_scheduler skips initial checks when run_initial_checks=False."""
    from app.scheduler import start_scheduler, shutdown_scheduler, scheduler

    # Mock the scheduler and job functions
    with patch.object(scheduler, 'running', False):
        with patch.object(scheduler, 'add_job') as mock_add_job:
            with patch.object(scheduler, 'start') as mock_start:
                with patch('app.scheduler.check_installation_reminders') as mock_check1:
                    with patch('app.scheduler.check_today_installations') as mock_check2:
                        with patch('app.scheduler.check_due_followups') as mock_check3:
                            # Use run_initial_checks=False
                            start_scheduler(run_initial_checks=False)

                            # Scheduler should start
                            mock_start.assert_called_once()

                            # But initial checks should NOT run
                            mock_check1.assert_not_called()
                            mock_check2.assert_not_called()
                            mock_check3.assert_not_called()
