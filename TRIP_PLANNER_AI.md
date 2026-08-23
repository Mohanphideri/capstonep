# Ultra AI Trip Planner

The Trip Maker now has a server-backed planning layer at:

- `POST /api/trip-planner/analyze` — interprets a natural-language travel brief and returns intent, destinations, preferences, constraints, confidence, planner notes and follow-up questions.
- `POST /api/trip-planner/plan` — generates a structured day-by-day planning proposal from the customer's selected trip model.

The planner is intentionally transparent: it does not claim hotel, activity, vehicle availability, pricing or reservations that have not been confirmed by Kuwarji Travels.

The frontend keeps a local fallback parser so the customer can still continue if the planning endpoint is temporarily unavailable.
