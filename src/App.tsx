import { useEffect, useMemo, useState } from 'react';
import { destinations, affiliateLinks } from './data/mockData';
import { readSavedPreferences, readTrips, writePreferences, writeTrips } from './lib/storage';
import type { AffiliateLink, Destination, ItineraryDay, SavedTrip, TripPlan, TripPreferences, WeatherDay } from './types';

const defaultPreferences: TripPreferences = {
  destination: 'Paris',
  travelDates: '2026-06-14 to 2026-06-20',
  duration: 6,
  travelers: 2,
  budget: 2200,
  style: 'Adventure',
  interests: ['Culture', 'Food', 'Sightseeing'],
};

const demoWeather: WeatherDay[] = [
  { date: 'Mon', condition: 'Sunny', temperature: { high: 26, low: 18 }, precipitation: 10 },
  { date: 'Tue', condition: 'Partly Cloudy', temperature: { high: 27, low: 19 }, precipitation: 15 },
  { date: 'Wed', condition: 'Warm', temperature: { high: 29, low: 20 }, precipitation: 12 },
  { date: 'Thu', condition: 'Light Rain', temperature: { high: 24, low: 17 }, precipitation: 45 },
  { date: 'Fri', condition: 'Clear', temperature: { high: 28, low: 20 }, precipitation: 8 },
];

const packingChecklist: Record<string, string[]> = {
  Adventure: ['Hiking shoes', 'Light layers', 'Reusable water bottle', 'Travel adapter', 'Compact daypack'],
  Luxury: ['Smart casual outfits', 'Sunglasses', 'Power bank', 'Skincare essentials', 'Formal evening wear'],
  Relaxed: ['Swimwear', 'Sunscreen', 'Beach cover-up', 'Good book', 'Comfortable sandals'],
  Family: ['Snacks', 'Portable chargers', 'First aid kit', 'Entertainment', 'Mini toiletries'],
  Budget: ['Lightweight layers', 'Packable tote', 'Travel towel', 'Dry bag', 'Waterproof jacket'],
};

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const generateTripPlan = (form: TripPreferences): TripPlan => {
  const destination = destinations.find((item) => item.name.toLowerCase() === form.destination.toLowerCase()) ?? destinations[0];
  const planTitle = `${destination.name} Escape`;
  const summary = `A ${form.style.toLowerCase()}-focused ${form.duration}-day itinerary designed for ${form.travelers} travelers with a ${form.budget > 3000 ? 'premium' : 'balanced'} budget.`;

  return {
    title: planTitle,
    summary,
    highlights: [
      `${destination.highlights[0]} experience`,
      `${destination.bestFor.join(' + ')} activities`,
      `${destination.bestTime} is ideal for your trip`,
    ],
    perfectFor: form.interests.length ? form.interests : ['Culture', 'Food'],
    estimatedBudget: Math.max(900, Math.round(form.budget * 0.92)),
    route: `${destination.name}, ${destination.country} • ${destination.region}`,
  };
};

const generateItinerary = (destination: Destination, form: TripPreferences): ItineraryDay[] => {
  const activitySets = [
    {
      title: 'Arrival and neighborhood exploration',
      activities: [
        'Check in and settle into a central stay',
        'Stroll the main historic district',
        'Try a signature local dish',
      ],
      restaurant: 'Café at the heart of the neighborhood',
      cost: 120,
    },
    {
      title: 'Iconic landmarks and scenic walk',
      activities: [
        'Visit a local highlight',
        'Take a guided walking tour',
        'Stop for coffee and people watching',
      ],
      restaurant: 'Casual local bistro',
      cost: 155,
    },
    {
      title: 'Adventure and local culture',
      activities: [
        'Book a themed experience',
        'Explore a nearby market or museum',
        'Enjoy an evening activity with sunset views',
      ],
      restaurant: 'Market-to-table dining',
      cost: 190,
    },
  ];

  return Array.from({ length: Math.min(form.duration, 5) }, (_, index) => ({
    day: `Day ${index + 1}`,
    title: activitySets[index % activitySets.length].title,
    activities: activitySets[index % activitySets.length].activities.map((item, itemIndex) =>
      itemIndex === 0 ? item.replace('a local highlight', destination.highlights[0]) : item,
    ),
    restaurant: activitySets[index % activitySets.length].restaurant,
    cost: activitySets[index % activitySets.length].cost + index * 18,
  }));
};

