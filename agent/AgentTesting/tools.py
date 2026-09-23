import requests

def get_weather(city: str) -> str:
    """
    Returns the current temperature of a city.
    """

    url = f"https://wttr.in/{city}?format=j1"

    try:
        response = requests.get(url, timeout=10)
        data = response.json()

        current = data["current_condition"][0]

        temperature = current["temp_C"]
        feels_like = current["FeelsLikeC"]
        humidity = current["humidity"]
        description = current["weatherDesc"][0]["value"]

        return (
            f"Current weather in {city}:\n"
            f"🌡 Temperature: {temperature}°C\n"
            f"🤗 Feels Like: {feels_like}°C\n"
            f"💧 Humidity: {humidity}%\n"
            f"☁ Condition: {description}"
        )

    except Exception as e:
        return f"Unable to fetch weather: {e}"