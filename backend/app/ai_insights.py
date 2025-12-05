"""
AI-powered performance insights using Groq API (Llama 3.1)
"""
import os
import re
import httpx
from typing import Optional

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

# Phrases that indicate intro/preamble lines (to filter out)
INTRO_PATTERNS = [
    r"^here('s| is| are)",
    r"^let me",
    r"^i (just |really )?love",
    r"^i('ll| will)",
    r"^based on",
    r"^looking at",
    r"^analyzing",
    r"^alright",
    r"^okay",
    r"^great",
    r"^listen up,? (because|here)",
    r"three (insights|things|points)",
    r"your (performance|data|numbers)",
    r"^now,",
]

# Tone configurations
TONE_PROMPTS = {
    "positive": """You are an enthusiastic sales coach. Be encouraging and celebrate wins.""",
    
    "realistic": """You are a pragmatic analyst. Be direct and factual about both strengths and weaknesses.""",
    
    "brutal": """You are a harsh drill sergeant. Be savage, blunt, and unforgiving about poor numbers."""
}


def _is_intro_line(line: str) -> bool:
    """Check if a line looks like an intro/preamble rather than an insight."""
    lower = line.lower().strip()
    for pattern in INTRO_PATTERNS:
        if re.search(pattern, lower):
            return True
    return False


def _clean_insight(line: str) -> str:
    """Clean up an insight line by removing prefixes and formatting."""
    line = line.strip()
    # Remove leading bullets, numbers, dashes
    if line.startswith(("-", "•", "*", "–", "—")):
        line = line[1:].strip()
    # Remove leading numbers like "1.", "1)", "1:"
    if len(line) > 2 and line[0].isdigit() and line[1] in ".):":
        line = line[2:].strip()
    if len(line) > 3 and line[0].isdigit() and line[1].isdigit() and line[2] in ".):":
        line = line[3:].strip()
    return line


async def generate_performance_insights(metrics: dict, tone: str = "positive") -> list[str]:
    """
    Generate AI-powered performance insights from metrics using Groq's Llama model.
    
    Args:
        metrics: Dictionary containing performance data
        tone: One of "positive", "realistic", or "brutal"
    
    Returns:
        List of 3 insight strings, or empty list if API fails
    """
    if not GROQ_API_KEY:
        return ["AI insights not configured. Set GROQ_API_KEY to enable."]
    
    # Get tone-specific instructions
    tone_instruction = TONE_PROMPTS.get(tone, TONE_PROMPTS["positive"])
    
    # Build the prompt with performance data - STRICT format instructions
    prompt = f"""ROLE: {tone_instruction}

DATA:
- This month: {metrics.get('current_orders', 0)} orders, ${metrics.get('current_revenue', 0):,.0f} revenue, {metrics.get('current_psu', 0)} PSU
- Last month: {metrics.get('previous_orders', 0)} orders, ${metrics.get('previous_revenue', 0):,.0f} revenue
- Change: {metrics.get('order_change', 0):+.1f}% orders, {metrics.get('revenue_change', 0):+.1f}% revenue
- Streak: {metrics.get('streak', 0)} month {"growth" if metrics.get('streak_type') == 'growth' else "decline" if metrics.get('streak_type') == 'decline' else "no"} streak
- Best ever: {metrics.get('best_orders', 0)} orders ({metrics.get('best_period', 'N/A')})
- Internet: {metrics.get('current_internet', 0)} ({metrics.get('internet_change', 0):+.1f}%)
- Mobile: {metrics.get('current_mobile', 0)} ({metrics.get('mobile_change', 0):+.1f}%)

OUTPUT EXACTLY 3 LINES. Each line is one insight about this performance.

CRITICAL RULES:
- NO introductions ("Here are...", "Let me...", "I love...")
- NO conclusions or sign-offs
- NO bullet points, numbers, or dashes
- Each line must BE an insight, not lead into one
- Max 18 words per line
- One emoji max per line (🔥💪✨ positive, 📊📈 realistic, 💀🚨😤 brutal)
- Reference specific numbers from the data

Example output format (3 lines only):
Your 67% order increase shows serious momentum this month 🔥
Internet sales at 10 units outpaced mobile by 40%
Revenue dropped 18% despite order growth - check your product mix 📊"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 250,
                    "temperature": 0.7
                },
                timeout=15.0
            )
            
            if response.status_code != 200:
                print(f"Groq API error: {response.status_code} - {response.text}")
                return ["Unable to generate AI insights at this time."]
            
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Parse the response - split by newlines and clean up
            insights = []
            for line in content.strip().split("\n"):
                line = _clean_insight(line)
                
                # Skip empty, too short, or intro lines
                if not line or len(line) < 10:
                    continue
                if _is_intro_line(line):
                    continue
                    
                insights.append(line)
            
            # Return up to 3 valid insights
            return insights[:3] if insights else ["Keep pushing forward with your sales goals! 💪"]
            
    except httpx.TimeoutException:
        print("Groq API timeout")
        return ["AI insights temporarily unavailable. Try again later."]
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        return ["Unable to generate AI insights at this time."]


async def generate_multi_tone_insights(metrics: dict) -> dict[str, list[str]]:
    """
    Generate insights for ALL tones (positive, realistic, brutal) in a single API call.
    
    Returns:
        Dictionary mapping tone names to lists of insight strings.
    """
    if not GROQ_API_KEY:
        return {
            "positive": ["AI insights not configured."],
            "realistic": ["AI insights not configured."],
            "brutal": ["AI insights not configured."]
        }
    
    # Combined prompt for all tones
    prompt = f"""ROLE: You are a versatile sales analyst capable of analyzing performance from multiple perspectives.

