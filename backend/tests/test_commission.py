"""
Tests for commission calculation logic
"""
import pytest
from datetime import date, datetime, timedelta
from app.models import User, Order, CommissionSettings
from app.auth import create_access_token
from app.commission import (
    get_fiscal_month_boundaries,
    get_previous_fiscal_month,
    is_order_in_fiscal_month,
    get_rate_tier,
    get_effective_rates,
    calculate_tax_breakdown,
    REGULAR_RATE_TABLE,
    NEW_HIRE_RATE_TABLE,
    RAMP_TABLE
)
import bcrypt


@pytest.fixture
def authenticated_user(db):
    """Create a verified user and return user + token"""
    password = "testpassword123"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        email="test@example.com",
        password=hashed_password,
        salesid=12345,
        name="Test User",
        email_verified=True,
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(data={"sub": str(user.userid)})
    return user, token


class TestFiscalMonthBoundaries:
    """Test fiscal month boundary calculations"""
    
    def test_fiscal_month_mid_month(self):
        """Test fiscal month boundaries for a mid-month date"""
        # Nov 15 should be in November fiscal month (Oct 28 6pm - Nov 28 6pm)
        test_date = date(2025, 11, 15)
        start_dt, end_dt, label = get_fiscal_month_boundaries(test_date)
        
        assert start_dt.month == 10
        assert start_dt.day == 28
        assert end_dt.month == 11
        assert end_dt.day == 28
        assert "November" in label
    
    def test_fiscal_month_after_28th(self):
        """Test fiscal month boundaries for date after 28th"""
        # Nov 29 should be in December fiscal month (Nov 28 6pm - Dec 28 6pm)
        test_date = date(2025, 11, 29)
        start_dt, end_dt, label = get_fiscal_month_boundaries(test_date)
        
        assert start_dt.month == 11
        assert start_dt.day == 28
        assert end_dt.month == 12
        assert end_dt.day == 28
        assert "December" in label
    
    def test_fiscal_month_year_boundary(self):
        """Test fiscal month boundaries at year end"""
        # Dec 29 should be in January fiscal month of next year
        test_date = date(2025, 12, 29)
        start_dt, end_dt, label = get_fiscal_month_boundaries(test_date)
        
        assert start_dt.month == 12
        assert start_dt.year == 2025
        assert end_dt.month == 1
        assert end_dt.year == 2026
        assert "January 2026" in label
    
    def test_previous_fiscal_month(self):
        """Test getting previous fiscal month"""
        test_date = date(2025, 11, 15)
        start_dt, end_dt, _ = get_fiscal_month_boundaries(test_date)
        prev_start, prev_end, prev_label = get_previous_fiscal_month(start_dt, end_dt)
        
        assert prev_end == start_dt
        assert prev_start.month == 9
        assert prev_start.day == 28
        assert "October" in prev_label


class TestOrderInFiscalMonth:
    """Test order fiscal month eligibility"""
    
    def test_order_in_fiscal_month(self):
        """Test order within fiscal month boundaries"""
        # Create mock order with install date Nov 15
        class MockOrder:
            install_date = date(2025, 11, 15)
            install_time = "9:00 AM - 11:00 AM"
        
        order = MockOrder()
        start_dt = datetime(2025, 10, 28, 18, 0, 0)
        end_dt = datetime(2025, 11, 28, 18, 0, 0)
        
        assert is_order_in_fiscal_month(order, start_dt, end_dt) is True
    
    def test_order_outside_fiscal_month(self):
        """Test order outside fiscal month boundaries"""
        class MockOrder:
            install_date = date(2025, 10, 20)
            install_time = "9:00 AM - 11:00 AM"
        
        order = MockOrder()
        start_dt = datetime(2025, 10, 28, 18, 0, 0)
        end_dt = datetime(2025, 11, 28, 18, 0, 0)
        
        assert is_order_in_fiscal_month(order, start_dt, end_dt) is False


class TestRateTier:
    """Test commission rate tier calculations"""
    
    def test_tier_0_4_internet(self):
        """Test tier for 0-4 internet (no commission for regular reps)"""
        tier = get_rate_tier(3, is_new_hire=False)
        assert tier["min"] == 0
        assert tier["max"] == 4
        assert tier["internet"] == 0
    
    def test_tier_5_9_internet(self):
        """Test tier for 5-9 internet"""
        tier = get_rate_tier(7, is_new_hire=False)
        assert tier["min"] == 5
        assert tier["max"] == 9
        assert tier["internet"] == 100
        assert tier["mobile"] == 75
    
    def test_tier_40_plus_internet(self):
        """Test tier for 40+ internet (highest tier)"""
        tier = get_rate_tier(50, is_new_hire=False)
        assert tier["min"] == 40
        assert tier["max"] is None
        assert tier["internet"] == 300
        assert tier["mobile"] == 225
    
    def test_new_hire_tier_0_9(self):
        """Test new hire gets full rates even at 0-9 internet"""
        tier = get_rate_tier(3, is_new_hire=True)
        # New hires get rates starting from the first tier
        assert tier["internet"] == 100


