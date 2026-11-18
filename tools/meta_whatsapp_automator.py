import sys
import os
import time
import json
import re
from playwright.sync_api import sync_playwright

STATUS_FILE = os.path.join(os.path.dirname(__file__), "meta_status.json")
CREDS_FILE = os.path.join(os.path.dirname(__file__), "meta_credentials.json")
SCREEN_FILE = os.path.join(os.path.dirname(__file__), "meta_screen.png")
APP_YML_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "src", "main", "resources", "application.yml"))
SESSION_DIR = os.path.join(os.environ.get("USERPROFILE", "C:\\Users\\HP"), ".gemini", "meta_browser_session")
TARGET_PHONE = "9296050995"

def update_status(step, message, extra=None):
    data = {
        "step": step,
        "message": message,
        "timestamp": time.time(),
        "extra": extra or {}
    }
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"\n======================================================\n[{step}] {message}\n======================================================\n", flush=True)

def update_application_yml(access_token, phone_number_id):
    if not os.path.exists(APP_YML_PATH):
        return
    with open(APP_YML_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    token_pattern = r"(whatsapp:\s*\n\s*access-token:\s*\$\{WHATSAPP_ACCESS_TOKEN:)[^\}]*(\})"
    phone_pattern = r"(phone-number-id:\s*\$\{WHATSAPP_PHONE_NUMBER_ID:)[^\}]*(\})"

    new_content = re.sub(token_pattern, rf"\g<1>{access_token}\g<2>", content)
    new_content = re.sub(phone_pattern, rf"\g<1>{phone_number_id}\g<2>", new_content)

    with open(APP_YML_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("[CONFIG] Successfully updated application.yml with WhatsApp credentials!", flush=True)

def dump_page(page, tag=""):
    try:
        page.screenshot(path=SCREEN_FILE)
        print(f"[PAGE] {tag} | URL: {page.url} | Title: {page.title()}", flush=True)
    except Exception as e:
        print(f"Screenshot error: {e}", flush=True)

def main():
    os.makedirs(SESSION_DIR, exist_ok=True)
    update_status("LAUNCHING", "Opening dedicated Chrome browser window...")

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=SESSION_DIR,
            headless=False,
            channel="chrome",
            viewport={"width": 1366, "height": 850},
            args=["--disable-blink-features=AutomationControlled"]
        )

        page = context.pages[0] if context.pages else context.new_page()

        # Step 1: Open Developers homepage
        update_status("OPENING_HOMEPAGE", "Opening Meta for Developers...")
        page.goto("https://developers.facebook.com/", wait_until="domcontentloaded")
        time.sleep(3)
        dump_page(page, "homepage")

        # Check if already logged in (look for avatar or 'My Apps')
        is_logged_in = False
        for loc in [page.locator("text='My Apps'").first, page.locator("text='Get Started'").first, page.locator("a[href*='/apps']").first]:
            try:
                if loc.is_visible():
                    is_logged_in = True
                    break
            except Exception:
                pass

        if not is_logged_in:
            # Click Login link
            login_link = page.locator("a:has-text('Login'), a:has-text('Log In')").first
            if login_link.is_visible():
                login_link.click()
                time.sleep(3)
            else:
                page.goto("https://www.facebook.com/login.php?next=https%3A%2F%2Fdevelopers.facebook.com%2Fapps%2F", wait_until="domcontentloaded")
                time.sleep(2)

            dump_page(page, "login_screen")
            update_status("WAITING_FOR_LOGIN", "Please log in to your Facebook account in the open Chrome window. Enter your email/phone and password, plus any 2FA code.")

            # Wait for user to log in
            while True:
                time.sleep(2)
                cur_url = page.url.lower()
                # When logged in, URL redirects back to developers.facebook.com
                if "developers.facebook.com" in cur_url and "login" not in cur_url:
                    print("Detected redirect to developers.facebook.com!", flush=True)
                    time.sleep(3)
                    break

        dump_page(page, "after_login")
        update_status("LOGGED_IN", "Logged in successfully! Checking developer account status...")

        # Step 2: Handle First-Time Developer Onboarding if 'Get Started' is visible
        get_started = page.locator("a:has-text('Get Started'), button:has-text('Get Started')").first
        try:
            if get_started.is_visible():
                update_status("ONBOARDING", "First-time developer registration detected. Starting registration flow...")
                get_started.click()
                time.sleep(3)
                dump_page(page, "onboarding_modal")

                # Look for 'Continue'
                cont_btn = page.locator("button:has-text('Continue')").first
                if cont_btn.is_visible():
                    cont_btn.click()
                    time.sleep(3)

                # If phone verification is requested
                send_code_btn = page.locator("button:has-text('Send Code'), button:has-text('Send via SMS'), button:has-text('Send via WhatsApp')").first
                if send_code_btn.is_visible():
                    update_status("WAITING_FOR_PHONE_VERIFY", "Meta sent a verification code to your phone. Please enter it in the browser window.")
                    # Wait for user to verify
                    while send_code_btn.is_visible():
                        time.sleep(2)

                # Select role 'Developer'
                dev_role = page.locator("text='Developer'").first
                if dev_role.is_visible():
                    dev_role.click()
                    time.sleep(1)
                    comp_btn = page.locator("button:has-text('Complete Registration')").first
                    if comp_btn.is_visible():
                        comp_btn.click()
                        time.sleep(4)
        except Exception as e:
            print(f"Onboarding flow notice: {e}", flush=True)

        # Step 3: Go to Apps Dashboard
        update_status("NAVIGATING_APPS", "Navigating to Apps Dashboard...")
        page.goto("https://developers.facebook.com/apps/", wait_until="domcontentloaded")
        time.sleep(4)
        dump_page(page, "apps_dashboard")

        # Check if Globetrotter Gateway app already exists
        target_app = page.locator("text='Globetrotter Gateway'").first
        if target_app.is_visible():
            update_status("APP_FOUND", "Found existing 'Globetrotter Gateway' app! Opening...")
            target_app.click()
            time.sleep(5)
        else:
            # Create new app
            create_btn = page.locator("text='Create App'").first
            if not create_btn.is_visible():
                create_btn = page.locator("a:has-text('Create App'), button:has-text('Create App')").first

            if create_btn.is_visible():
                update_status("CREATING_APP", "Creating app 'Globetrotter Gateway'...")
                create_btn.click()
                time.sleep(4)
                dump_page(page, "create_app_step1")

                # Select 'Other'
                other = page.locator("text='Other'").first
                if other.is_visible():
                    other.click()
                    time.sleep(1)
                    next_btn = page.locator("button:has-text('Next')").first
                    if next_btn.is_visible():
                        next_btn.click()
                        time.sleep(3)
                        dump_page(page, "create_app_step2")

                # Select 'Business'
                biz = page.locator("text='Business'").first
                if biz.is_visible():
                    biz.click()
                    time.sleep(1)
                    next_btn = page.locator("button:has-text('Next')").first
                    if next_btn.is_visible():
                        next_btn.click()
                        time.sleep(3)
                        dump_page(page, "create_app_step3")

                # App Name
                name_input = page.locator("input[name='display_name']").first
                if not name_input.is_visible():
                    name_input = page.locator("input[type='text']").first
                if name_input.is_visible():
                    name_input.fill("Globetrotter Gateway")
                    time.sleep(1)

                submit_btn = page.locator("button:has-text('Create app')").first
                if submit_btn.is_visible():
                    submit_btn.click()
                    update_status("WAITING_FOR_APP_CREATION", "Submitted creation. If re-authentication modal appears, please enter your password in the browser.")
                    time.sleep(6)
                    dump_page(page, "after_create_submit")

        # Step 4: Add / Set Up WhatsApp
        cur_url = page.url
        print(f"Current page after app load: {cur_url}", flush=True)

        if "whatsapp" not in cur_url.lower():
            # Look for Set Up button on WhatsApp card
            setup_btns = page.locator("text='Set up'").all()
            for btn in setup_btns:
                try:
                    parent_text = btn.locator("xpath=../..").inner_text()
                    if "whatsapp" in parent_text.lower():
                        print("Clicking WhatsApp Set Up...", flush=True)
                        btn.click()
                        time.sleep(5)
                        break
                except Exception:
                    pass

            if "whatsapp" not in page.url.lower():
                match = re.search(r"/apps/(\d+)", page.url)
                if match:
                    app_id = match.group(1)
                    page.goto(f"https://developers.facebook.com/apps/{app_id}/whatsapp-setup/", wait_until="domcontentloaded")
                    time.sleep(4)

        dump_page(page, "whatsapp_setup_page")

        # Step 5: Extract Access Token and Phone Number ID
        update_status("SCRAPING", "Extracting Access Token and Phone Number ID...")
        token = None
        phone_id = None
        waba_id = None

        for attempt in range(25):
            content = page.content()

            token_matches = re.findall(r"EAA[A-Za-z0-9_-]{100,}", content)
            if token_matches:
                token = token_matches[0]

            phone_matches = re.findall(r"Phone number ID[^\d]*(\d{14,18})", content, re.IGNORECASE)
            if phone_matches:
                phone_id = phone_matches[0]
            else:
                id_matches = re.findall(r"(\d{15,16})", content)
                if len(id_matches) >= 1:
                    phone_id = id_matches[0]

            waba_matches = re.findall(r"WhatsApp Business Account ID[^\d]*(\d{14,18})", content, re.IGNORECASE)
            if waba_matches:
                waba_id = waba_matches[0]

            if token and phone_id:
                break
            time.sleep(2)

        if token and phone_id:
            creds = {
                "access_token": token,
                "phone_number_id": phone_id,
                "waba_id": waba_id,
                "target_phone": TARGET_PHONE
            }
            with open(CREDS_FILE, "w", encoding="utf-8") as f:
                json.dump(creds, f, indent=2)

            update_status("SUCCESS", f"Captured Meta WhatsApp Credentials! Phone ID: {phone_id}", creds)
            update_application_yml(token, phone_id)
        else:
            update_status("CREDENTIALS_PENDING", "WhatsApp API Setup page loaded. Please check the browser window.", {
                "url": page.url,
                "token_found": bool(token),
                "phone_id_found": bool(phone_id)
            })

        print("\n[DONE] Browser remains open for you to verify test recipient phone number.", flush=True)
        for _ in range(180):
            time.sleep(2)

        context.close()

if __name__ == "__main__":
    main()