DATA:
- This month: {metrics.get('current_orders', 0)} orders, ${metrics.get('current_revenue', 0):,.0f} revenue, {metrics.get('current_psu', 0)} PSU
- Last month: {metrics.get('previous_orders', 0)} orders, ${metrics.get('previous_revenue', 0):,.0f} revenue
- Change: {metrics.get('order_change', 0):+.1f}% orders, {metrics.get('revenue_change', 0):+.1f}% revenue
- Streak: {metrics.get('streak', 0)} month {"growth" if metrics.get('streak_type') == 'growth' else "decline" if metrics.get('streak_type') == 'decline' else "no"} streak
- Best ever: {metrics.get('best_orders', 0)} orders ({metrics.get('best_period', 'N/A')})
- Internet: {metrics.get('current_internet', 0)} ({metrics.get('internet_change', 0):+.1f}%)
- Mobile: {metrics.get('current_mobile', 0)} ({metrics.get('mobile_change', 0):+.1f}%)

TASK: Generate 3 sets of insights (3 lines each) corresponding to these tones:
1. POSITIVE: Enthusiastic coach, celebrating wins.
2. REALISTIC: Pragmatic analyst, factual strengths/weaknesses.
3. BRUTAL: Harsh drill sergeant, savage and blunt.

OUTPUT FORMAT:
[POSITIVE]
Line 1
Line 2
Line 3
[REALISTIC]
Line 1
Line 2
Line 3
[BRUTAL]
Line 1
Line 2
Line 3

CRITICAL RULES:
- EXACTLY 3 lines per section
- NO introductions or extra text
- Max 18 words per line
- One emoji max per line
"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 600,
                    "temperature": 0.7
                },
                timeout=20.0
            )
            
            if response.status_code != 200:
                print(f"Groq API error: {response.status_code} - {response.text}")
                return {}
            
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Parse the sections
            sections = {"positive": [], "realistic": [], "brutal": []}
            current_section = None
            
            for line in content.strip().split("\n"):
                line = line.strip()
                if not line:
                    continue
                    
                if "[POSITIVE]" in line.upper():
                    current_section = "positive"
                    continue
                elif "[REALISTIC]" in line.upper():
                    current_section = "realistic"
                    continue
                elif "[BRUTAL]" in line.upper():
                    current_section = "brutal"
                    continue
                    
                if current_section:
                    cleaned = _clean_insight(line)
                    if cleaned and len(cleaned) > 10 and not _is_intro_line(cleaned):
                        sections[current_section].append(cleaned)
            
            # Ensure we have 3 insights for each (pad if needed)
            for tone in sections:
                sections[tone] = sections[tone][:3]
                while len(sections[tone]) < 3:
                    sections[tone].append("Keep pushing forward! 💪")
            
            return sections
            
    except Exception as e:
        print(f"Error generating multi-tone insights: {e}")
        return {}


def is_ai_configured() -> bool:
    """Check if AI insights are configured (API key is set)."""
    return bool(GROQ_API_KEY)

