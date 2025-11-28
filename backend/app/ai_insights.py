"""
AI-powered performance insights using Groq API (Llama 3.1)
"""
import os
import httpx
from typing import Optional

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

# Tone configurations
TONE_PROMPTS = {
    "positive": """You are an enthusiastic, supportive sales coach who always finds the silver lining.
Be encouraging and uplifting! Focus on achievements, growth opportunities, and motivation.
Use positive language and celebrate wins, no matter how small.""",
    
    "realistic": """You are a balanced, pragmatic sales analyst who gives honest assessments.
Be direct and factual. Acknowledge both strengths and areas for improvement.
Give actionable advice without sugar-coating, but remain professional.""",
    
    "brutal": """You are a brutally honest sales drill sergeant who doesn't tolerate excuses.
Be harsh, direct, and unforgiving. Call out poor performance bluntly.
No hand-holding - if numbers are bad, say so. Push them to do better. Be savage but fair."""
}


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
    
    # Build the prompt with performance data
    prompt = f"""{tone_instruction}

Analyze this salesperson's monthly performance and provide exactly 3 short, specific insights (max 20 words each).

PERFORMANCE DATA:
- This month: {metrics.get('current_orders', 0)} orders, ${metrics.get('current_revenue', 0):,.0f} revenue, {metrics.get('current_psu', 0)} PSU
- Last month: {metrics.get('previous_orders', 0)} orders, ${metrics.get('previous_revenue', 0):,.0f} revenue
- Change: {metrics.get('order_change', 0):+.1f}% orders, {metrics.get('revenue_change', 0):+.1f}% revenue
- Streak: {metrics.get('streak', 0)} month {"growth" if metrics.get('streak_type') == 'growth' else "decline" if metrics.get('streak_type') == 'decline' else "no"} streak
- Personal best: {metrics.get('best_orders', 0)} orders in {metrics.get('best_period', 'N/A')}
- Internet: {metrics.get('current_internet', 0)} ({metrics.get('internet_change', 0):+.1f}%)
- Mobile: {metrics.get('current_mobile', 0)} ({metrics.get('mobile_change', 0):+.1f}%)

RULES:
- Match the tone specified above
- Reference specific metrics when relevant
- Use maximum one emoji per insight (use 🔥💪✨ for positive, 📊📈 for realistic, 😤💀🚨 for brutal)
- Each insight must be on its own line
- Do NOT use bullet points, numbers, or dashes
- Keep each insight under 20 words"""

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
                line = line.strip()
                # Remove any leading bullets, numbers, or dashes
                if line.startswith(("-", "•", "*")):
                    line = line[1:].strip()
                if line and len(line) > 5:  # Skip empty or too short lines
                    # Remove leading numbers like "1." or "1)"
                    if len(line) > 2 and line[0].isdigit() and line[1] in ".):":
                        line = line[2:].strip()
                    insights.append(line)
            
            # Return up to 3 insights
            return insights[:3] if insights else ["Great job staying focused on your sales goals!"]
            
    except httpx.TimeoutException:
        print("Groq API timeout")
        return ["AI insights temporarily unavailable. Try again later."]
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        return ["Unable to generate AI insights at this time."]


def is_ai_configured() -> bool:
    """Check if AI insights are configured (API key is set)."""
    return bool(GROQ_API_KEY)

