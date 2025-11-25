#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class AIBotDetectAPITester:
    def __init__(self, base_url="https://aibot-detect.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.domain_id = None
        self.api_key = None
        self.alert_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"

            return self.log_test(name, success, details), response

        except Exception as e:
            return self.log_test(name, False, f"Exception: {str(e)}"), None

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n🔐 Testing Authentication Flow...")
        
        # Test registration
        test_email = f"test_{int(time.time())}@example.com"
        test_password = "TestPass123!"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            {"email": test_email, "password": test_password}
        )
        
        if not success:
            return False

        # Test login
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            {"email": test_email, "password": test_password}
        )
        
        if success and response:
            try:
                data = response.json()
                self.token = data.get('access_token')
                self.user_id = data.get('user', {}).get('id')
                self.log_test("Token Extraction", bool(self.token), f"Token: {self.token[:20]}..." if self.token else "No token")
            except:
                self.log_test("Token Extraction", False, "Failed to parse login response")
                return False

        # Test get current user
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        return success

    def test_super_admin_login(self):
        """Test super admin login"""
        print("\n👑 Testing Super Admin Login...")
        
        success, response = self.run_test(
            "Super Admin Login",
            "POST",
            "auth/login",
            200,
            {"email": "admin@aibot-detect.com", "password": "Admin@123"}
        )
        
        if success and response:
            try:
                data = response.json()
                admin_token = data.get('access_token')
                is_super_admin = data.get('user', {}).get('is_super_admin', False)
                self.log_test("Super Admin Verification", is_super_admin, f"Is Super Admin: {is_super_admin}")
                
                # Test admin endpoints with admin token
                old_token = self.token
                self.token = admin_token
                
                success, response = self.run_test(
                    "Admin Stats Access",
                    "GET",
                    "admin/stats",
                    200
                )
                
                success, response = self.run_test(
                    "Admin Users List",
                    "GET",
                    "admin/users",
                    200
                )
                
                success, response = self.run_test(
                    "Admin Domains List",
                    "GET",
                    "admin/domains",
                    200
                )
                
                # Restore regular user token
                self.token = old_token
                
            except Exception as e:
                self.log_test("Super Admin Token Processing", False, f"Error: {str(e)}")
        
        return success

    def test_domain_management(self):
        """Test domain management"""
        print("\n🌐 Testing Domain Management...")
        
        # Create domain
        test_domain = f"test-{int(time.time())}.example.com"
        success, response = self.run_test(
            "Create Domain",
            "POST",
            "domains",
            200,
            {"domain": test_domain}
        )
        
        if success and response:
            try:
                data = response.json()
                self.domain_id = data.get('id')
                self.log_test("Domain ID Extraction", bool(self.domain_id), f"Domain ID: {self.domain_id}")
            except:
                self.log_test("Domain ID Extraction", False, "Failed to parse domain response")

        # Get domains
        success, response = self.run_test(
            "Get Domains",
            "GET",
            "domains",
            200
        )

        # Test domain verification (will fail but should return proper response)
        if self.domain_id:
            success, response = self.run_test(
                "Domain Verification Attempt",
                "POST",
                f"domains/{self.domain_id}/verify",
                200
            )

        return success

    def test_api_key_management(self):
        """Test API key management"""
        print("\n🔑 Testing API Key Management...")
        
        # Create API key
        success, response = self.run_test(
            "Create API Key",
            "POST",
            "api-keys",
            200,
            {"name": "Test Key"}
        )
        
        if success and response:
            try:
                data = response.json()
                self.api_key = data.get('key')
                api_key_id = data.get('id')
                self.log_test("API Key Extraction", bool(self.api_key), f"API Key: {self.api_key[:20]}..." if self.api_key else "No key")
            except:
                self.log_test("API Key Extraction", False, "Failed to parse API key response")

        # Get API keys
        success, response = self.run_test(
            "Get API Keys",
            "GET",
            "api-keys",
            200
        )

        return success

    def test_traffic_logging(self):
        """Test traffic logging functionality"""
        print("\n📊 Testing Traffic Logging...")
        
        if not self.api_key or not self.domain_id:
            self.log_test("Traffic Logging Prerequisites", False, "Missing API key or domain ID")
            return False

        # First get the domain name
        success, response = self.run_test(
            "Get Domain for Logging",
            "GET",
            "domains",
            200
        )
        
        domain_name = None
        if success and response:
            try:
                domains = response.json()
                if domains:
                    domain_name = domains[0].get('domain')
            except:
                pass

        if not domain_name:
            self.log_test("Domain Name Extraction", False, "Could not get domain name")
            return False

        # Test traffic logging with different user agents
        test_cases = [
            {
                "name": "Regular Browser Traffic",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "expected_bot": False
            },
            {
                "name": "GPTBot Detection",
                "user_agent": "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)",
                "expected_bot": True
            },
            {
                "name": "ClaudeBot Detection", 
                "user_agent": "ClaudeBot/1.0 (+https://www.anthropic.com/claude-bot)",
                "expected_bot": True
            }
        ]

        for test_case in test_cases:
            success, response = self.run_test(
                f"Log Traffic - {test_case['name']}",
                "POST",
                "traffic/log",
                200,
                {
                    "domain": domain_name,
                    "api_key": self.api_key,
                    "ip_address": "192.168.1.100",
                    "user_agent": test_case["user_agent"],
                    "request_path": "/test",
                    "request_method": "GET"
                }
            )
            
            if success and response:
                try:
                    data = response.json()
                    bot_detected = data.get('bot_detected', False)
                    confidence = data.get('confidence', 0)
                    expected = test_case['expected_bot']
                    
                    detection_correct = (bot_detected == expected)
                    self.log_test(
                        f"Bot Detection Logic - {test_case['name']}", 
                        detection_correct, 
                        f"Detected: {bot_detected}, Expected: {expected}, Confidence: {confidence}"
                    )
                except Exception as e:
                    self.log_test(f"Response Parsing - {test_case['name']}", False, f"Error: {str(e)}")

        # Get traffic logs
        success, response = self.run_test(
            "Get Traffic Logs",
            "GET",
            "traffic/logs",
            200
        )

        # Get traffic stats
        success, response = self.run_test(
            "Get Traffic Stats",
            "GET",
            "traffic/stats",
            200
        )

        # Test export functionality
        success, response = self.run_test(
            "Export Traffic Logs (JSON)",
            "GET",
            "traffic/export?format=json",
            200
        )

        success, response = self.run_test(
            "Export Traffic Logs (CSV)",
            "GET",
            "traffic/export?format=csv",
            200
        )

        return True

    def test_alerts_management(self):
        """Test alerts management"""
        print("\n🚨 Testing Alerts Management...")
        
        # Create email alert
        success, response = self.run_test(
            "Create Email Alert",
            "POST",
            "alerts",
            200,
            {
                "alert_type": "email",
                "destination": "test@example.com",
                "threshold": 5
            }
        )
        
        if success and response:
            try:
                data = response.json()
                self.alert_id = data.get('id')
            except:
                pass

        # Create webhook alert
        success, response = self.run_test(
            "Create Webhook Alert",
            "POST",
            "alerts",
            200,
            {
                "alert_type": "webhook",
                "destination": "https://example.com/webhook",
                "threshold": 10
            }
        )

        # Get alerts
        success, response = self.run_test(
            "Get Alerts",
            "GET",
            "alerts",
            200
        )

        return success

    def test_cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning Up Test Data...")
        
        # Delete alert
        if self.alert_id:
            success, response = self.run_test(
                "Delete Alert",
                "DELETE",
                f"alerts/{self.alert_id}",
                200
            )

        # Delete domain
        if self.domain_id:
            success, response = self.run_test(
                "Delete Domain",
                "DELETE",
                f"domains/{self.domain_id}",
                200
            )

        return True

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting AI Bot Detection System API Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 60)

        # Test authentication first
        if not self.test_auth_flow():
            print("❌ Authentication failed - stopping tests")
            return False

        # Test super admin functionality
        self.test_super_admin_login()

        # Test domain management
        self.test_domain_management()

        # Test API key management
        self.test_api_key_management()

        # Test traffic logging
        self.test_traffic_logging()

        # Test alerts
        self.test_alerts_management()

        # Cleanup
        self.test_cleanup()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Overall Status: GOOD")
            return True
        elif success_rate >= 60:
            print("⚠️  Overall Status: NEEDS ATTENTION")
            return False
        else:
            print("🚨 Overall Status: CRITICAL ISSUES")
            return False

def main():
    tester = AIBotDetectAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())