class TestEffectiveRates:
    """Test effective commission rates"""
    
    def test_effective_rates_regular_under_5(self):
        """Test regular rep with <5 internet gets $0 for mobile/voice/video"""
        rates = get_effective_rates(3, is_new_hire=False)
        
        assert rates["internet"] == 0
        assert rates["mobile"] == 0
        assert rates["voice"] == 0
        assert rates["video"] == 0
    
    def test_effective_rates_regular_over_5(self):
        """Test regular rep with >5 internet gets full rates"""
        rates = get_effective_rates(10, is_new_hire=False)
        
        assert rates["internet"] == 200
        assert rates["mobile"] == 150
        assert rates["voice"] == 150
        assert rates["video"] == 120
    
    def test_effective_rates_new_hire(self):
        """Test new hire gets full rates regardless of internet count"""
        rates = get_effective_rates(3, is_new_hire=True)
        
        # New hire should get rates even with low internet
        assert rates["internet"] > 0
        assert rates["mobile"] > 0


class TestTaxBreakdown:
    """Test tax calculation logic"""
    
    def test_tax_breakdown_basic(self, db, authenticated_user):
        """Test tax breakdown calculation"""
        user, _ = authenticated_user
        
        # Create commission settings
        settings = CommissionSettings(
            user_id=user.userid,
            federal_bracket=0.22,
            state_code="CA",
            state_tax_rate=0.093
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
        gross = 1000.0
        breakdown = calculate_tax_breakdown(gross, settings)
        
        assert breakdown.gross_commission == 1000.0
        assert breakdown.federal_tax == 220.0  # 22% of 1000
        assert breakdown.state_tax == 93.0     # 9.3% of 1000
        assert breakdown.social_security == 62.0  # 6.2% of 1000
        assert breakdown.medicare == 14.50  # 1.45% of 1000
        
        expected_total_tax = 220 + 93 + 62 + 14.50
        assert breakdown.total_tax == expected_total_tax
        assert breakdown.net_commission == gross - expected_total_tax


class TestCommissionEndpoints:
    """Test commission API endpoints"""
    
    def test_get_commission_settings(self, client, authenticated_user):
        """Test getting commission settings creates default if not exists"""
        _, token = authenticated_user
        
        response = client.get(
            "/api/commission/settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["ae_type"] == "Account Executive"
        assert data["is_new_hire"] is False
    
    def test_update_commission_settings(self, client, authenticated_user):
        """Test updating commission settings"""
        _, token = authenticated_user
        
        # First get to create settings
        client.get(
            "/api/commission/settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Update settings
        response = client.put(
            "/api/commission/settings",
            json={
                "ae_type": "Sr Account Executive",
                "is_new_hire": True,
                "new_hire_month": 3
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["ae_type"] == "Sr Account Executive"
        assert data["is_new_hire"] is True
        assert data["new_hire_month"] == 3
    
    def test_get_rate_tables(self, client, authenticated_user):
        """Test getting commission rate tables"""
        _, token = authenticated_user
        
        response = client.get(
            "/api/commission/rates",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "regular_rates" in data
        assert "new_hire_rates" in data
        assert "alacarte_rates" in data
        assert "ramp_table" in data
    
    def test_get_auto_totals(self, client, authenticated_user):
        """Test getting auto-calculated totals"""
        _, token = authenticated_user
        
        response = client.get(
            "/api/commission/auto-totals",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "auto_internet" in data
        assert "auto_mobile" in data
        assert "internet" in data
        assert "overrides" in data
    
    def test_get_earnings(self, client, authenticated_user):
        """Test getting earnings breakdown"""
        _, token = authenticated_user
        
        response = client.get(
            "/api/commission/earnings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        assert "total_commission" in data
        assert "breakdown" in data
        assert "tax_breakdown" in data


class TestRampTable:
    """Test new hire ramp amounts"""
    
    def test_ramp_amounts(self):
        """Verify ramp table values"""
        assert RAMP_TABLE[1] == 1300
        assert RAMP_TABLE[2] == 1100
        assert RAMP_TABLE[3] == 1000
        assert RAMP_TABLE[4] == 750
        assert RAMP_TABLE[5] == 0
        assert RAMP_TABLE[6] == 0

