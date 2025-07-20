import os
import json
import functions_framework
from google.cloud import vision
import google.generativeai as genai
import PyPDF2
import io
import logging
from supabase import create_client, Client
import requests
from dataclasses import dataclass
from datetime import date, datetime
from enum import Enum

# --- Configuration --- #
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Use your service_role key for backend operations

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Google Cloud Vision AI client (automatically uses GOOGLE_APPLICATION_CREDENTIALS)
vision_client = vision.ImageAnnotatorClient()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Data Models --- #

class AccountStatus(Enum):
    CURRENT = "current"
    THIRTY_DAYS_LATE = "30_days_late"
    SIXTY_DAYS_LATE = "60_days_late"
    NINETY_DAYS_LATE = "90_days_late"
    ONE_TWENTY_DAYS_LATE = "120_days_late"
    CHARGE_OFF = "charge_off"
    COLLECTION = "collection"
    CLOSED = "closed"
    PAID = "paid"

class ViolationType(Enum):
    FCRA_OBSOLETE_INFO = "fcra_obsolete_info"
    FCRA_ACCURACY = "fcra_accuracy"
    FCRA_INCOMPLETE_INFO = "fcra_incomplete_info"
    METRO2_FORMAT_ERROR = "metro2_format_error"
    DUPLICATE_ACCOUNT = "duplicate_account"
    INACCURATE_BALANCE = "inaccurate_balance"

class ViolationSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class PersonalInfo:
    name: str = ""
    ssn: str = ""
    address: str = ""
    date_of_birth: str = ""

@dataclass
class CreditAccount:
    creditor_name: str = ""
    account_number: str = ""
    account_type: str = ""
    balance: float = 0.0
    credit_limit: float = 0.0
    status: AccountStatus = AccountStatus.CURRENT
    date_opened: str = ""
    last_activity: str = ""

@dataclass
class Inquiry:
    company: str = ""
    date: str = ""

@dataclass
class CreditReport:
    personal_info: PersonalInfo
    accounts: list[CreditAccount]
    inquiries: list[Inquiry]
    raw_text: str

@dataclass
class Violation:
    violation_type: ViolationType
    severity: ViolationSeverity
    title: str
    description: str
    affected_account: str = ""
    legal_basis: str = ""
    dispute_reason: str = "Inaccurate information"

# --- Core AI Processing Logic --- #

def extract_text_from_pdf_with_vision_ai(pdf_content: bytes) -> str:
    """Extracts text from PDF content using Google Cloud Vision AI."""
    logger.info("Starting PDF text extraction with Vision AI...")
    try:
        # For PDF processing, we need to convert to images first
        # Vision AI works better with images than raw PDF bytes
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        
        # For now, we'll process the first page as an image
        # In production, you might want to process all pages
        if len(pdf_reader.pages) == 0:
            raise ValueError("PDF has no pages")
        
        # Create image from PDF content
        image = vision.Image(content=pdf_content)
        
        # Use DOCUMENT_TEXT_DETECTION for better OCR results
        response = vision_client.document_text_detection(image=image)
        
        if response.error.message:
            raise Exception(f"Vision AI error: {response.error.message}")
        
        if response.full_text_annotation:
            logger.info("Text extraction successful.")
            return response.full_text_annotation.text
        else:
            logger.warning("No full text annotation found in Vision AI response.")
            return ""
    except Exception as e:
        logger.error(f"Error during Vision AI text extraction: {e}")
        raise

