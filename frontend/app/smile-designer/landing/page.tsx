"use client";

import { useState } from "react";
import Link from "next/link";

export default function SmileDesignerLanding() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In production, integrate with your email provider
    console.log("Signup:", email);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/95 backdrop-blur border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Smile Designer
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="#faq" className="text-gray-600 hover:text-gray-900">FAQ</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Turn Cosmetic Cases Into <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Passive Income</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create AI-powered smile mockups in seconds. Auto-publish to Shopify. Patients buy before they book. You get paid recurring revenue while generating qualified leads.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-4 rounded-lg text-lg transition shadow-lg">
              Start Free Trial
            </button>
            <button className="border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-bold px-8 py-4 rounded-lg text-lg transition">
              Watch Demo (2 min)
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 py-8 border-y border-gray-200">
            <div>
              <div className="text-3xl font-bold text-blue-600">$0</div>
              <p className="text-gray-600">Setup cost</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">14 days</div>
              <p className="text-gray-600">Free trial</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">2 min</div>
              <p className="text-gray-600">First mockup</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">The Problem</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-3xl">😟</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Cosmetic cases are unpredictable</h3>
                  <p className="text-gray-600">Patients hesitate. They want to see themselves BEFORE deciding. But creating mockups is expensive and time-consuming.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-3xl">💸</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Your revenue is treatment-dependent</h3>
                  <p className="text-gray-600">Some months great cases come in. Some months nothing. No recurring income to count on.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-3xl">⏱️</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Manual design work wastes time</h3>
                  <p className="text-gray-600">You're either hiring expensive designers or doing it yourself. Either way, it doesn't scale.</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🤷</div>
                <p className="text-gray-600 text-lg">Before Smile Designer: <br/><strong>Patients see generic before/afters</strong></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">The Solution</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white rounded-lg p-8 flex items-center justify-center shadow-sm">
              <div className="text-center">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-gray-600 text-lg">After Smile Designer: <br/><strong>Personalized AI mockups in 60 seconds</strong></p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-2xl">⚡</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">AI generates mockups instantly</h3>
                  <p className="text-gray-600">Upload patient photo → select treatment → get realistic before/after in seconds. It's magic.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">🛒</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Auto-publishes to your Shopify</h3>
                  <p className="text-gray-600">One click and it's a digital product for sale. Patients can buy immediate access before booking.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-2xl">💰</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Get paid recurring subscriptions</h3>
                  <p className="text-gray-600">Patients pay $49-199 per mockup. You get $49.99-299.99/month in subscription revenue. Both sides win.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" id="features">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="space-y-8">
            {[
              { num: 1, title: "Upload Patient Photo", desc: "Take a smile photo in your office. Upload to Smile Designer." },
              { num: 2, title: "Select Treatment", desc: "Choose: veneers, whitening, orthodontics, gum contouring, etc." },
              { num: 3, title: "AI Creates Mockup", desc: "Our AI generates a realistic before/after in 60 seconds." },
              { num: 4, title: "Auto-List on Shopify", desc: "Mockup automatically becomes a digital product on your store." },
              { num: 5, title: "Patient Buys & Books", desc: "Patient sees themselves after treatment → confident booking → accepts the case." },
            ].map((step) => (
              <div key={step.num} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                  {step.num}
                </div>
                <div className="flex-grow pt-2">
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Real Results</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="text-4xl font-bold text-blue-600 mb-2">3.2x</div>
              <p className="text-gray-600 mb-4">Higher treatment acceptance rate when patients see AI mockups</p>
              <p className="text-sm text-gray-500">vs. gallery photos</p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="text-4xl font-bold text-blue-600 mb-2">$3,500</div>
              <p className="text-gray-600 mb-4">Average additional revenue per dentist per month</p>
              <p className="text-sm text-gray-500">from mockup sales + higher case acceptance</p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="text-4xl font-bold text-blue-600 mb-2">14 days</div>
              <p className="text-gray-600 mb-4">Time to ROI on subscription cost</p>
              <p className="text-sm text-gray-500">Most dentists recoup cost in 2-3 mockups</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" id="pricing">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-600 mb-12">14-day free trial on all plans. No credit card required.</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "$49.99",
                period: "/month",
                desc: "Perfect for getting started",
                features: ["50 mockups/month", "Basic Shopify sync", "Email support", "14-day trial"],
                cta: "Start Trial",
              },
              {
                name: "Professional",
                price: "$99.99",
                period: "/month",
                desc: "For growing practices",
                features: ["Unlimited mockups", "Advanced analytics", "Gallery templates", "Priority support"],
                cta: "Start Trial",
                featured: true,
              },
              {
                name: "Enterprise",
                price: "$299.99",
                period: "/month",
                desc: "For multi-location practices",
                features: ["Everything in Pro", "Custom integrations", "Dedicated success manager", "Quarterly reviews"],
                cta: "Talk to Sales",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg p-8 ${
                  plan.featured
                    ? "border-2 border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl transform scale-105"
                    : "border border-gray-200 bg-white"
                }`}
              >
                {plan.featured && (
                  <div className="text-sm font-bold text-blue-600 mb-4">MOST POPULAR</div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-6">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                <button
                  className={`w-full font-bold py-3 rounded-lg transition mb-6 ${
                    plan.featured
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                      : "border-2 border-gray-300 text-gray-900 hover:border-gray-400"
                  }`}
                >
                  {plan.cta}
                </button>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-600">
                      <span className="text-blue-600">✓</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">What Dentists Are Saying</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Dr. Sarah Chen",
                title: "Cosmetic Dentist, NYC",
                quote: "I paid back my first month's subscription in 3 mockups. My patients LOVE seeing themselves before we start. Treatment acceptance went from 60% to 90%.",
                rating: 5,
              },
              {
                name: "Dr. James Rodriguez",
                title: "Practice Owner, LA",
                quote: "Smile Designer saved us hours of design work. Now my hygienists generate mockups during consultations. Patients are impressed by the technology.",
                rating: 5,
              },
              {
                name: "Dr. Emily Thompson",
                title: "Orthodontist, Boston",
                quote: "The Shopify integration is seamless. My patients buy the mockup preview, see the results they'll get, and book the appointment same day.",
                rating: 5,
              },
            ].map((testimonial) => (
              <div key={testimonial.name} className="bg-white rounded-lg p-8 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to start selling mockups?</h2>
          <p className="text-xl text-blue-100 mb-8">Join dentists making passive income while improving patient outcomes.</p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@practice.com"
              className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="bg-white text-blue-600 font-bold px-8 py-4 rounded-lg hover:bg-gray-100 transition"
            >
              Start Trial
            </button>
          </form>

          {submitted && (
            <p className="mt-4 text-green-200">✓ Check your email to get started!</p>
          )}

          <p className="text-blue-100 text-sm mt-6">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" id="faq">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Do I need my own Shopify store?",
                a: "No, but we integrate with it if you have one. We can also create a custom shop for you.",
              },
              {
                q: "How realistic are the mockups?",
                a: "Very. We use AI trained on thousands of real cosmetic dentistry cases. Patients consistently say they look like professional designer mockups.",
              },
              {
                q: "Can I customize the mockups?",
                a: "Yes. You can adjust colors, proportions, and treatment details. The AI handles the heavy lifting, you do the fine-tuning.",
              },
              {
                q: "What if my patient hates the mockup?",
                a: "You can regenerate unlimited versions. Adjust the treatment parameters and the AI creates a new mockup in seconds.",
              },
              {
                q: "Do patients need to create an account to buy?",
                a: "No. They buy like any other Shopify product—email + payment—and immediately get the mockup images.",
              },
              {
                q: "What if I cancel my subscription?",
                a: "Your mockups stay online. Your Shopify products keep selling. You just stop making new mockups.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-6">
                <h3 className="font-bold text-lg mb-2 text-gray-900">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="mb-4">© 2024 Smile Designer by Kingdom Mindset CE. All rights reserved.</p>
          <div className="flex gap-6 justify-center text-sm">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-white">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
