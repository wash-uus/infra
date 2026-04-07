'use client';

import { useState } from 'react';
import { Mail, MessageSquare, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const TOPICS = [
  'General Inquiry',
  'Technical Support',
  'Billing & Subscriptions',
  'Verification & Documents',
  'Report a Problem',
  'Partnership',
  'Other',
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: TOPICS[0], message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all fields.');
      return;
    }
    setLoading(true);
    // Simulate send — replace with api.post('/contact', form) if backend endpoint is added
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="bg-white py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Contact Us</h1>
          <p className="mt-3 text-gray-500">
            Have a question or need help? We typically respond within 24 hours.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Contact info */}
          <div className="space-y-8">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Get in Touch</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-infra-primary/10">
                    <Mail className="h-4.5 w-4.5 text-infra-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-500">support@infra-platform.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-infra-primary/10">
                    <MessageSquare className="h-4.5 w-4.5 text-infra-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Live Chat</p>
                    <p className="text-sm text-gray-500">Available Mon–Fri, 9am–6pm EAT</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-infra-primary/10">
                    <MapPin className="h-4.5 w-4.5 text-infra-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Headquarters</p>
                    <p className="text-sm text-gray-500">Nairobi, Kenya</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-infra-primary/10">
                    <Clock className="h-4.5 w-4.5 text-infra-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Response Time</p>
                    <p className="text-sm text-gray-500">Within 24 hours on business days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-infra-primary/5 p-5">
              <h3 className="mb-2 font-semibold text-infra-primary">Looking for help?</h3>
              <p className="text-sm text-infra-primary/80">
                Check out our FAQ section on the{' '}
                <a href="/pricing" className="underline">Pricing</a> page, or browse common questions below.
              </p>
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-green-200 bg-green-50 p-10 text-center h-full">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <Mail className="h-7 w-7 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Message Sent!</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Thank you for reaching out. We&apos;ll get back to you at <strong>{form.email}</strong> within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="name">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20"
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20"
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="topic">
                    Topic
                  </label>
                  <select
                    id="topic"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20 bg-white"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  >
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="message">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20 resize-none"
                    placeholder="Describe how we can help you..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-infra-primary px-4 py-3 font-semibold text-white shadow hover:bg-infra-primary disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
