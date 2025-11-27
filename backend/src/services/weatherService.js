// backend/src/services/weatherService.js
import axios from 'axios';

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_URL = 'http://api.weatherapi.com/v1';

/**
 * Get current weather and 7-day forecast for a destination
 * @param {string} city - City name
 * @param {string} country - Country name
 * @returns {Promise<Object>} Weather data
 */
export async function getWeatherForecast(city, country) {
  if (!WEATHER_API_KEY) {
    console.warn('⚠️  Weather API key not configured');
    return null;
  }

  try {
    const location = `${city}, ${country}`;

    const response = await axios.get(`${WEATHER_API_URL}/forecast.json`, {
      params: {
        key: WEATHER_API_KEY,
        q: location,
        days: 7,
        aqi: 'no',
        alerts: 'no',
      },
    });

    const data = response.data;

    console.log(`✅ Weather API success for ${location}`);

    return {
      location: {
        name: data.location.name,
        country: data.location.country,
        localtime: data.location.localtime,
      },
      current: {
        temp_c: data.current.temp_c,
        temp_f: data.current.temp_f,
        condition: data.current.condition.text,
        icon: `https:${data.current.condition.icon}`,
        feelslike_c: data.current.feelslike_c,
        humidity: data.current.humidity,
        wind_kph: data.current.wind_kph,
        uv: data.current.uv,
      },
      forecast: data.forecast.forecastday.map(day => ({
        date: day.date,
        day: {
          maxtemp_c: day.day.maxtemp_c,
          mintemp_c: day.day.mintemp_c,
          avgtemp_c: day.day.avgtemp_c,
          condition: day.day.condition.text,
          icon: `https:${day.day.condition.icon}`,
          daily_chance_of_rain: day.day.daily_chance_of_rain,
          daily_chance_of_snow: day.day.daily_chance_of_snow,
          uv: day.day.uv,
        },
      })),
    };
  } catch (error) {
    console.error('❌ Weather API Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Get packing recommendations based on weather forecast
 * @param {Array} forecast - 7-day forecast array
 * @param {Object} tripDates - Start and end dates
 * @returns {Object} Packing recommendations
 */
export function getPackingRecommendations(forecast, tripDates) {
  if (!forecast || forecast.length === 0) {
    return {
      clothing: ['Versatile layers', 'Comfortable walking shoes', 'Light jacket'],
      essentials: ['Sunscreen', 'Water bottle', 'Travel adapter'],
      optional: ['Umbrella', 'Sunglasses'],
    };
  }

  const temps = forecast.map(day => day.day.avgtemp_c);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const maxTemp = Math.max(...temps.map(day => forecast.find(d => d.day.avgtemp_c === day).day.maxtemp_c));
  const minTemp = Math.min(...temps.map(day => forecast.find(d => d.day.avgtemp_c === day).day.mintemp_c));

  const rainChance = Math.max(...forecast.map(day => day.day.daily_chance_of_rain));
  const snowChance = Math.max(...forecast.map(day => day.day.daily_chance_of_snow));
  const maxUV = Math.max(...forecast.map(day => day.day.uv));

  const clothing = [];
  const essentials = ['Travel documents', 'Medications', 'Phone charger', 'Travel adapter'];
  const optional = [];

  // Temperature-based clothing
  if (avgTemp < 5) {
    clothing.push('Heavy winter coat', 'Thermal layers', 'Warm hat & gloves', 'Insulated boots');
  } else if (avgTemp < 15) {
    clothing.push('Medium jacket', 'Long pants', 'Sweater', 'Closed shoes');
  } else if (avgTemp < 25) {
    clothing.push('Light jacket', 'Long & short pants', 'T-shirts', 'Comfortable shoes');
  } else {
    clothing.push('Light summer clothes', 'Shorts', 'Sandals', 'Breathable fabrics');
  }

  // Rain gear
  if (rainChance > 50) {
    essentials.push('Waterproof jacket');
    essentials.push('Umbrella');
    clothing.push('Waterproof shoes');
  } else if (rainChance > 20) {
    optional.push('Light rain jacket');
  }

  // Snow gear
  if (snowChance > 30) {
    essentials.push('Snow boots');
    clothing.push('Waterproof pants');
  }

  // Sun protection
  if (maxUV > 6) {
    essentials.push('High SPF sunscreen (50+)');
    essentials.push('Sunglasses');
    optional.push('Sun hat');
  } else if (maxUV > 3) {
    essentials.push('Sunscreen (30 SPF)');
    optional.push('Sunglasses');
  }

  // Temperature variation
  if (maxTemp - minTemp > 10) {
    clothing.push('Versatile layers (easy to add/remove)');
  }

  return {
    clothing: [...new Set(clothing)],
    essentials: [...new Set(essentials)],
    optional: [...new Set(optional)],
    weatherSummary: {
      avgTemp: Math.round(avgTemp),
      tempRange: `${Math.round(minTemp)}°C - ${Math.round(maxTemp)}°C`,
      rainChance,
      snowChance,
      maxUV,
    },
  };
}
