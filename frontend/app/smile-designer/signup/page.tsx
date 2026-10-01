"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SignupStep = "info" | "stripe" | "shopify" | "confirm";

export default function SmileDesignerSignup() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    practice_name: "",
    phone: "",
    plan: "starter",
  });

  const [shopifyData, setShopifyData] = useState({
    store_url: "",
    access_token: "",
    shop_id: "",
  });

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.practice_name) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Create dentist account
      const response = await fetch("/api/dentist/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create account");
      }

      setStep("stripe");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleShopifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!shopifyData.access_token || !shopifyData.shop_id) {
      setError("Please provide Shopify credentials");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/dentist/connect-shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          ...shopifyData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect Shopify");
      }

      setStep("confirm");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Create Stripe subscription
      const response = await fetch("/api/subscriptions/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: formData.email,
          plan: formData.plan,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }

      const data = await response.json();

      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Smile Designer
          </div>
          <p className="text-gray-600">Join the 1000+ dentists creating passive income</p>
        </div>

        {/* Progress Steps */}
        <div className="flex gap-4 mb-12 justify-center">
          {[
            { step: "info", label: "Practice Info" },
            { step: "stripe", label: "Billing" },
            { step: "shopify", label: "Shopify" },
            { step: "confirm", label: "Done!" },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 ${
                  step === s.step
                    ? "bg-blue-600 text-white"
                    : ["info", "stripe", "shopify"].indexOf(s.step) <
                      ["info", "stripe", "shopify"].indexOf(step)
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step === s.step ? "●" : step === "confirm" ? "✓" : "○"}
              </div>
              <span className="text-xs text-gray-600">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Forms */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Step 1: Practice Info */}
          {step === "info" && (
            <form onSubmit={handleInfoSubmit}>
              <h2 className="text-2xl font-bold mb-6">Tell us about your practice</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@practice.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practice Name
                  </label>
                  <input
                    type="text"
                    value={formData.practice_name}
                    onChange={(e) => setFormData({ ...formData, practice_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bright Smile Dental"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="starter">Starter - $49.99/month</option>
                    <option value="professional">Professional - $99.99/month</option>
                    <option value="enterprise">Enterprise - $299.99/month</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 rounded-lg transition"
              >
                {loading ? "Creating account..." : "Continue to Billing"}
              </button>
            </form>
          )}

          {/* Step 2: Stripe Setup */}
          {step === "stripe" && (
            <form onSubmit={handleStripeSubmit}>
              <h2 className="text-2xl font-bold mb-2">Set up billing</h2>
              <p className="text-gray-600 mb-6">
                We use Stripe for secure payment processing. Your 14-day free trial starts immediately.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🔒</div>
                  <div>
                    <p className="font-bold text-gray-900">Your payment info is secure</p>
                    <p className="text-sm text-gray-600 mt-1">We use industry-standard encryption and never store your credit card details.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Plan: <span className="font-bold text-gray-900">{formData.plan}</span></p>
                <p className="text-sm text-gray-600 mb-2">Trial period: <span className="font-bold text-gray-900">14 days free</span></p>
                <p className="text-sm text-gray-600">After trial: <span className="font-bold text-gray-900">Charged on your billing date</span></p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 rounded-lg transition mb-3"
              >
                {loading ? "Setting up..." : "Continue to Payment"}
              </button>

              <button
                type="button"
                onClick={() => setStep("info")}
                className="w-full border-2 border-gray-300 text-gray-900 font-bold py-3 rounded-lg transition hover:border-gray-400"
              >
                Back
              </button>
            </form>
          )}

          {/* Step 3: Shopify Connection */}
          {step === "shopify" && (
            <form onSubmit={handleShopifySubmit}>
              <h2 className="text-2xl font-bold mb-2">Connect your Shopify store</h2>
              <p className="text-gray-600 mb-6">
                We need permission to create and manage smile mockup products in your store.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-700 mb-3 font-bold">How to get your Shopify credentials:</p>
                <ol className="text-sm text-gray-600 space-y-2 ml-4 list-decimal">
                  <li>Go to Shopify Admin → Settings → Apps & Integrations</li>
                  <li>Click "App and Integration Settings" → Develop apps</li>
                  <li>Create a new app called "Smile Designer"</li>
                  <li>Go to Configuration tab and enable these scopes:
                    <code className="block bg-white p-2 mt-1 text-xs font-mono">write_products, read_products, write_files</code>
                  </li>
                  <li>Copy the Access Token and Shop ID</li>
                </ol>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shopify Store URL
                  </label>
                  <input
                    type="text"
                    value={shopifyData.store_url}
                    onChange={(e) => setShopifyData({ ...shopifyData, store_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your-store.myshopify.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop ID
                  </label>
                  <input
                    type="text"
                    value={shopifyData.shop_id}
                    onChange={(e) => setShopifyData({ ...shopifyData, shop_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="12345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={shopifyData.access_token}
                    onChange={(e) => setShopifyData({ ...shopifyData, access_token: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="shpat_..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 rounded-lg transition mb-3"
              >
                {loading ? "Connecting..." : "Connect Shopify"}
              </button>

              <button
                type="button"
                onClick={() => setStep("stripe")}
                className="w-full border-2 border-gray-300 text-gray-900 font-bold py-3 rounded-lg transition hover:border-gray-400"
              >
                Back
              </button>
            </form>
          )}

          {/* Step 4: Confirmation */}
          {step === "confirm" && (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-3xl font-bold mb-4">You're all set!</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Your Smile Designer account is ready. Your 14-day free trial has started.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <p className="text-green-900 font-bold mb-4">Next steps:</p>
                <ul className="text-left space-y-2 text-green-800">
                  <li>✓ Check your email for dashboard access</li>
                  <li>✓ Create your first smile mockup</li>
                  <li>✓ Publish to Shopify</li>
                  <li>✓ Watch patients respond</li>
                </ul>
              </div>

              <button
                onClick={() => router.push("/dashboard/smile-designer")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-4 rounded-lg transition inline-block"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-8">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
