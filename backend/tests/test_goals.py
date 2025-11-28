"""Tests for the goals module."""
import pytest
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User, SalesGoal, Order
from app.goals import get_fiscal_month_info, calculate_progress_item


class TestFiscalMonthInfo:
    """Test fiscal month calculation logic."""
    
    def test_fiscal_month_mid_month(self):
        """Test fiscal month info for a date in the middle of the month."""
        ref_date = date(2024, 11, 15)
        year, month, period_label = get_fiscal_month_info(ref_date)
        assert year == 2024
        assert month == 11
        assert "November" in period_label or "Nov" in period_label
    
    def test_fiscal_month_after_28th(self):
        """Test that dates after 28th belong to next month's fiscal period."""
        # After the 28th 6pm, we're in next month's fiscal period
        ref_date = date(2024, 11, 29)
        year, month, period_label = get_fiscal_month_info(ref_date)
        assert month == 12  # Should be December fiscal month
    
    def test_fiscal_month_year_boundary(self):
        """Test fiscal month calculation at year boundary."""
        ref_date = date(2024, 12, 29)  # After Dec 28
        year, month, period_label = get_fiscal_month_info(ref_date)
        assert year == 2025
        assert month == 1


class TestGoalProgressCalculation:
    """Test goal progress calculations using calculate_progress_item."""
    
    def test_progress_item_with_target(self):
        """Test progress item calculation with a target set."""
        # calculate_progress_item(target, current, days_elapsed, days_total)
        progress = calculate_progress_item(20, 15, 15, 30)
        assert progress["current"] == 15
        assert progress["target"] == 20
        assert progress["progress"] == 75.0  # 15/20 * 100
    
    def test_progress_item_exceeds_target(self):
        """Test progress item when exceeding target."""
        progress = calculate_progress_item(40, 50, 15, 30)
        assert progress["current"] == 50
        assert progress["target"] == 40
        assert progress["progress"] == 125.0  # 50/40 * 100
    
    def test_progress_item_no_target(self):
        """Test progress item with no target set (0)."""
        progress = calculate_progress_item(0, 5, 15, 30)
        assert progress["target"] == 0
        assert progress["progress"] == 0  # No target means 0 progress


class TestGoalEndpoints:
    """Test goal API endpoints."""
    
    def test_get_current_goal(self, client: TestClient, auth_headers: dict):
        """Test getting current month's goal."""
        response = client.get("/api/goals", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should return goal structure even if empty
        assert "year" in data
        assert "month" in data
    
    def test_update_goal(self, client: TestClient, auth_headers: dict):
        """Test updating a goal."""
        goal_update = {
            "target_psu": 25,
            "target_revenue": 5000.0,
            "target_internet": 10
        }
        response = client.put("/api/goals", json=goal_update, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["target_psu"] == 25
        assert data["target_revenue"] == 5000.0
        assert data["target_internet"] == 10
    
    def test_get_goal_progress(self, client: TestClient, auth_headers: dict):
        """Test getting goal progress."""
        response = client.get("/api/goals/progress", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "overall_status" in data
    
    def test_get_goal_history(self, client: TestClient, auth_headers: dict):
        """Test getting goal history."""
        response = client.get("/api/goals/history?months=3", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert "achievement_rate" in data
    
    def test_clear_goal(self, client: TestClient, auth_headers: dict):
        """Test clearing current month's goal."""
        response = client.delete("/api/goals", headers=auth_headers)
        assert response.status_code == 200
    
    def test_goal_requires_auth(self, client: TestClient):
        """Test that goal endpoints require authentication."""
        response = client.get("/api/goals")
        assert response.status_code in [401, 403]
