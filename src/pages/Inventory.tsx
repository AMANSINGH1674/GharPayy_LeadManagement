import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Users, Home, MapPin } from 'lucide-react';

const PROPERTY_PRICING = {
  coed: [
    { name: "Jazz Coed", pricing: ["Double Sharing: 14,000 - 15,000", "Private Room: 25,000 - 27,000"] },
    { name: "Jack Coed", pricing: ["Double Sharing: 15,000 - 16,000"] },
    { name: "Lexx Coed", pricing: ["Double Sharing: 12,000 - 13,000", "Private Room: 18,000"] },
    { name: "MVS Pearl", pricing: ["Double Sharing: 12,000 - 13,000", "Private Room: 20,000 - 22,000"] },
    { name: "Snook Coed", pricing: ["Double Sharing: 15,000 - 16,000", "Private Room: 22,000 - 24,000"] },
    { name: "Roar Coed", pricing: ["Double Sharing: 11,000 - 12,000", "Private Room: 22,000 - 23,000"] },
    { name: "Nexx Coed", pricing: ["Double Sharing: 15,000 - 16,000", "Private Room: 25,000 - 26,000"] },
    { name: "SG Coed", pricing: ["Double Sharing: 11,000 - 12,000", "Private Room: 21,000 - 23,000"] },
    { name: "Elite Coed", pricing: ["Double Sharing: 15,000 - 16,000", "Private Room: 28,000 - 30,000"] },
    { name: "Korve Coed", pricing: ["Double Sharing: 17,000 - 18,000", "Private Room: 28,000 - 30,000"] },
    { name: "Ace (Flat-like Coed)", pricing: ["Double Sharing: 13,000 - 15,000", "Private Room: 24,000 - 25,000"] },
  ],
  girls: [
    { name: "GQ Girls", pricing: ["Double Sharing: 15,000 - 16,000", "Private Room: 25,000 - 26,000"] },
    { name: "G Forum", pricing: ["Double Sharing: 10,000 - 12,000", "Private Room: 20,000 - 22,000"] },
    { name: "Adler Girls", pricing: ["Double Sharing: 10,000 - 12,000", "Private Room: 18,000 - 20,000"] },
    { name: "Pink Capital", pricing: ["Double Sharing: 13,000 - 14,000", "Private Room: 20,000"] },
    { name: "Joy Girls", pricing: ["Triple Sharing: 9,000 - 10,000", "Double Sharing: 12,000 - 14,000", "Private Room: 21,000 - 23,000"] },
    { name: "S Girly", pricing: ["Double Sharing: 12,000 - 14,000", "Private Room: 21,000 - 23,000"] },
  ],
  boys: [
    { name: "Forum Boys", pricing: ["Double Sharing: 12,000 - 14,000", "Private Room: 21,000 - 23,000"] },
    { name: "John Boys", pricing: ["Triple Sharing: 9,000", "Double Sharing: 12,000", "Private Room: 18,000"] },
    { name: "Airavathi Boys", pricing: ["Double Sharing: 12,000", "Private Room: 18,000"] },
    { name: "Zexus Boys", pricing: ["Double Sharing: 15,000 - 16,000", "Private Room: 25,000 - 26,000"] },
    { name: "Tom Boys", pricing: ["Triple Sharing: 10,000", "Double Sharing: 13,000 - 14,000", "Private Room: 22,000 - 23,000"] },
    { name: "Tove Boys", pricing: ["Double Sharing: 12,000", "Private Room: 18,000"] },
    { name: "Silq Boys", pricing: ["Double Sharing: 12,000", "Private Room: 22,000"] },
    { name: "Xold (Flat-like)", pricing: ["Triple Sharing: 9,000 - 10,000", "Double Sharing: 11,000 - 12,000", "Private Room: 22,000 - 23,000"] },
  ]
};

const Inventory = () => {
  return (
    <AppLayout title="Room Inventory" subtitle="Real-time room availability">
      <div className="space-y-6">
        {/* Property Pricing Sections */}
        <div className="space-y-8">
          {/* CO-ED PG Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                <Users size={16} />
              </div>
              <h2 className="text-sm font-semibold tracking-tight">CO-ED PGs (Koramangala)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {PROPERTY_PRICING.coed.map((p) => (
                <div key={p.name} className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-sm mb-2">{p.name}</h3>
                  <div className="space-y-1">
                    {p.pricing.map((price, idx) => (
                      <p key={idx} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-accent/50" />
                        {price}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GIRLS PG Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-500">
                <Home size={16} />
              </div>
              <h2 className="text-sm font-semibold tracking-tight">GIRLS PGs (Koramangala)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {PROPERTY_PRICING.girls.map((p) => (
                <div key={p.name} className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-sm mb-2">{p.name}</h3>
                  <div className="space-y-1">
                    {p.pricing.map((price, idx) => (
                      <p key={idx} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-pink-400/50" />
                        {price}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BOYS PG Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <MapPin size={16} />
              </div>
              <h2 className="text-sm font-semibold tracking-tight">BOYS PGs (Koramangala)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {PROPERTY_PRICING.boys.map((p) => (
                <div key={p.name} className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-sm mb-2">{p.name}</h3>
                  <div className="space-y-1">
                    {p.pricing.map((price, idx) => (
                      <p key={idx} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400/50" />
                        {price}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Inventory;
