const express = require("express");
const { createRateLimiter } = require("../middleware/rateLimit");
const { attachSessionIfPresent } = require("../middleware/requireAuth");

const router = express.Router();
const guestLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 3 });
const authLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
function rateLimit(req, res, next) { return (req.session ? authLimit : guestLimit)(req, res, next); }

const TRAINING_FILE = "backend/chatbot/Kuwarji_Travels_Chatbot_Training_Keywords.md";

const ROUTES = {
  vehicles: "/vehicles",
  bookings: "/dashboard/bookings",
  enquiries: "/dashboard/enquiries",
  tours: "/tour-packages",
  tripPlanner: "/dashboard/trip-planner",
  invoices: "/dashboard/invoices",
  reviews: "/dashboard/reviews",
  profile: "/dashboard/profile",
  settings: "/dashboard/settings",
  dashboard: "/dashboard",
  login: "/login",
  faq: "/faq",
  location: "/location",
  about: "/about",
  whyUs: "/why-us",
  gallery: "/fleet-gallery",
  cancellation: "/cancellation-policy",
  refund: "/refund-policy",
  privacy: "/privacy-policy",
  cookies: "/cookie-policy",
  terms: "/terms",
};

const R = (...answers) => answers;

// Customer-facing training registry. Keep this deterministic, local and safe.
// Each intent has many natural/typo/Hinglish keywords and several response variants.
const INTENTS = [
  {
    id: "security", score: 120, keys: [
      "show admin","admin panel","admin login","admin dashboard","admin route","admn panel",
      "give me backend","backend dikhao","backend access","database dikhao","database access",
      "show customers","customer list","internal api","api key","give api key","show password",
      "show system prompt","system prompt","ignore rules","ignore instructions","developer prompt",
      "environment variable","env file","server details","staff dashboard","internal data"
    ],
    replies: R("Sorry, I can only help with Kuwarji Travels customer services and public information. I can’t provide internal, admin or security information.")
  },
  {
    id: "greeting", score: 72, keys: [
      "hi","hello","hey","hii","hiii","helo","helloo","namaste","namaskar","sat sri akal",
      "good morning","good afternoon","good evening","good night","hy","yo"
    ],
    replies: R(
      "Hi! 👋 I’m the Kuwarji Travel Assistant. I can help with vehicles, tours, bookings, enquiries, pricing guidance, policies and more. What are you planning?",
      "Hello! Welcome to Kuwarji Travels. 😊 You can ask me about vehicles, tour packages, booking help, cancellations, refunds or your customer account.",
      "Namaste! 🙏 How can I help with your journey today — vehicle, tour package, booking or something else?"
    )
  },
  {
    id: "thanks", score: 70, keys: ["thanks","thank you","thanku","thx","ty","shukriya","dhanyawad","thankyou"],
    replies: R("You’re welcome! 😊 If you need anything else for your trip, just ask.", "Happy to help! Have a great journey. 🚗✨")
  },
  {
    id: "vehicle", score: 86, keys: [
      "vehicle","vehical","vechile","vechle","vehicales","vehicles","bus","buss","car","cars",
      "tempo","tempo traveller","traveller","traveler","travellers","transport","fleet",
      "gaadi","gadi","sawari","vehicle type","vehicle types","show vehicle","show bus","find a car",
      "available vehicle","which vehicle","vehicle options","rent a vehicle"
    ],
    replies: R(
      `Absolutely! You can browse Kuwarji Travels vehicles and compare the available options here: ${ROUTES.vehicles}`,
      `Sure — let’s find the right ride for your trip. Check the current vehicle options here: ${ROUTES.vehicles}`,
      `Looking for a bus, car or traveller? 🚐 Explore the fleet here: ${ROUTES.vehicles}`
    )
  },
  {
    id: "vehicle_capacity", score: 84, keys: [
      "capacity","seating","seat","seats","how many people","how many passenger","passengers",
      "kitne log","kitne bande","kitne passenger","kitni seat","seater","7 seater","9 seater",
      "12 seater","17 seater","20 seater","25 seater","people fit","group size"
    ],
    replies: R(
      `Vehicle capacity varies by vehicle. You can compare the listed vehicle options and their details here: ${ROUTES.vehicles}`,
      `Travelling with a group? 👍 Open the vehicle list to choose an option that matches your passenger count: ${ROUTES.vehicles}`
    )
  },
  {
    id: "vehicle_amenities", score: 83, keys: [
      "amenities","facility","facilities","features","ac","air conditioner","air conditioning",
      "luggage","music","comfortable","comfort","pushback","recliner","wifi","charging",
      "vehicle features","bus features","car features","andar kya hai"
    ],
    replies: R(
      `Vehicle features can differ between models. Please open the vehicle listings for the current details: ${ROUTES.vehicles}`,
      `Want to check comfort/features before choosing? The vehicle pages show the available details: ${ROUTES.vehicles}`
    )
  },
  {
    id: "vehicle_availability", score: 82, keys: [
      "vehicle available","vehicle availability","bus available","car available","available for date",
      "available on","free vehicle","free bus","free car","availability","gaadi available",
      "gadi available","mil jayegi","milegi kya","available hai","available h","booking available"
    ],
    replies: R(
      `Availability depends on your travel date and vehicle choice. I won’t guess live availability; please start from the vehicle list and check the relevant option: ${ROUTES.vehicles}`,
      `For a live availability check, choose the vehicle you want and continue through the booking/enquiry flow: ${ROUTES.vehicles}`
    )
  },
  {
    id: "price", score: 78, keys: [
      "price","pricing","rate","rates","cost","kitna","kitne ka","kitne ki","kitne paise",
      "charges","charge","fare","rent","rental","rental price","bus price","car price","vehicle price",
      "tour price","package price","how much","what is the price","budget","budget batao","rate batao"
    ],
    replies: R(
      "Pricing depends on the vehicle/package and trip requirements such as route, distance, duration and date. I won’t invent a live price. Tell me whether you need a vehicle or tour package, and I’ll point you to the right page.",
      `For current vehicle options, start here: ${ROUTES.vehicles}. For tour packages, browse here: ${ROUTES.tours}.`
    )
  },
  {
    id: "booking_new", score: 80, keys: [
      "book","booking","bokking","boking","boking karni","booking karni","book karna","reserve",
      "reservation","reserve vehicle","book bus","book car","book traveller","new booking",
      "make booking","want to book","i want a vehicle","vehicle book","gaadi book","gadi book",
      "mujhe book karna hai"
    ],
    replies: R(
      `Ready to book? 🚐 Start by choosing a vehicle that fits your journey: ${ROUTES.vehicles}`,
      `Sure! Pick your preferred vehicle first, then continue with the booking/enquiry flow: ${ROUTES.vehicles}`,
      `Let’s get your trip moving. Browse the fleet and choose a vehicle here: ${ROUTES.vehicles}`
    )
  },
  {
    id: "my_bookings", score: 82, keys: [
      "my booking","my bookings","meri booking","meri boking","booking history","old booking",
      "past booking","upcoming booking","booking details","where is my booking","show my booking",
      "my reservation","meri reservation","booking dekhni","booking check karni","my trip"
    ],
    replies: R(
      `You can view your bookings from your customer dashboard: ${ROUTES.bookings}`,
      `Your existing trips are available under My Bookings: ${ROUTES.bookings} Please log in if required.`
    )
  },
  {
    id: "booking_status", score: 79, keys: [
      "booking status","status of booking","booking confirmed","confirmed booking","confirmation",
      "booking confirm","confirm hua","booking hua","booking hui","meri booking confirm",
      "is my booking confirmed","booking pending","booking cancelled","booking cancel status"
    ],
    replies: R(
      `For the latest confirmed booking status, please check My Bookings: ${ROUTES.bookings}`,
      `I won’t guess a booking status. Your dashboard has the authoritative status and confirmation: ${ROUTES.bookings}`
    )
  },
  {
    id: "cancel", score: 86, keys: [
      "cancel","cancle","cncl","cxl","cancell","cancel booking","cancle booking","cncl bking","cancel my booking",
      "booking cancel","book cancel","reservation cancel","cancel trip","trip cancel","trip ko cancel","booking ko cancel",
      "cancel kaise","cancel karni hai","cancel karna hai","cancel kar do","cancel krdo","cancel krna","cancel krni",
      "booking cancel karni","booking cancel kar do","meri booking cancel","meri trip cancel","reservation cancel karni",
      "i want to cancel","i need to cancel","please cancel","can i cancel","how do i cancel","how to cancel booking",
      "want cancellation","need cancellation","cancellation request","cancellation karni","cancellation chahiye","cancel my reservation"
    ],
    replies: R(
      `To cancel an eligible booking, open My Bookings and use the cancellation option: ${ROUTES.bookings}. The system will confirm the cancellation before the status changes.`,
      `Need to cancel a trip? Go to My Bookings and open the relevant booking: ${ROUTES.bookings}. If a cancellation option is available, follow it and wait for the system confirmation.`,
      `Want to stop a booking? 🚫 Open the relevant trip in My Bookings: ${ROUTES.bookings}. I can explain the process, but I won’t mark it cancelled unless the system confirms it.`,
      `Cancellation depends on the booking status and applicable policy. Start from My Bookings here: ${ROUTES.bookings}. For the rules/fees, see ${ROUTES.cancellation}.`
    )
  },
  {
    id: "refund", score: 84, keys: [
      "refund","refnd","refun","money back","moneyback","refund kab","refund when","refund kab ayega","money refund","paise wapas",
      "paisa wapas","paise kab wapas","refund kitna","refund policy","refund status","refund pending","refund nahi aya","refund not received",
      "refund late","refund delay","refund delayed","return money","payment returned","amount returned","money returned",
      "cancellation refund","cancel refund","cancelled refund","booking refund","refund for cancelled booking","refund after cancellation",
      "refund request","request refund","need refund","want refund","claim refund","refund kaise milega","refund kaise lena",
      "how refund works","when will i get refund","when refund","refund tracking","refund check"
    ],
    replies: R(
      `Refunds depend on the booking and payment status. For the policy and applicable conditions, see: ${ROUTES.refund}`,
      `If you cancelled a booking, the applicable refund is processed according to the booking policy. Check the policy here: ${ROUTES.refund}`,
      `I can explain the policy, but I won’t claim a refund was processed without a confirmed result. Please review: ${ROUTES.refund}`,
      `Waiting for a refund? 💳 The timing and amount can depend on the booking and cancellation conditions. Check the refund policy here: ${ROUTES.refund}.`,
      `If your refund is still pending, I can’t verify the payment status from chat. Please review the refund rules and use the booking/payment flow for the authoritative status: ${ROUTES.refund}.`
    )
  },
  {
    id: "enquiry", score: 79, keys: [
      "enquiry","enqury","enquir","inquiry","inqury","quote","quotation","quote chahiye",
      "rate ke liye enquiry","price enquiry","price inquiry","send enquiry","make enquiry",
      "requirement","requirements","vehicle requirement","travel enquiry","trip enquiry",
      "mujhe quotation chahiye","quotation chahiye"
    ],
    replies: R(
      `You can submit a travel or vehicle enquiry here: ${ROUTES.enquiries}`,
      `Need a quote or have trip requirements? Start an enquiry from your customer area: ${ROUTES.enquiries}`,
      `Sure — send your route, date and vehicle requirements through the enquiry page: ${ROUTES.enquiries}`
    )
  },
  {
    id: "enquiry_status", score: 78, keys: [
      "enquiry status","enquiry update","my enquiry","my enquiries","meri enquiry","meri inquiry",
      "quote status","quotation status","enquiry pending","enquiry submitted","enquiry check",
      "enquiry history"
    ],
    replies: R(`You can check your submitted enquiries and their latest status here: ${ROUTES.enquiries}`)
  },
  {
    id: "tour", score: 82, keys: [
      "tour","tour pkg","tour package","tour packages","pakage","pakages","package","packages",
      "holiday package","holiday pkg","holiday","vacation package","trip package","travel package",
      "sightseeing package","tour plan","tour plans","tourist package"
    ],
    replies: R(
      `Explore the current tour packages here: ${ROUTES.tours}`,
      `Looking for a ready-made holiday? 🧳 Browse Kuwarji tour packages here: ${ROUTES.tours}`,
      `Sure! You can compare the available tour packages here: ${ROUTES.tours}`
    )
  },
  {
    id: "trip_planner", score: 81, keys: [
      "trip planner","plan my trip","plan trip","trip plan","travel plan","journey plan",
      "itinerary","itinerary bana do","trip banana","trip plan karna","holiday plan",
      "vacation plan","route plan","help plan","planning trip"
    ],
    replies: R(
      `I can help you start planning. Open the Trip Planner and enter your destination, duration and traveller count: ${ROUTES.tripPlanner}`,
      `Let’s plan it! 🗺️ Use the Trip Planner for destination, duration, travellers and trip details: ${ROUTES.tripPlanner}`
    )
  },
  {
    id: "trip_date", score: 68, keys: [
      "travel date","trip date","journey date","date of travel","when travel","kab jana",
      "kis date","date kya","travel kab","going on","departure date"
    ],
    replies: R(
      "Sure. What date are you planning to travel? If you’re checking availability, the date is important.",
      `You can also enter your travel date in the Trip Planner: ${ROUTES.tripPlanner}`
    )
  },
  {
    id: "pickup_drop", score: 75, keys: [
      "pickup","pick up","pick-up","pickup point","pickup location","drop","drop point",
      "drop location","pickup drop","pick and drop","pick up drop","where pickup","where drop",
      "uthana","chhodna","pickup kaha","drop kaha"
    ],
    replies: R(
      "Pickup and drop details depend on your route. Please include the pickup and destination in your enquiry or trip plan so the requirement can be assessed.",
      `You can add route details while planning your trip here: ${ROUTES.tripPlanner}`
    )
  },
  {
    id: "local_trip", score: 72, keys: [
      "local trip","local travel","city ride","city trip","within city","local booking",
      "local vehicle","city tour","local sightseeing","same city","nearby trip","local jana"
    ],
    replies: R(
      `For a local trip, choose a suitable vehicle and share your route/date through the enquiry flow: ${ROUTES.enquiries}`,
      `Yes, you can ask about local travel requirements. Start with the vehicle options: ${ROUTES.vehicles}`
    )
  },
  {
    id: "outstation_trip", score: 72, keys: [
      "outstation","out station","intercity","inter city","outside city","long distance",
      "highway trip","one way","round trip","outstation booking","city to city","dusre city",
      "bahar jana"
    ],
    replies: R(
      `For an outstation journey, select a suitable vehicle and submit your route/date requirements: ${ROUTES.enquiries}`,
      `Planning a city-to-city trip? 🚗 Share pickup, destination, date and traveller count through an enquiry: ${ROUTES.enquiries}`
    )
  },
  {
    id: "invoice", score: 73, keys: [
      "invoice","invioce","bill chahiye","meri invoice","my invoice","my invoices","bill",
      "receipt","payment receipt","invoice download","invoice dekhni","billing"
    ],
    replies: R(`Your customer invoices are available here: ${ROUTES.invoices}`, `Need a past invoice or receipt? Open My Invoices: ${ROUTES.invoices}`)
  },
  {
    id: "review", score: 70, keys: [
      "review","reveiw","rating deni","feedback","rating","review dena","review submit",
      "give review","write review","customer review","my reviews","meri review"
    ],
    replies: R(`You can submit or view your customer reviews here: ${ROUTES.reviews}`, `We value your feedback! ⭐ Open My Reviews to leave or view a review: ${ROUTES.reviews}`)
  },
  {
    id: "login", score: 78, keys: [
      "login","logn","signin","sign in","lgin","log in","login nahi","lgin nhi","account login",
      "cannot login","unable to login","login problem","sign in problem","access account"
    ],
    replies: R(`Having trouble signing in? Please use the secure login page: ${ROUTES.login}`, `You can sign in to your customer account here: ${ROUTES.login}`)
  },
  {
    id: "otp", score: 80, keys: [
      "otp","otpp","otp nahi aya","otp not received","verification code","verification code expired",
      "code not received","login code","verification","verify account","code nahi aya",
      "otp expired","wrong otp","otp issue","captcha","security code"
    ],
    replies: R(
      `For OTP/verification issues, return to the login screen and request a fresh code: ${ROUTES.login}`,
      `If your verification code expired or didn’t arrive, please retry from the secure login flow: ${ROUTES.login} Never share your OTP with anyone.`
    )
  },
  {
    id: "dashboard", score: 69, keys: [
      "dashboard","my dashboard","customer dashboard","account dashboard","dashboard open",
      "dashboard kaha","my account home","customer area"
    ],
    replies: R(`Your customer dashboard is here: ${ROUTES.dashboard}`)
  },
  {
    id: "profile", score: 68, keys: [
      "profile","my profile","account","my account","phone number","mobile number",
      "personal details","edit profile","profile update","name change","account details"
    ],
    replies: R(`You can manage your customer profile here: ${ROUTES.profile}`, `Need to update your account details? Open My Profile: ${ROUTES.profile}`)
  },
  {
    id: "settings", score: 66, keys: ["settings","my settings","account settings","preferences","change settings","profile settings"],
    replies: R(`Your customer settings are available here: ${ROUTES.settings}`)
  },
  {
    id: "payment", score: 74, keys: [
      "payment","pay","pay online","online payment","payment method","how to pay","payment failed",
      "payment issue","payment problem","paid","payment done","payment pending","transaction",
      "upi","card payment","cash payment"
    ],
    replies: R(
      "Payment options and status depend on the booking flow. I won’t claim a payment succeeded without a confirmed result. Please continue through the relevant booking/enquiry flow.",
      `For an existing booking, check your dashboard for the latest payment/booking information: ${ROUTES.bookings}`
    )
  },
  {
    id: "location", score: 76, keys: [
      "location","office location","office address","where are you","where is office","address",
      "map","google map","office kaha","kahan ho","kaha ho","location batao","reach office",
      "office ka address"
    ],
    replies: R(`You can find Kuwarji Travels location information here: ${ROUTES.location}`, `Looking for our office/location details? Open: ${ROUTES.location}`)
  },
  {
    id: "about", score: 62, keys: ["about us","about kuwarji","who are you","company","about company","kuwarji travels","travel company"],
    replies: R(`Learn more about Kuwarji Travels here: ${ROUTES.about}`)
  },
  {
    id: "why_us", score: 62, keys: ["why kuwarji","why choose","why us","best travel","why should i choose","advantages","benefits"],
    replies: R(`Want to know why customers choose Kuwarji Travels? See: ${ROUTES.whyUs}`)
  },
  {
    id: "gallery", score: 60, keys: ["gallery","fleet gallery","photos","vehicle photos","bus photos","car photos","pictures","images","fleet photos"],
    replies: R(`See the fleet gallery here: ${ROUTES.gallery}`, `Want to see the vehicles visually? Open the Fleet Gallery: ${ROUTES.gallery}`)
  },
  {
    id: "faq", score: 61, keys: ["faq","frequently asked","common questions","questions","help questions","faq page"],
    replies: R(`You can browse the full FAQ here: ${ROUTES.faq}`, `Looking for common answers? Open the FAQ page: ${ROUTES.faq}`)
  },
  {
    id: "cancellation_policy", score: 74, keys: [
      "cancellation policy","cancel policy","cancellation rules","cancellation charges","cancel charges",
      "cancellation fee","cancel fee","cancellation terms","booking cancellation policy"
    ],
    replies: R(`You can read the cancellation policy here: ${ROUTES.cancellation}`)
  },
  {
    id: "privacy", score: 60, keys: ["privacy","privacy policy","data privacy","my data","personal data"],
    replies: R(`You can read the privacy policy here: ${ROUTES.privacy}`)
  },
  {
    id: "cookies", score: 58, keys: ["cookie","cookies","cookie policy","browser cookies"],
    replies: R(`You can read the cookie policy here: ${ROUTES.cookies}`)
  },
  {
    id: "terms", score: 58, keys: ["terms","terms and conditions","terms conditions","conditions","terms of service"],
    replies: R(`You can read the terms and conditions here: ${ROUTES.terms}`)
  },
  {
    id: "support", score: 63, keys: [
      "help","halp","hlep","support","suport","suppport","customer support","customer service","customer care",
      "help me","help pls","help please","need help","need assistance","assist me","assistance chahiye","madad chahiye",
      "problem hai","problem he","issue","issue hai","problem","problm","technical problem","technical issue",
      "something wrong","something went wrong","not working","not wokring","doesnt work","does not work",
      "stuck","blocked","unable","cant","cannot","failed","failure","error","error aa raha","error a rha",
      "complaint","complain","complent","compaint","complaint karni","complaint karna","complaint register",
      "file complaint","raise complaint","register complaint","make complaint","report issue","report a problem",
      "bad service","poor service","service issue","driver issue","vehicle issue","booking issue","payment issue",
      "urgent help","urgent support","speak to support","contact support","support team","need agent","human support"
    ],
    replies: R(
      `I’m here to help. Tell me what went wrong and I’ll point you to the safest next step. For common issues, you can also check: ${ROUTES.faq}`,
      `Sorry you’re having trouble. 😟 Describe the issue in one line — for example, booking, payment, vehicle, website or account — and I’ll guide you.`,
      `Need customer support? Tell me the problem and, if relevant, whether it is about a booking, payment, cancellation or website issue. I won’t ask for passwords or OTPs.`,
      `I can help with common support issues and route you to the right customer page. Start by telling me what happened, such as “my booking has an issue” or “payment failed”.`,
      `If you want to report a service problem or complaint, tell me what happened and I’ll help with the next customer-facing step. FAQ: ${ROUTES.faq}`
    )
  },
  {
    id: "website_error", score: 71, keys: [
      "website not working","site not working","page not working","website error","site error",
      "error aa raha","error a rha","something went wrong","page error","button not working",
      "cannot open page","page blank","loading problem","website problem"
    ],
    replies: R(
      `Sorry about that. Please refresh and try again. If the problem continues, check the FAQ: ${ROUTES.faq}`,
      "Sorry! If a page is failing, try refreshing once and signing in again if needed. If it still fails, tell me which page/button is affected."
    )
  },
  {
    id: "trip_info", score: 52, keys: ["trip","journey","travel","traveling","travelling","holiday","vacation","yatra"],
    replies: R(
      "Sure! Are you looking for a vehicle, a ready-made tour package, or help planning a custom trip?",
      `I can help with your journey. You can browse vehicles ${ROUTES.vehicles} or tour packages ${ROUTES.tours}.`
    )
  },
  {
    id: "fallback", score: 1, keys: [],
    replies: R(
      `I can help with vehicles, tour packages, trip planning, bookings, enquiries, pricing guidance, invoices, reviews, login, cancellation, refunds, policies and location. What would you like to do?`,
      "I’m not fully sure what you mean yet. Try asking something like “show vehicles”, “I want to book a bus”, “where is my booking?”, or “tour packages”."
    )
  }
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text) { return normalize(text).split(" ").filter(Boolean); }

