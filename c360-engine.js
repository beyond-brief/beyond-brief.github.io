// Customer 360 & Next Best Offer: rules-based decision engine.
// Deterministic. Runs on synthetic data only. Sends nothing, calls nothing.
// Works in the browser (window.C360) and in Node (module.exports) so the rules can be tested apart from the UI.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.C360 = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CHANNELS = ["email", "sms", "push"];
  const CHANNEL_LABEL = { email: "Email", sms: "SMS", push: "Push" };
  const CONSENT_LABEL = { opted_in: "Opted in", opted_out: "Opted out", unknown: "No consent record" };
  const SIGNAL_THRESHOLD = 0.6;
  const QUIET_CHANNELS = ["sms", "push"]; // quiet hours hold SMS and push; email can wait in the inbox

  // ---------------------------------------------------------------- Portraits
  // Real photographs licensed from Freepik (free tier, non-AI, downloaded through the studio's account on 2026-10-27).
  // Illustrative only: the people pictured are not these synthetic customers.
  const PORTRAITS = {
    leyla: { src: "/assets/c360/leyla.jpg", credit: "Freepik", page: "https://www.freepik.com/free-photo/front-view-business-woman-suit_9164177.htm" },
    murad: { src: "/assets/c360/murad.jpg", credit: "Freepik", page: "https://www.freepik.com/free-photo/smiley-bearded-man-black-shirt_7496319.htm" },
    aylin: { src: "/assets/c360/aylin.jpg", credit: "Freepik", page: "https://www.freepik.com/free-photo/portrait-woman-with-curly-hair_10823684.htm" },
  };

  // ---------------------------------------------------------------- Segments
  // Each segment is a rule over the profile. Names are the ones a CRM team would recognise.
  const SEGMENTS = [
    { id: "travel_affinity", name: "Travel affinity", rule: "Travel interest signal ≥ 0.6", test: (p) => sig(p, "travel") >= SIGNAL_THRESHOLD },
    { id: "everyday_spender", name: "Everyday spender", rule: "Shopping interest signal ≥ 0.6", test: (p) => sig(p, "shopping") >= SIGNAL_THRESHOLD },
    { id: "active_card", name: "Active card user", rule: "Card active and used in the last 30 days", test: (p) => hasProduct(p, "card", "active") && p.activity.cardTxns30d > 0 },
    { id: "rewards_dormant", name: "Rewards not activated", rule: "Rewards membership registered but never activated", test: (p) => p.membership.status === "registered" },
    { id: "lapsing", name: "Lapsing", rule: "No app or card activity for 45+ days", test: (p) => p.activity.daysSinceActive >= 45 },
    { id: "recently_active", name: "Recently active", rule: "Active within the last 7 days", test: (p) => p.activity.daysSinceActive <= 7 },
  ];

  // ---------------------------------------------------------------- Offers
  // Illustrative propositions. No real rates, fees or guaranteed benefits.
  const OFFERS = [
    {
      id: "travel_rewards", name: "Travel Rewards", base: 60, signal: "travel",
      summary: "Earn extra reward points on eligible travel purchases.",
      terms: "Illustrative offer for demonstration. Eligibility, reward rates and terms would be set by the provider and confirmed before any launch.",
      requires: [
        { text: "Travel interest signal ≥ 0.6", test: (p) => sig(p, "travel") >= SIGNAL_THRESHOLD },
        { text: "Active card held", test: (p) => hasProduct(p, "card", "active") },
      ],
      excludes: [{ text: "Already enrolled in Travel Rewards", test: (p) => hasProduct(p, "travel_rewards") }],
      channels: ["email", "sms", "push"],
      copy: { subject: "{first}, your next trip could earn more", headline: "Make your travel spending count", body: "You've been planning trips lately. Travel Rewards adds extra points to eligible flights, hotels and bookings made with your card.", cta: "See how Travel Rewards works", sms: "{first}, earn extra points on eligible travel spend with your card. Details: bb.example/travel" },
    },
    {
      id: "everyday_shopping", name: "Everyday Shopping Benefits", base: 55, signal: "shopping",
      summary: "Extra points at selected everyday retail partners.",
      terms: "Illustrative offer for demonstration. Partner list and point values are placeholders, not a real programme.",
      requires: [
        { text: "Shopping interest signal ≥ 0.6", test: (p) => sig(p, "shopping") >= SIGNAL_THRESHOLD },
        { text: "Rewards programme member or eligible to join", test: (p) => p.membership.status !== "ineligible" },
      ],
      excludes: [{ text: "Already using Everyday Shopping Benefits", test: (p) => hasProduct(p, "shopping_benefits") }],
      channels: ["email", "sms", "push"],
      copy: { subject: "{first}, more back on the things you buy every week", headline: "Everyday spending, rewarded", body: "Your regular shopping could be earning more. Turn on Everyday Shopping Benefits to collect extra points at selected partners.", cta: "Turn on shopping benefits", sms: "{first}, get extra points on your weekly shop at selected partners. Turn on: bb.example/shop" },
    },
    {
      id: "membership_activation", name: "Membership Activation", base: 50, signal: null,
      summary: "A guided first step for members who registered but never activated.",
      terms: "No incentive attached. Activation steps are illustrative.",
      requires: [{ text: "Rewards membership registered, not activated", test: (p) => p.membership.status === "registered" }],
      excludes: [{ text: "Membership already activated", test: (p) => p.membership.status === "active" }],
      channels: ["email", "sms", "push"],
      copy: { subject: "{first}, your rewards membership is one step away", headline: "Finish setting up your membership", body: "You registered for rewards but haven't activated yet. It takes about a minute in the app.", cta: "Activate membership", sms: "{first}, your rewards membership is ready. Activate in the app: bb.example/activate" },
    },
    {
      id: "service_reengagement", name: "Service Re-engagement", base: 45, signal: null,
      summary: "A helpful check-in for customers who have gone quiet.",
      terms: "Informational. No incentive attached.",
      requires: [{ text: "No activity for 45+ days", test: (p) => p.activity.daysSinceActive >= 45 }],
      excludes: [{ text: "Customer flagged for campaign suppression", test: (p) => p.flags.campaignSuppressed }],
      channels: ["email", "push"],
      copy: { subject: "{first}, here's what's new since your last visit", headline: "A quick look at what's changed", body: "It's been a while. Here are the updates most customers find useful.", cta: "See what's new", sms: "" },
    },
  ];

  // ---------------------------------------------------------------- Synthetic profiles
  const PROFILES = [
    {
      id: "leyla", name: "Leyla M.", first: "Leyla", profileId: "C360-SYN-10482", ageBracket: "30–39", lifecycle: "Established", segmentLabel: "Card-active · travel",
      since: "2021", completeness: 92, timezone: "Asia/Baku",
      products: [{ id: "current_account", name: "Current account", status: "active", usage: "Salary deposits monthly" }, { id: "card", name: "Debit card", status: "active", usage: "38 payments in 30 days" }, { id: "savings", name: "Savings pot", status: "active", usage: "Low balance, no recent deposits" }],
      membership: { name: "Rewards membership", status: "registered" },
      signals: { travel: { score: 0.86, evidence: "5 travel-category card payments and 7 travel page views in 30 days" }, shopping: { score: 0.42, evidence: "Grocery spend steady, no partner activity" }, savings: { score: 0.3, evidence: "Viewed savings page once" } },
      interests: ["Travel", "Dining", "Culture"],
      activity: { daysSinceActive: 1, cardTxns30d: 38, appSessions30d: 22 },
      browsing: ["Travel insurance page · 2 days ago", "Card benefits: travel · 3 days ago", "Currency exchange calculator · 6 days ago"],
      consent: { email: "opted_in", sms: "opted_out", push: "unknown" },
      contactable: { email: true, sms: true, push: false },
      preferredChannel: "email", topics: ["Rewards & offers", "Travel"],
      frequency: { sent7d: 1, cap7d: 3 },
      flags: { campaignSuppressed: false, globalUnsubscribe: false },
      timeline: [["Today", "interaction", "Opened app, viewed card benefits"], ["2 days ago", "transaction", "Card payment · airline (synthetic)"], ["5 days ago", "campaign", "Opened newsletter · \"Spring update\""], ["12 days ago", "transaction", "Card payment · hotel booking (synthetic)"], ["3 weeks ago", "service", "Chat: raised daily card limit"], ["Mar 2024", "lifecycle", "Registered for rewards, not activated"]],
    },
    {
      id: "murad", name: "Murad K.", first: "Murad", profileId: "C360-SYN-20917", ageBracket: "40–49", lifecycle: "Established", segmentLabel: "Everyday spender",
      since: "2019", completeness: 78, timezone: "Asia/Baku",
      products: [{ id: "current_account", name: "Current account", status: "active", usage: "Regular income" }, { id: "card", name: "Debit card", status: "active", usage: "61 payments in 30 days" }],
      membership: { name: "Rewards membership", status: "active" },
      signals: { travel: { score: 0.18, evidence: "No travel spend in 90 days" }, shopping: { score: 0.81, evidence: "Weekly supermarket and pharmacy spend, 3 partner stores visited" }, savings: { score: 0.2, evidence: "No savings activity" } },
      interests: ["Groceries", "Home", "Family"],
      activity: { daysSinceActive: 2, cardTxns30d: 61, appSessions30d: 9 },
      browsing: ["Rewards balance · 2 days ago", "Partner store list · 4 days ago"],
      consent: { email: "unknown", sms: "opted_in", push: "opted_out" },
      contactable: { email: false, sms: true, push: true },
      preferredChannel: "sms", topics: ["Rewards & offers"],
      frequency: { sent7d: 0, cap7d: 2 },
      flags: { campaignSuppressed: false, globalUnsubscribe: false },
      timeline: [["2 days ago", "transaction", "Card payment · supermarket (synthetic)"], ["4 days ago", "interaction", "Viewed partner store list"], ["9 days ago", "campaign", "Clicked SMS · \"Points balance\""], ["1 month ago", "service", "Branch visit: updated mobile number"], ["2023", "lifecycle", "Activated rewards membership"]],
    },
    {
      id: "aylin", name: "Aylin R.", first: "Aylin", profileId: "C360-SYN-31266", ageBracket: "25–29", lifecycle: "Growing", segmentLabel: "Recently active · travel",
      since: "2023", completeness: 85, timezone: "Asia/Baku",
      products: [{ id: "current_account", name: "Current account", status: "active", usage: "Regular income" }, { id: "card", name: "Debit card", status: "active", usage: "24 payments in 30 days" }],
      membership: { name: "Rewards membership", status: "active" },
      signals: { travel: { score: 0.77, evidence: "3 travel bookings and repeated travel page views in 30 days" }, shopping: { score: 0.55, evidence: "Online fashion spend, no partner activity" }, savings: { score: 0.35, evidence: "No savings product" } },
      interests: ["Travel", "Fashion"],
      activity: { daysSinceActive: 3, cardTxns30d: 24, appSessions30d: 15 },
      browsing: ["Travel card benefits · 3 days ago", "Lounge access FAQ · 5 days ago"],
      consent: { email: "opted_out", sms: "opted_out", push: "unknown" },
      contactable: { email: true, sms: true, push: false },
      preferredChannel: "email", topics: [],
      frequency: { sent7d: 0, cap7d: 3 },
      flags: { campaignSuppressed: false, globalUnsubscribe: false },
      timeline: [["3 days ago", "interaction", "Viewed travel card benefits"], ["6 days ago", "transaction", "Card payment · flight booking (synthetic)"], ["2 weeks ago", "lifecycle", "Opted out of marketing email"], ["2 weeks ago", "lifecycle", "Opted out of marketing SMS"], ["2 months ago", "service", "Call: card delivery question"]],
    },
  ];

  // ---------------------------------------------------------------- Helpers
  function sig(p, k) { return (p.signals[k] && p.signals[k].score) || 0; }
  function hasProduct(p, id, status) { return p.products.some((x) => x.id === id && (!status || x.status === status)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fill(t, p) { return String(t || "").replace(/\{first\}/g, p.first); }
  const pct = (n) => Math.round(n * 100);

  // Controls from the interface are applied as data overrides on a copy of the profile.
  // Nothing in controls can select a channel directly: the engine always re-checks consent.
  function applyControls(base, c) {
    const p = clone(base);
    if (!c) return p;
    if (c.consent) for (const ch of CHANNELS) if (c.consent[ch] in CONSENT_LABEL) p.consent[ch] = c.consent[ch];
    if (c.preferredChannel && CHANNELS.includes(c.preferredChannel)) p.preferredChannel = c.preferredChannel;
    if (typeof c.sent7d === "number") p.frequency.sent7d = c.sent7d;
    if (c.globalUnsubscribe != null) p.flags.globalUnsubscribe = !!c.globalUnsubscribe;
    if (c.removeSignals) for (const k of Object.keys(p.signals)) p.signals[k].score = 0;
    if (c.membershipActive) p.membership.status = "active";
    return p;
  }

  // ---------------------------------------------------------------- Decision
  function decide(base, controls = {}, now = { hour: 11 }) {
    const p = applyControls(base, controls);
    const steps = [];

    // 1–2. Load profile, evaluate signals
    const signals = Object.entries(p.signals).map(([k, v]) => ({ key: k, score: v.score, evidence: v.evidence, strong: v.score >= SIGNAL_THRESHOLD }));
    steps.push({ id: "profile", status: "done" });
    steps.push({ id: "signals", status: "done" });

    // 3. Segments
    const segments = SEGMENTS.map((s) => ({ id: s.id, name: s.name, rule: s.rule, match: !!s.test(p) }));

    // 4–5. Eligibility
    const evaluated = OFFERS.map((o) => {
      const req = o.requires.map((r) => ({ text: r.text, pass: !!r.test(p) }));
      const exc = o.excludes.map((r) => ({ text: r.text, hit: !!r.test(p) }));
      const eligible = req.every((r) => r.pass) && !exc.some((e) => e.hit);
      // 6. Transparent ranking: base priority + signal strength + recency
      const signalPts = o.signal ? Math.round(sig(p, o.signal) * 30) : 0;
      const recencyPts = p.activity.daysSinceActive <= 7 ? 10 : 0;
      const score = eligible ? o.base + signalPts + recencyPts : null;
      return { id: o.id, name: o.name, summary: o.summary, terms: o.terms, eligible, requires: req, excludes: exc, score, scoreParts: eligible ? { base: o.base, signal: signalPts, recency: recencyPts } : null, channels: o.channels };
    });
    const ranked = evaluated.filter((o) => o.eligible).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    ranked.forEach((o, i) => { o.rank = i + 1; });
    steps.push({ id: "eligibility", status: "done" });

    const out = { profile: p, signals, segments, offers: evaluated, ranked, steps, now };

    if (!ranked.length) {
      steps.push({ id: "offer", status: "none" });
      return finish(out, { outcome: "no_offer", offer: null, channel: null, branch: "no_offer" });
    }

    // 7. Select
    const offer = ranked[0];
    const offerDef = OFFERS.find((o) => o.id === offer.id);
    steps.push({ id: "offer", status: "done" });

    // 8–9. Consent first, then preference. Preference never overrides permission.
    const order = [p.preferredChannel, ...CHANNELS.filter((c) => c !== p.preferredChannel)];
    const channelChecks = order.map((ch) => {
      const reasons = [];
      if (p.flags.globalUnsubscribe) reasons.push("Customer unsubscribed from all marketing");
      if (p.consent[ch] !== "opted_in") reasons.push(`Marketing ${CHANNEL_LABEL[ch]} consent: ${CONSENT_LABEL[p.consent[ch]].toLowerCase()}`);
      if (!p.contactable[ch]) reasons.push(ch === "push" ? "No app installed with notifications enabled" : `No verified ${CHANNEL_LABEL[ch].toLowerCase()} contact point`);
      if (!offerDef.channels.includes(ch)) reasons.push(`${offer.name} isn't approved for ${CHANNEL_LABEL[ch]}`);
      return { channel: ch, preferred: ch === p.preferredChannel, allowed: reasons.length === 0, reasons };
    });
    const chosen = channelChecks.find((c) => c.allowed);
    if (!chosen) {
      steps.push({ id: "channel", status: "suppressed" });
      return finish(out, { outcome: "suppressed", offer, offerDef, channel: null, channelChecks, branch: "suppressed" });
    }
    const fallback = !chosen.preferred;
    steps.push({ id: "channel", status: "done" });

    // 10. Frequency, then quiet hours
    if (p.frequency.sent7d >= p.frequency.cap7d) {
      return finish(out, { outcome: "held", hold: "frequency", offer, offerDef, channel: chosen.channel, fallback, channelChecks, branch: chosen.channel });
    }
    const quiet = now.hour >= 21 || now.hour < 9;
    if (quiet && QUIET_CHANNELS.includes(chosen.channel)) {
      return finish(out, { outcome: "scheduled", offer, offerDef, channel: chosen.channel, fallback, channelChecks, branch: chosen.channel, sendAt: "09:00 customer local time" });
    }
    return finish(out, { outcome: "ready", offer, offerDef, channel: chosen.channel, fallback, channelChecks, branch: chosen.channel });
  }

  // 11–12. Message preview and explanation, built from the decision itself.
  function finish(out, d) {
    const p = out.profile;
    Object.assign(out, d);
    out.preview = null;
    if ((d.outcome === "ready" || d.outcome === "scheduled") && d.offerDef) {
      const c = d.offerDef.copy;
      out.preview = d.channel === "sms"
        ? { channel: "sms", sender: "BRAND", text: `${fill(c.sms, p)} Reply STOP to opt out.` }
        : d.channel === "email"
          ? { channel: "email", from: "Brand Rewards <offers@brand.example>", subject: fill(c.subject, p), greeting: `Hi ${p.first},`, headline: c.headline, body: c.body, cta: c.cta, terms: d.offerDef.terms }
          : { channel: "push", title: fill(c.headline, p), text: fill(c.body, p) };
    }
    out.why = explain(out);
    return out;
  }

  function explain(o) {
    const p = o.profile;
    const offerWhy = [];
    const channelWhy = [];
    if (!o.offer) {
      offerWhy.push("No offer met all of its eligibility rules for this profile.");
      for (const x of o.offers) {
        const fail = x.requires.filter((r) => !r.pass).map((r) => r.text).concat(x.excludes.filter((e) => e.hit).map((e) => e.text));
        offerWhy.push(`${x.name}: ${fail.length ? "blocked by " + fail.join("; ").toLowerCase() : "eligible"}.`);
      }
      channelWhy.push("No channel was evaluated because there is nothing relevant to send.");
      return { offer: offerWhy, channel: channelWhy };
    }
    const sel = o.offer;
    const def = OFFERS.find((x) => x.id === sel.id);
    if (def.signal) {
      const s = p.signals[def.signal];
      offerWhy.push(`${cap(def.signal)} interest matched (signal ${pct(s.score)}/100: ${s.evidence.toLowerCase()}).`);
    }
    offerWhy.push(`Eligibility confirmed: ${sel.requires.map((r) => r.text.toLowerCase()).join("; ")}.`);
    offerWhy.push(`Score ${sel.score} = priority ${sel.scoreParts.base} + signal ${sel.scoreParts.signal} + recency ${sel.scoreParts.recency}.`);
    const others = o.ranked.slice(1);
    if (others.length) offerWhy.push(`Ranked above ${others.map((x) => `${x.name} (${x.score})`).join(", ")}.`);
    const blocked = o.offers.filter((x) => !x.eligible);
    if (blocked.length) offerWhy.push(`Excluded: ${blocked.map((x) => x.name).join(", ")}.`);

    if (o.outcome === "suppressed") {
      channelWhy.push("No eligible outbound channel. Communication suppressed.");
      for (const c of o.channelChecks) channelWhy.push(`${CHANNEL_LABEL[c.channel]}${c.preferred ? " (preferred)" : ""}: ${c.reasons.join("; ")}.`);
      channelWhy.push("Interest in the offer does not override a missing permission.");
    } else {
      const ch = CHANNEL_LABEL[o.channel];
      if (o.fallback) {
        const pref = o.channelChecks.find((c) => c.preferred);
        channelWhy.push(`Preferred channel ${CHANNEL_LABEL[pref.channel]} is unavailable: ${pref.reasons.join("; ").toLowerCase()}.`);
        channelWhy.push(`${ch} used as the approved fallback: marketing ${ch === "SMS" ? "SMS" : ch.toLowerCase()} consent is active.`);
      } else {
        channelWhy.push(`${ch} is the customer's preferred channel and marketing ${ch === "SMS" ? "SMS" : ch.toLowerCase()} consent is active.`);
      }
      if (o.outcome === "held") channelWhy.push(`Frequency cap reached (${p.frequency.sent7d} of ${p.frequency.cap7d} messages in 7 days). Message held, nothing scheduled.`);
      else if (o.outcome === "scheduled") channelWhy.push(`Quiet hours (21:00–09:00) apply to ${ch}. Scheduled for ${o.sendAt}.`);
      else channelWhy.push(`Within frequency cap (${p.frequency.sent7d} of ${p.frequency.cap7d} in 7 days) and outside quiet hours.`);
    }
    return { offer: offerWhy, channel: channelWhy };
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return { PROFILES, OFFERS, SEGMENTS, PORTRAITS, CHANNELS, CHANNEL_LABEL, CONSENT_LABEL, decide, applyControls };
});
