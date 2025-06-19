#!/usr/bin/env python3
"""Test the report system functionality"""

import asyncio
from playwright.async_api import async_playwright
import time

async def test_report_system():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Go to login page
        await page.goto('http://localhost:5173/login')
        await page.wait_for_load_state('networkidle')
        
        print("1. Logging in as admin (root)...")
        # Click on username field and select root
        await page.click('input[name="username"]')
        await page.fill('input[name="username"]', 'root')
        
        # Fill password
        await page.fill('input[name="password"]', 'Northstar197201')
        
        # Click login button
        await page.click('button[type="submit"]')
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(2000)
        
        print("2. Navigating to another user's profile...")
        # Go to authors page to find another user
        await page.goto('http://localhost:5173/authors')
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(1000)
        
        # Click on the first non-admin user (not root)
        # Find a user card that is not the admin
        user_cards = await page.query_selector_all('.flex.items-center.space-x-4')
        clicked = False
        
        for card in user_cards:
            username_elem = await card.query_selector('p.text-text-2')
            if username_elem:
                username_text = await username_elem.inner_text()
                if '@root' not in username_text:
                    await card.click()
                    clicked = True
                    print(f"   - Clicked on user: {username_text}")
                    break
        
        if not clicked:
            print("   - No other users found, creating a test scenario...")
            # If no other users, we'll need to create one or handle this case
            await browser.close()
            return
        
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(2000)
        
        print("3. Creating a regular user to test reporting...")
        # First, let's create a new user by logging out and signing up
        await page.click('a[href="/logout"]')
        await page.wait_for_timeout(2000)
        
        # Sign up a new user
        await page.goto('http://localhost:5173/signup')
        await page.fill('input[name="username"]', 'testuser123')
        await page.fill('input[name="email"]', 'testuser123@example.com')
        await page.fill('input[name="password"]', 'TestPassword123!')
        await page.fill('input[placeholder="Confirm your password"]', 'TestPassword123!')
        await page.fill('input[name="display_name"]', 'Test User')
        
        await page.click('button[type="submit"]')
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(2000)
        
        print("4. Going to admin's profile to test report functionality...")
        # Go to authors page
        await page.goto('http://localhost:5173/authors')
        await page.wait_for_load_state('networkidle')
        
        # Find and click on root (admin) profile
        await page.click('text=@root')
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(1000)
        
        print("5. Testing report functionality...")
        # Click the three dots menu
        await page.click('button[aria-label="More options"]')
        await page.wait_for_timeout(500)
        
        # Click Report
        await page.click('text=Report')
        await page.wait_for_timeout(2000)
        
        print("6. Logging back in as admin to check reports...")
        # Log out
        await page.click('a[href="/logout"]')
        await page.wait_for_timeout(2000)
        
        # Log back in as admin
        await page.goto('http://localhost:5173/login')
        await page.fill('input[name="username"]', 'root')
        await page.fill('input[name="password"]', 'Northstar197201')
        await page.click('button[type="submit"]')
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(2000)
        
        print("7. Checking inbox for reports...")
        # Go to inbox
        await page.goto('http://localhost:5173/inbox')
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(1000)
        
        # Click on Reports tab (should only be visible for admin)
        reports_tab = await page.query_selector('text=Reports')
        if reports_tab:
            print("   - Reports tab found! Clicking...")
            await reports_tab.click()
            await page.wait_for_timeout(2000)
            
            # Take screenshot of reports
            await page.screenshot(path='reports_inbox.png')
            print("   - Screenshot saved as reports_inbox.png")
        else:
            print("   - Reports tab not found. Admin UI might not be showing correctly.")
        
        # Take screenshot of inbox
        await page.screenshot(path='admin_inbox.png')
        print("   - Screenshot saved as admin_inbox.png")
        
        print("\n8. Testing admin controls on user profile...")
        # Go back to the test user's profile
        await page.goto('http://localhost:5173/authors')
        await page.wait_for_load_state('networkidle')
        
        # Find testuser123
        await page.click('text=@testuser123')
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(1000)
        
        # Take screenshot of admin controls
        await page.screenshot(path='admin_controls.png')
        print("   - Screenshot saved as admin_controls.png")
        
        # Close browser
        await browser.close()
        print("\nTest completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_report_system())