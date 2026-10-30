export type Destination = {
  id: string;
  name: string;
  country: string;
  region: string;
  description: string;
  tagline: string;
  bestFor: string[];
  bestTime: string;
  rating: number;
  priceLevel: string;
  coordinates: { lat: number; lng: number };
  highlights: string[];
  activities: string[];
};

export type TripPreferences = {
  destination: string;
  travelDates: string;
  duration: number;
  travelers: number;
  budget: number;
  style: 'Adventure' | 'Luxury' | 'Relaxed' | 'Family' | 'Budget';
  interests: string[];
};

export type ItineraryDay = {
  day: string;
  title: string;
  activities: string[];
  restaurant: string;
  cost: number;
};

export type TripPlan = {
  title: string;
  summary: string;
  highlights: string[];
  perfectFor: string[];
  estimatedBudget: number;
  route: string;
};

export type WeatherDay = {
  date: string;
  condition: string;
  temperature: { high: number; low: number };
  precipitation: number;
};

export type SavedTrip = {
  id: string;
  name: string;
  destination: string;
  dates: string;
  budget: number;
  summary: string;
  createdAt: string;
};

export type AffiliateLink = {
  id: string;
  title: string;
  category: 'Flights' | 'Stays' | 'Activities' | 'Essentials';
  description: string;
  url: string;
  badge: string;
};
