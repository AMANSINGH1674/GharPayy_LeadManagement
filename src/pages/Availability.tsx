import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Bed, Users, Home, MapPin, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const PROPERTIES = {
  coed: [
    "Jazz Coed", "Jack Coed", "Lexx Coed", "MVS Pearl", "Snook Coed", 
    "Roar Coed", "Nexx Coed", "SG Coed", "Elite Coed", "Korve Coed", "Ace (Flat-like Coed)"
  ],
  girls: [
    "GQ Girls", "G Forum", "Adler Girls", "Pink Capital", "Joy Girls", "S Girly"
  ],
  boys: [
    "Forum Boys", "John Boys", "Airavathi Boys", "Zexus Boys", "Tom Boys", "Tove Boys", "Silq Boys", "Xold (Flat-like)"
  ]
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  available: { label: 'Available', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  last_few: { label: 'Last few left', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: AlertTriangle },
  unavailable: { label: 'Unavailable', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

const Availability = () => {
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('property_availability_statuses');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('property_availability_statuses', JSON.stringify(statuses));
  }, [statuses]);

  const handleStatusChange = (name: string, status: string) => {
    setStatuses(prev => ({ ...prev, [name]: status }));
  };

  const renderSection = (title: string, names: string[], icon: any, colorClass: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10`}>
          {icon}
        </div>
        <h2 className="text-sm font-semibold tracking-tight">{title} (Koramangala)</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {names.map((name) => {
          const currentStatus = statuses[name] || 'available';
          const config = STATUS_CONFIG[currentStatus];
          const StatusIcon = config.icon;

          return (
            <div key={name} className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm">{name}</h3>
                <Badge className={`text-[10px] border ${config.color} px-1.5 py-0`}>
                  <StatusIcon size={10} className="mr-1" />
                  {config.label}
                </Badge>
              </div>
              
              <Select value={currentStatus} onValueChange={(v) => handleStatusChange(name, v)}>
                <SelectTrigger className="h-8 text-[11px] bg-secondary/30 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="last_few">Last few left</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <AppLayout title="Availability" subtitle="Sales intelligence — what to pitch right now">
      <div className="space-y-8">
        {renderSection("CO-ED PGs", PROPERTIES.coed, <Users size={16} />, "text-accent")}
        {renderSection("GIRLS PGs", PROPERTIES.girls, <Home size={16} />, "text-pink-500")}
        {renderSection("BOYS PGs", PROPERTIES.boys, <MapPin size={16} />, "text-blue-500")}
      </div>
    </AppLayout>
  );
};

export default Availability;
