import { useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Building2, Eye, CalendarCheck, ThumbsUp, ThumbsDown, Minus, Users, Home, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PROPERTY_NAMES = [
  // CO-ED
  "Jazz Coed", "Jack Coed", "Lexx Coed", "MVS Pearl", "Snook Coed", 
  "Roar Coed", "Nexx Coed", "SG Coed", "Elite Coed", "Korve Coed", "Ace (Flat-like Coed)",
  // GIRLS
  "GQ Girls", "G Forum", "Adler Girls", "Pink Capital", "Joy Girls", "S Girly",
  // BOYS
  "Forum Boys", "John Boys", "Airavathi Boys", "Zexus Boys", "Tom Boys", "Tove Boys", "Silq Boys", "Xold (Flat-like)"
];

const EffortDashboard = () => {
  // Fetch properties to map names to IDs
  const { data: dbProperties, isLoading: propsLoading } = useQuery({
    queryKey: ['properties-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  // Get visits per property
  const { data: visits } = useQuery({
    queryKey: ['visits-by-property'],
    queryFn: async () => {
      const { data, error } = await supabase.from('visits').select('property_id, outcome, lead_id');
      if (error) throw error;
      return data;
    },
  });

  // Get leads per property
  const { data: leads } = useQuery({
    queryKey: ['leads-by-property'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('property_id, status');
      if (error) throw error;
      return data;
    },
  });

  const propertyEffort = useMemo(() => {
    return PROPERTY_NAMES.map(name => {
      const dbProp = dbProperties?.find(p => p.name === name);
      const propId = dbProp?.id;

      const pVisits = propId ? (visits?.filter((v: { property_id: string; outcome: string }) => v.property_id === propId) || []) : [];
      const pLeads = propId ? (leads?.filter((l: { property_id: string; status: string }) => l.property_id === propId) || []) : [];

      return {
        id: propId || name,
        name,
        totalBeds: 10,
        totalLeads: pLeads.length,
        totalVisits: pVisits.length,
        booked: pVisits.filter((v: { outcome: string }) => v.outcome === 'booked').length,
        considering: pVisits.filter((v: { outcome: string }) => v.outcome === 'considering').length,
        notInterested: pVisits.filter((v: { outcome: string }) => v.outcome === 'not_interested').length,
      };
    });
  }, [dbProperties, visits, leads]);

  const categories = [
    { title: "CO-ED PGs", icon: <Users size={16} />, color: "text-accent", names: PROPERTY_NAMES.slice(0, 11) },
    { title: "GIRLS PGs", icon: <Home size={16} />, color: "text-pink-500", names: PROPERTY_NAMES.slice(11, 17) },
    { title: "BOYS PGs", icon: <MapPin size={16} />, color: "text-blue-500", names: PROPERTY_NAMES.slice(17) },
  ];

  return (
    <AppLayout title="Effort Visibility" subtitle="Transparent effort metrics per property">
      <div className="space-y-8">
        {propsLoading ? (
          <div className="text-sm text-muted-foreground">Loading effort metrics...</div>
        ) : (
          categories.map(cat => (
            <div key={cat.title} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${cat.color} bg-opacity-10`}>
                  {cat.icon}
                </div>
                <h2 className="text-sm font-semibold tracking-tight">{cat.title} (Koramangala)</h2>
              </div>
              <div className="space-y-3">
                {propertyEffort.filter(p => cat.names.includes(p.name)).map((p) => (
                  <div key={p.id} className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-muted-foreground" />
                          <h3 className="font-semibold text-sm">{p.name}</h3>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Koramangala, Bangalore</p>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 flex-1 max-w-2xl">
                        <MetricCard label="Total Beds" value={p.totalBeds} />
                        <MetricCard label="Leads" value={p.totalLeads} color="text-sky-600" />
                        <MetricCard label="Visits" value={p.totalVisits} color="text-violet-600" />
                        <MetricCard label="Booked" value={p.booked} color="text-emerald-600" />
                        <MetricCard label="Considering" value={p.considering} color="text-amber-600" />
                        <MetricCard label="Not Int." value={p.notInterested} color="text-destructive" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
};

const MetricCard = ({ label, value, color = 'text-foreground' }: { label: string; value: number; color?: string }) => (
  <div className="text-center p-1.5 rounded-lg bg-muted/30 border border-border/50">
    <p className={`text-sm font-bold ${color}`}>{value}</p>
    <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
  </div>
);

export default EffortDashboard;