def parse_credit_report_with_gemini(credit_report_text: str) -> dict:
    """Parses credit report text into structured data using Gemini."""
    logger.info("Starting credit report parsing with Gemini...")
    model = genai.GenerativeModel("gemini-pro")  # Consider 'gemini-1.5-flash' for faster, cheaper inference
    
    prompt = f"""
    Extract the following structured information from the credit report text:
    - Personal Information: Name, SSN (format XXX-XX-XXXX), Address, Date of Birth (format MM/DD/YYYY).
    - Credit Accounts: For each account, extract Creditor Name, Account Number (last 4 digits if masked), Account Type (e.g., Revolving, Installment, Mortgage), Balance (float), Credit Limit (float), Status (e.g., Current, 30 Days Late, Charge Off, Collection, Paid, Closed), Date Opened (MM/DD/YYYY), Last Activity Date (MM/DD/YYYY).
    - Inquiries: For each inquiry, extract the Company and Date (MM/DD/YYYY).

    Return the data as a JSON object. Ensure all dates are in MM/DD/YYYY format. If a field is not found, use an empty string or 0.0 for numbers.

    Example JSON structure:
    {{
      "personal_info": {{
        "name": "JOHN DOE",
        "ssn": "123-45-6789",
        "address": "123 MAIN ST, ANYTOWN, CA 90210",
        "date_of_birth": "01/15/1980"
      }},
      "accounts": [
        {{
          "creditor_name": "CHASE BANK",
          "account_number": "****1234",
          "account_type": "Revolving",
          "balance": 2500.00,
          "credit_limit": 5000.00,
          "status": "Current",
          "date_opened": "01/15/2015",
          "last_activity": "12/15/2023"
        }}
      ],
      "inquiries": [
        {{
          "company": "BEST BUY",
          "date": "12/01/2023"
        }}
      ]
    }}

    Credit Report Text:
    {credit_report_text}
    """
    
    try:
        response = model.generate_content(prompt)
        # Attempt to extract JSON from potentially Markdown-wrapped response
        json_str = response.text.strip()
        if json_str.startswith("```json") and json_str.endswith("```"):
            json_str = json_str[7:-3].strip()
        elif json_str.startswith("```") and json_str.endswith("```"):
            json_str = json_str[3:-3].strip()
        
        parsed_data = json.loads(json_str)
        logger.info("Credit report parsing with Gemini successful.")
        return parsed_data
    except Exception as e:
        logger.error(f"Error parsing credit report with Gemini: {e}\nGemini Response: {response.text if 'response' in locals() else 'N/A'}")
        raise

def detect_violations_with_gemini(parsed_data: dict) -> list[dict]:
    """Detects FCRA and Metro 2 violations using Gemini."""
    logger.info("Starting violation detection with Gemini...")
    model = genai.GenerativeModel("gemini-pro")
    
    data_str = json.dumps(parsed_data, indent=2)

    prompt = f"""
    Analyze the following structured credit report data for potential violations of the Fair Credit Reporting Act (FCRA) and Metro 2 reporting standards.
    
    Consider the following common violation types:
    - **Obsolete Negative Information:** Negative items (e.g., late payments, charge-offs, collections) remaining on the report beyond their permissible reporting period (generally 7 years from delinquency date, bankruptcies 10 years).
    - **Inaccurate Account Status:** Account status (e.g., '30 Days Late', 'Charge Off') does not match payment history or balance (e.g., zero balance with late status).
    - **Incomplete Information:** Missing critical data fields for an account (e.g., date opened, last activity date, account type).
    - **Duplicate Accounts:** The same account reported multiple times.
    - **Mixed File:** Information belonging to another person is on this report (harder to detect without cross-referencing).
    - **Incorrect Personal Information:** Mismatched names, addresses, or SSN errors.
    - **Inaccurate Balances/Limits:** Reported balance or credit limit is incorrect.
    
    For each potential violation, provide a JSON object with the following keys:
    - `title`: A concise title for the violation (e.g., "Obsolete Charge-Off").
    - `description`: A detailed explanation of why it's a violation, referencing the specific data points.
    - `affected_account`: The creditor name and account number (if applicable).
    - `legal_basis`: Reference to the relevant FCRA section (e.g., "FCRA 605(a)" for obsolete info, "FCRA 623(a)" for furnisher accuracy) or Metro 2 rule.
    - `severity`: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
    - `dispute_reason`: A brief reason for dispute (e.g., "Information is obsolete").

    Return a JSON array of violation objects. If no violations are found, return an empty array `[]`.

    Credit Report Data:
    {data_str}
    """
    
    try:
        response = model.generate_content(prompt)
        json_str = response.text.strip()
        if json_str.startswith("```json") and json_str.endswith("```"):
            json_str = json_str[7:-3].strip()
        elif json_str.startswith("```") and json_str.endswith("```"):
            json_str = json_str[3:-3].strip()
        
        violations = json.loads(json_str)
        logger.info(f"Violation detection with Gemini successful. Found {len(violations)} violations.")
        return violations
    except Exception as e:
        logger.error(f"Error detecting violations with Gemini: {e}\nGemini Response: {response.text if 'response' in locals() else 'N/A'}")
        raise