const generateBudget = (destination: Destination, form: TripPreferences) => {
  const nightlyRate = destination.priceLevel === '$$$' ? 260 : destination.priceLevel === '$$' ? 170 : 110;
  const accommodation = nightlyRate * Math.max(form.duration - 1, 2);
  const transport = form.travelers * 110 + form.duration * 30;
  const food = form.travelers * 65 * form.duration;
  const activities = form.travelers * 75 * Math.max(3, Math.ceil(form.duration / 2));
  const total = accommodation + transport + food + activities;

  return {
    accommodation: Math.round(accommodation),
    transportation: Math.round(transport),
    food: Math.round(food),
    activities: Math.round(activities),
    total: Math.round(total),
    destination,
  };
};

const getDestinationByName = (name: string) => {
  return destinations.find((item) => item.name.toLowerCase() === name.toLowerCase()) ?? destinations[0];
};

const requestJson = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  } catch {
    return null as T;
  }
};

function App() {
  const [preferences, setPreferences] = useState<TripPreferences>(() => ({ ...defaultPreferences, ...readSavedPreferences() }));
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => readTrips());
  const [searchText, setSearchText] = useState(preferences.destination);
  const [tripPlan, setTripPlan] = useState<TripPlan>(() => generateTripPlan({ ...defaultPreferences, ...readSavedPreferences() }));
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(() => generateItinerary(getDestinationByName(defaultPreferences.destination), defaultPreferences));
  const [budget, setBudget] = useState(() => generateBudget(getDestinationByName(defaultPreferences.destination), defaultPreferences));
  const [weather, setWeather] = useState<WeatherDay[]>(demoWeather);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination>(getDestinationByName(defaultPreferences.destination));

  useEffect(() => {
    writePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    writeTrips(savedTrips);
  }, [savedTrips]);

  const destinationResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return destinations;
    return destinations.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query) ||
        item.bestFor.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [searchText]);

  useEffect(() => {
    const item = getDestinationByName(preferences.destination);
    setSelectedDestination(item);
    setItinerary(generateItinerary(item, preferences));
    setBudget(generateBudget(item, preferences));
    setTripPlan(generateTripPlan(preferences));
  }, [preferences]);

  useEffect(() => {
    const city = selectedDestination?.name ?? (preferences.destination || 'Paris');
    requestJson<{ days: WeatherDay[] }>(`/api/weather?city=${encodeURIComponent(city)}&days=5`).then((data) => {
      if (data?.days?.length) {
        setWeather(data.days);
      }
    });
  }, [selectedDestination, preferences.destination]);

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    const response = await requestJson<TripPlan>('/api/trip-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });

    if (response) {
      setTripPlan(response);
    } else {
      setTripPlan(generateTripPlan(preferences));
    }

    const destination = getDestinationByName(preferences.destination);
    setSelectedDestination(destination);
    setItinerary(generateItinerary(destination, preferences));
    setBudget(generateBudget(destination, preferences));
    setLoadingPlan(false);
  };

  const handleDestinationPick = (destination: Destination) => {
    setSearchText(destination.name);
    setPreferences((prev) => ({ ...prev, destination: destination.name }));
  };

  const handleSaveTrip = () => {
    const newTrip: SavedTrip = {
      id: crypto.randomUUID(),
      name: `${preferences.destination} ${preferences.travelDates || 'Trip'}`,
      destination: preferences.destination,
      dates: preferences.travelDates,
      budget: budget.total,
      summary: tripPlan.summary,
      createdAt: new Date().toISOString(),
    };

    setSavedTrips((prev) => [newTrip, ...prev].slice(0, 5));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-violet-500 font-black text-slate-950">T</div>
            <div>
              <p className="text-lg font-bold">TravelMate AI</p>
              <p className="text-xs text-slate-400">Smart travel planning</p>
            </div>
          </div>
          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            <a href="#planner" className="hover:text-white">Planner</a>
            <a href="#discover" className="hover:text-white">Discover</a>
            <a href="#itinerary" className="hover:text-white">Itinerary</a>
            <a href="#budget" className="hover:text-white">Budget</a>
          </nav>
          <button className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-400">
            Start planning
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-10 grid gap-6 rounded-3xl border border-white/10 bg-mesh p-6 shadow-glow md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <span className="mb-3 inline-flex rounded-full border border-brand-400/40 bg-brand-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-brand-200">
              AI trip planning
            </span>
            <h1 className="max-w-xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              Build a trip your way — smarter, faster, and more personal.
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-300">
              Discover destinations, generate detailed itineraries, forecast budget, and pack for the forecast with one travel assistant.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Custom itinerary</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Budget insights</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Local recommendations</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">Planning snapshot</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Destination</p>
                <p className="mt-1 text-2xl font-bold">{preferences.destination || 'Your next city'}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Travelers</p>
                  <p className="mt-2 text-lg font-semibold">{preferences.travelers}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Budget</p>
                  <p className="mt-2 text-lg font-semibold">{formatCurrency(preferences.budget)}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Days</p>
                  <p className="mt-2 text-lg font-semibold">{preferences.duration}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="planner" className="mb-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">AI Trip Planner</h2>
              <button
                onClick={handleGeneratePlan}
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-400"
              >
                {loadingPlan ? 'Generating...' : 'Generate plan'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">Destination</label>
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search destination"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
                />
                {destinationResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-auto rounded-2xl border border-white/10 bg-slate-900 p-2">
                    {destinationResults.map((destination) => (
                      <button
                        key={destination.id}
                        onClick={() => handleDestinationPick(destination)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
                      >
                        <span>
                          <span className="font-medium text-white">{destination.name}</span>
                          <span className="ml-2 text-slate-400">{destination.country}</span>
                        </span>
                        <span className="text-xs text-brand-300">{destination.bestFor[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Travel dates</label>
                <input
                  type="text"
                  value={preferences.travelDates}
                  onChange={(event) => setPreferences((prev) => ({ ...prev, travelDates: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
                  placeholder="Jun 14 - Jun 20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Travelers</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={preferences.travelers}
                  onChange={(event) => setPreferences((prev) => ({ ...prev, travelers: Number(event.target.value) || 1 }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Duration (days)</label>
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={preferences.duration}
                  onChange={(event) => setPreferences((prev) => ({ ...prev, duration: Number(event.target.value) || 2 }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Budget</label>
                <input
                  type="number"
                  min={500}
                  step={100}
                  value={preferences.budget}
                  onChange={(event) => setPreferences((prev) => ({ ...prev, budget: Number(event.target.value) || 500 }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Travel style</label>
                <select
                  value={preferences.style}
                  onChange={(event) => setPreferences((prev) => ({ ...prev, style: event.target.value as TripPreferences['style'] }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-brand-400 focus:outline-none"
                >
                  <option>Adventure</option>
                  <option>Luxury</option>
                  <option>Relaxed</option>
                  <option>Family</option>
                  <option>Budget</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {['Culture', 'Food', 'Nature', 'Beach', 'Nightlife', 'Photography'].map((interest) => {
                    const selected = preferences.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          setPreferences((prev) => ({
                            ...prev,
                            interests: selected
                              ? prev.interests.filter((value) => value !== interest)
                              : [...prev.interests, interest],
                          }));
                        }}
                        className={`rounded-full border px-3 py-2 text-sm transition ${
                          selected ? 'border-brand-400 bg-brand-500/20 text-brand-100' : 'border-white/10 bg-white/5 text-slate-300'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Trip overview</h3>
              <button onClick={handleSaveTrip} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
                Save trip
              </button>
            </div>

            <div className="rounded-2xl border border-brand-400/30 bg-brand-500/10 p-4">
              <p className="text-sm uppercase tracking-[0.12em] text-brand-200">Recommended plan</p>
              <h4 className="mt-2 text-2xl font-bold text-white">{tripPlan.title}</h4>
              <p className="mt-2 text-sm text-slate-300">{tripPlan.summary}</p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Route</p>
                <p className="mt-1 text-sm text-slate-200">{tripPlan.route}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Highlights</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {tripPlan.highlights.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Estimated budget</p>
                <p className="mt-1 text-2xl font-bold text-brand-300">{formatCurrency(tripPlan.estimatedBudget)}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="discover" className="mb-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <h2 className="text-2xl font-bold">Destination discovery</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {destinations.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => handleDestinationPick(destination)}
                  className="rounded-2xl border border-white/10 bg-slate-900 p-4 text-left transition hover:border-brand-400/60 hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{destination.name}</p>
                      <p className="text-sm text-slate-400">{destination.country}</p>
                    </div>
                    <span className="rounded-full bg-brand-500/10 px-2 py-1 text-xs font-medium text-brand-200">{destination.rating.toFixed(1)} ★</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{destination.tagline}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    {destination.bestFor.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 px-2 py-1">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 md:p-6">
            <h3 className="text-xl font-bold">Selected destination</h3>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{selectedDestination.name}</p>
                  <p className="text-sm text-slate-400">{selectedDestination.country} • {selectedDestination.region}</p>
                </div>
                <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2 py-1 text-xs font-medium text-brand-200">{selectedDestination.priceLevel}</span>
              </div>
              <p className="mt-3 text-sm text-slate-300">{selectedDestination.description}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {selectedDestination.highlights.map((item) => (
                  <span key={item} className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200">{item}</span>
                ))}
              </div>
              <div className="mt-4 text-sm text-slate-300">
                <p><span className="font-medium text-white">Best time:</span> {selectedDestination.bestTime}</p>
                <p className="mt-1"><span className="font-medium text-white">Ideal for:</span> {selectedDestination.bestFor.join(', ')}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="itinerary" className="mb-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <h2 className="text-2xl font-bold">Itinerary generator</h2>
            <div className="mt-5 space-y-4">
              {itinerary.map((day) => (
                <div key={day.day} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{day.day}</h3>
                    <span className="text-sm text-brand-200">{formatCurrency(day.cost)}</span>
                  </div>
                  <p className="mt-2 text-base font-medium text-slate-100">{day.title}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {day.activities.map((activity) => (
                      <li key={activity}>• {activity}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-slate-400">Restaurant: {day.restaurant}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 md:p-6">
            <h3 className="text-xl font-bold">Weather & packing</h3>
            <div className="mt-4 space-y-3">
              {weather.map((day) => (
                <div key={day.date} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div>
                    <p className="font-medium text-white">{day.date}</p>
                    <p className="text-sm text-slate-400">{day.condition}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-brand-200">{day.temperature.high}° / {day.temperature.low}°</p>
                    <p className="text-xs text-slate-400">Rain {day.precipitation}%</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm uppercase tracking-[0.12em] text-slate-400">Packing list</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                {(packingChecklist[preferences.style] || packingChecklist.Adventure).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="budget" className="mb-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <h2 className="text-2xl font-bold">Budget calculator</h2>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 p-4">
                <span className="text-slate-300">Accommodation</span>
                <span className="font-semibold text-white">{formatCurrency(budget.accommodation)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 p-4">
                <span className="text-slate-300">Transportation</span>
                <span className="font-semibold text-white">{formatCurrency(budget.transportation)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 p-4">
                <span className="text-slate-300">Food</span>
                <span className="font-semibold text-white">{formatCurrency(budget.food)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 p-4">
                <span className="text-slate-300">Activities</span>
                <span className="font-semibold text-white">{formatCurrency(budget.activities)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/10 to-violet-500/10 p-5 md:p-6">
            <h3 className="text-xl font-bold">Estimated total</h3>
            <p className="mt-4 text-5xl font-black text-brand-200">{formatCurrency(budget.total)}</p>
            <p className="mt-3 text-sm text-slate-300">This estimate is based on your trip preferences and a comfortable itinerary for {preferences.travelers} traveler(s).</p>
            <div className="mt-6 rounded-2xl border border-brand-400/30 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Trip style</p>
              <p className="mt-2 text-lg font-semibold text-white">{preferences.style}</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Interactive map</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">Map preview</span>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-4">
              <div className="h-[320px] rounded-2xl bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.14),_transparent_55%),linear-gradient(135deg,#0f172a,#111827_45%,#1e293b)]">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />
                {destinations.slice(0, 5).map((destination, index) => (
                  <button
                    key={destination.id}
                    onClick={() => handleDestinationPick(destination)}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={{
                      left: `${18 + index * 16}%`,
                      top: `${30 + (index % 3) * 18}%`,
                    }}
                    title={destination.name}
                  >
                    <span className="mb-1 h-3 w-3 rounded-full border-2 border-white bg-brand-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                    <span className="rounded-full border border-white/10 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-200">{destination.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <h2 className="text-2xl font-bold">Affiliate & booking recommendations</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(affiliateLinks as AffiliateLink[]).map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/10 bg-slate-900 p-4 transition hover:border-brand-400/60 hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-brand-200">{link.badge}</span>
                    <span className="text-xs text-slate-400">{link.category}</span>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-white">{link.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{link.description}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 md:p-6">
            <h2 className="text-2xl font-bold">Saved trips</h2>
            {savedTrips.length === 0 ? (
              <p className="mt-4 text-slate-400">No trips saved yet. Save a plan to keep it handy.</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {savedTrips.map((trip) => (
                  <div key={trip.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-lg font-semibold text-white">{trip.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{trip.destination} • {trip.dates}</p>
                    <p className="mt-3 text-sm text-slate-300">{trip.summary}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-brand-200">{formatCurrency(trip.budget)}</span>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{new Date(trip.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
