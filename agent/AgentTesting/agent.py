from google.adk.agents import Agent
from .tools import get_weather

root_agent = Agent(
    name="weather_agent",
    model="gemini-2.5-flash",
    description="Weather Assistant",
    instruction="""
You are a helpful assistant.

Whenever the user asks about weather, temperature,
humidity, climate, rainfall, or forecast,
use the get_weather tool.
""",
    tools=[get_weather],
)