def generate_dispute_letter_with_gemini(personal_info: dict, violations: list[dict]) -> str:
    """Generates a dispute letter using Gemini based on detected violations."""
    logger.info("Generating dispute letter with Gemini...")
    model = genai.GenerativeModel("gemini-pro")

    violations_str = json.dumps(violations, indent=2)
    personal_info_str = json.dumps(personal_info, indent=2)

    prompt = f"""
    Generate a formal dispute letter to a credit bureau based on the following personal information and detected credit report violations.

    Personal Information:
    {personal_info_str}

    Violations to Dispute:
    {violations_str}

    The letter should:
    - Be addressed to a generic credit bureau (e.g., "To: [Credit Bureau Name]").
    - Clearly state the consumer's name and SSN.
    - Reference the Fair Credit Reporting Act (FCRA).
    - List each violation with its description, affected account, and legal basis.
    - Request investigation and removal/correction of inaccurate information.
    - Include a closing statement for prompt attention.
    - Do NOT include placeholders for signature or printed name at the end, as the user will add those.
    """
    try:
        response = model.generate_content(prompt)
        logger.info("Dispute letter generation successful.")
        return response.text
    except Exception as e:
        logger.error(f"Error generating dispute letter with Gemini: {e}")
        raise

# --- GCF Entry Point --- #

@functions_framework.http
def process_credit_report(request):
    """HTTP Cloud Function to process credit reports.

    Args:
        request (flask.Request): The request object.
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`.
    """
    logger.info("Received request to process credit report.")
    request_json = request.get_json(silent=True)
    request_args = request.args

    # Expecting a JSON payload with 'pdf_url' (Supabase Storage URL) and 'user_id'
    pdf_url = None
    user_id = None

    if request_json and 'pdf_url' in request_json:
        pdf_url = request_json['pdf_url']
    if request_json and 'user_id' in request_json:
        user_id = request_json['user_id']

    if not pdf_url or not user_id:
        logger.error("Missing 'pdf_url' or 'user_id' in request.")
        return json.dumps({"status": "error", "message": "Missing pdf_url or user_id"}), 400

    logger.info(f"Processing PDF from URL: {pdf_url} for user: {user_id}")

    try:
        # 1. Download PDF content from Supabase Storage
        logger.info("Downloading PDF from Supabase Storage...")
        pdf_response = requests.get(pdf_url, timeout=30)
        pdf_response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
        pdf_content = pdf_response.content
        logger.info(f"Downloaded PDF content (size: {len(pdf_content)} bytes).")

        # 2. Extract text using Google Cloud Vision AI
        logger.info("Starting text extraction...")
        extracted_text = extract_text_from_pdf_with_vision_ai(pdf_content)
        if not extracted_text:
            raise ValueError("Could not extract text from PDF.")
        
        # 3. Parse credit report with Gemini
        logger.info("Starting credit report parsing...")
        parsed_credit_report = parse_credit_report_with_gemini(extracted_text)
        if not parsed_credit_report:
            raise ValueError("Could not parse credit report data.")

        # 4. Detect violations with Gemini
        logger.info("Starting violation detection...")
        detected_violations = detect_violations_with_gemini(parsed_credit_report)

        # 5. Generate dispute letter with Gemini
        logger.info("Generating dispute letter...")
        dispute_letter = generate_dispute_letter_with_gemini(
            parsed_credit_report.get("personal_info", {}),
            detected_violations
        )

        # 6. Store results in Supabase
        logger.info("Storing results in Supabase...")
        
        # Prepare data for Supabase insertion
        supabase_data = {
            "user_id": user_id,
            "pdf_url": pdf_url,
            "extracted_text": extracted_text,
            "parsed_data": parsed_credit_report,  # Store as JSONB
            "violations": detected_violations,    # Store as JSONB
            "dispute_letter": dispute_letter,
            "processed_at": datetime.now().isoformat()
        }

        # Insert into Supabase
        response = supabase.table("credit_reports_analysis").insert(supabase_data).execute()
        logger.info(f"Results stored in Supabase: {response.data}")

        return json.dumps({
            "status": "success", 
            "message": "Credit report processed successfully", 
            "data": response.data,
            "summary": {
                "violations_found": len(detected_violations),
                "accounts_analyzed": len(parsed_credit_report.get("accounts", [])),
                "inquiries_found": len(parsed_credit_report.get("inquiries", []))
            }
        }), 200

    except Exception as e:
        logger.error(f"Overall processing error: {e}", exc_info=True)
        return json.dumps({"status": "error", "message": str(e)}), 500 