function similarityScore(text, key) {
  const hay = normalize(text);
  const needle = normalize(key);
  if (!needle) return 0;
  if (hay === needle) return 130;
  if (hay.includes(needle)) return needle.split(" ").length > 1 ? 112 : 94;
  const h = new Set(tokens(hay));
  const n = tokens(needle);
  if (!n.length) return 0;
  const overlap = n.filter(t => h.has(t)).length / n.length;
  return overlap * (n.length > 1 ? 96 : 82);
}

function chooseReply(replies, seedText = "") {
  const list = Array.isArray(replies) ? replies : [replies];
  if (list.length === 1) return list[0];
  const seed = normalize(seedText).split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return list[seed % list.length];
}

function localReply(text) {
  const normalized = normalize(text);
  if (!normalized) return "Please type your question and I’ll help you with Kuwarji Travels.";

  // Security requests always win, even when they also contain ordinary keywords.
  const security = INTENTS.find(i => i.id === "security");
  for (const key of security.keys) {
    if (similarityScore(normalized, key) >= 80) return security.replies[0];
  }

  let best = null;
  for (const intent of INTENTS.filter(i => i.id !== "security" && i.id !== "fallback")) {
    let score = 0;
    for (const key of intent.keys) score = Math.max(score, similarityScore(normalized, key));
    // Intent priority gives specific intents an edge over broad words like "help", "trip", "price".
    score += intent.score * 0.08;
    if (!best || score > best.score) best = { intent, score };
  }

  if (best && best.score >= 45) return chooseReply(best.intent.replies, normalized);
  return chooseReply(INTENTS.find(i => i.id === "fallback").replies, normalized);
}

router.post("/chat", attachSessionIfPresent, rateLimit, (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ success: false, error: "messages array is required." });
    }

    const trimmed = messages.slice(-12)
      .map(m => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        text: String(m?.text || "").slice(0, 2000)
      }))
      .filter(m => m.text.trim());

    if (!trimmed.length) return res.status(400).json({ success: false, error: "messages array is required." });

    const lastUser = [...trimmed].reverse().find(m => m.role === "user")?.text || "";
    const reply = localReply(lastUser);
    return res.json({ success: true, reply, engine: "local-training-v5" });
  } catch (err) {
    console.error("general local chatbot error", err);
    return res.status(500).json({ success: false, error: "The travel assistant is temporarily unavailable." });
  }
});

module.exports = router;
