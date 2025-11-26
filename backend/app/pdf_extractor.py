"""
Spectrum PDF Extractor Service

Extracts order data from Spectrum Business PDF documents.
"""

import re
from datetime import datetime
from typing import Dict, Any, Optional
import pdfplumber
import io


def extract_order_from_pdf(pdf_file: bytes) -> Dict[str, Any]:
    """
    Extract order data from a Spectrum Business PDF.
    
    Args:
        pdf_file: PDF file content as bytes
        
    Returns:
        Dictionary with all extracted fields
    """
    # Extract text from PDF
    text = ""
    with pdfplumber.open(io.BytesIO(pdf_file)) as pdf:
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"
    
    # Helper function to find patterns
    def find(pattern: str) -> str:
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    # Extract install date and time
    install_date = None
    install_time = ""
    
    date_match = re.search(
        r'(?:Wed|Mon|Tue|Thu|Fri|Sat|Sun)[a-z]*,?\s*(\w{3})\s*(\d{1,2}),?\s*(\d{4})', 
        text, 
        re.I
    )
    if date_match:
        month_map = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        month = month_map.get(date_match.group(1).lower()[:3], 1)
        try:
            install_date = datetime(
                int(date_match.group(3)), 
                month, 
                int(date_match.group(2))
            ).strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            pass
    
    time_match = re.search(
        r'(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:?\d{0,2}\s*(?:AM|PM)?)', 
        text, 
        re.I
    )
    if time_match:
        install_time = f"{time_match.group(1).strip()} - {time_match.group(2).strip()}"
    
    # Extract business name
    business_name = ""
    biz_match = re.search(
        r'Business\s*Name\s+([A-Za-z][A-Za-z0-9\s\.\,\&\-\']+?)(?:\n|Contact|$)', 
        text, 
        re.I
    )
    if biz_match:
        business_name = re.sub(
            r'\s*(Contact|Billing|Information).*$', 
            '', 
            biz_match.group(1), 
            flags=re.I
        ).strip()
    
    # Extract phone from Notes or Contact section
    phone = ""
    notes_match = re.search(r'Notes\s+[A-Za-z]+\s*([\d\-]+)', text)
    if notes_match:
        p = re.sub(r'\D', '', notes_match.group(1))
        if len(p) == 10:
            phone = p
    if not phone:
        contact_match = re.search(
            r'Contact\s*Information(.*?)(?:Billing|$)', 
            text, 
            re.I | re.DOTALL
        )
        if contact_match:
            phone_match = re.search(r'(\d{10})', contact_match.group(1))
            if phone_match:
                phone = phone_match.group(1)
    
    # Extract address
    address = ""
    addr_match = re.search(
        r'Contact\s*Information\s+[A-Za-z\s\.]+\n([\d]+[^@\n]+(?:Ave|Blvd|St|Rd|Dr|Way|Ct|Pl|Ln|Ste|Suite)?[^\n]*\n[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5})', 
        text, 
        re.I
    )
    if addr_match:
        address = re.sub(r'\s+', ' ', addr_match.group(1).strip())
    
    # Extract internet tier
    internet_tier = ""
    tier = find(r'Business\s*Internet\s*(Ultra|Premier|Standard)')
    speed = find(r'Up\s*to\s*(\d+)\s*Mbps')
    if tier and speed:
        internet_tier = f"{tier} ({speed} Mbps)"
    elif tier:
        internet_tier = tier
    elif speed:
        internet_tier = f"{speed} Mbps"
    
    # Extract monetary amounts
    def get_amount(patterns: list) -> Optional[float]:
        for pattern in patterns:
            match = re.search(pattern, text, re.I)
            if match:
                try:
                    return float(match.group(1).replace(',', ''))
                except (ValueError, TypeError):
                    pass
        return None
    
    # Extract notes
    notes = find(r'Notes\s+([^\n]+)')
    
    # Build and return the dictionary
    return {
        # Order Reference
        'spectrum_reference': find(r'Reference\s*Number\s*[:\s]*(\d{10})'),
        'customer_account_number': find(r'Account\s*Number\s*[:\s]*(\d{16})'),
        'customer_security_code': '',
        'job_number': find(r'Work\s*Order\s*Number\s*[:\s]*(\d{16})'),
        
        # Customer Info
        'business_name': business_name,
        'customer_name': find(r'Authorized\s*Contact\s+([A-Za-z][A-Za-z\s\.]+?)(?:\n|$)'),
        'customer_email': find(r'Email:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'),
        'customer_address': address,
        'customer_phone': phone,
        
        # Installation
        'install_date': install_date,
        'install_time': install_time,
        
        # Products
        'has_internet': bool(re.search(r'Business\s*Internet', text, re.I)),
        'has_tv': bool(re.search(r'Business\s*TV', text, re.I)),
        'has_voice': 1 if re.search(r'Business\s*Voice', text, re.I) else 0,
        'has_mobile': 1 if re.search(r'SPECTRUM\s*MOBILE', text, re.I) else 0,
        'mobile_activated': 0,
        'has_sbc': 0,
        'has_wib': bool(re.search(r'Wireless\s*Backup\s*Modem', text, re.I)),
        
        # PDF-specific fields
        'internet_tier': internet_tier,
        'monthly_total': get_amount([
            r'MONTHLY\s*PAYMENT\s*\n?\$?([\d,]+\.?\d*)',
            r'Est\.?\s*Monthly\s*Total\s*\$?([\d,]+\.?\d*)',
            r'Monthly\s*Total\s*\$?([\d,]+\.?\d*)',
        ]),
        'initial_payment': get_amount([
            r'INITIAL\s*PAYMENT\s*\n?\$?([\d,]+\.?\d*)',
            r'Est\.?\s*Initial\s*Payment\s*\$?([\d,]+\.?\d*)',
        ]),
        
        # Notes
        'notes': notes,
    }


def validate_pdf(file_content: bytes) -> bool:
    """
    Validate that the file is a valid PDF.
    
    Args:
        file_content: File content as bytes
        
    Returns:
        True if valid PDF, False otherwise
    """
    # Check PDF magic bytes
    return file_content[:4] == b'%PDF'

