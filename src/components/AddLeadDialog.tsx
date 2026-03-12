import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, AlertTriangle, Sparkles, Phone, Mail, MapPin, IndianRupee, User, StickyNote } from 'lucide-react';
import { useCreateLead, useAgents } from '@/hooks/useCrmData';
import { SOURCE_LABELS } from '@/types/crm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseLeadTextSafe, type ParsedLead } from '@/lib/parseLeadText';
import { motion } from 'framer-motion';

const AddLeadDialog = () => {
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedLead | null>(null);
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'whatsapp' as string,
    budget: '', preferred_location: '', notes: '', assigned_agent_id: '' as string,
    move_in_date: '', occupancy: '', room_privacy: '', need: '',
  });
  const [duplicate, setDuplicate] = useState<{ id: string; name: string; phone: string; status: string } | null>(null);

  const createLead = useCreateLead();
  const { data: agents } = useAgents();

  const checkDuplicate = async (phone: string) => {
    if (!phone || phone.length < 5) { setDuplicate(null); return; }
    const { data } = await supabase.from('leads').select('id, name, phone, status').eq('phone', phone).limit(1);
    if (data && data.length > 0) setDuplicate(data[0]);
    else setDuplicate(null);
  };

  const handleParse = useCallback((text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsed(null);
      if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
      return;
    }
    
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
    }

    parseTimerRef.current = setTimeout(() => {
      const result = parseLeadTextSafe(text);
      setParsed(result);
      setForm(f => ({
        ...f,
        name: result.name || f.name,
        phone: result.phone || f.phone,
        email: result.email || f.email,
        budget: result.budget || f.budget,
        preferred_location: result.preferred_location || f.preferred_location,
        move_in_date: result.move_in_date || f.move_in_date,
        notes: result.notes || f.notes,
      }));
      if (result.phone) checkDuplicate(result.phone);
    }, 300);
  }, []);

  const normalizePhone = (p: string) => p.replace(/[^\d+]/g, '').replace(/^(\+91)?0*/, (_m, plus) => plus ? '+91' : '').replace(/^(\+91)(\d{10}).*$/, (_m, cc, num) => cc + num).replace(/^([6-9]\d{9}).*$/, (_m, num) => num);
  const isValidPhone = (p: string) => {
    const n = normalizePhone(p);
    return /^\+91[6-9]\d{9}$/.test(n) || /^[6-9]\d{9}$/.test(n);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error('Name and phone are required');
      return;
    }
    if (!isValidPhone(form.phone)) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }
    try {
      const agentId = form.assigned_agent_id || agents?.[0]?.id || null;
      await createLead.mutateAsync({
        name: form.name,
        phone: normalizePhone(form.phone),
        email: form.email || null,
        source: form.source as any,
        budget: form.budget || null,
        preferred_location: form.preferred_location || null,
        notes: form.notes || null,
        assigned_agent_id: agentId,
        status: 'new',
      });
      toast.success('Lead created successfully!');
      setOpen(false);
      setDuplicate(null);
      setParsed(null);
      setRawText('');
      setForm({ name: '', phone: '', email: '', source: 'whatsapp', budget: '', preferred_location: '', notes: '', assigned_agent_id: '', move_in_date: '', occupancy: '', room_privacy: '', need: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    }
  };

  const chips = parsed ? [
    { icon: User, label: 'Name', value: parsed.name, conf: parsed.confidence.name, color: 'text-primary' },
    { icon: Phone, label: 'Phone', value: parsed.phone, conf: parsed.confidence.phone, color: 'text-emerald-500' },
    { icon: Mail, label: 'Email', value: parsed.email, conf: parsed.confidence.email, color: 'text-sky-500' },
    { icon: IndianRupee, label: 'Budget', value: parsed.budget, conf: parsed.confidence.budget, color: 'text-amber-500' },
    { icon: MapPin, label: 'Location', value: parsed.preferred_location, conf: parsed.confidence.location, color: 'text-rose-500' },
    { icon: StickyNote, label: 'Notes', value: parsed.notes, conf: 0.5, color: 'text-muted-foreground' },
  ].filter(f => f.value) : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDuplicate(null); setParsed(null); setRawText(''); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus size={13} /> Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles size={16} className="text-accent" /> Add New Lead
          </DialogTitle>
        </DialogHeader>

        {/* Smart paste area */}
        <div className="space-y-2">
          <Textarea
            placeholder={"Paste lead info here — name, phone, budget, location in any format...\ne.g. Rahul Sharma 9876543210 2BHK Koramangala budget 15-20k"}
            value={rawText}
            onChange={e => handleParse(e.target.value)}
            rows={2}
            className="rounded-xl text-sm resize-none border-2 border-dashed border-accent/30 focus:border-accent bg-accent/5 placeholder:text-muted-foreground/60"
          />
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((f, i) => (
                <motion.span
                  key={f.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border ${
                    f.conf >= 0.8 ? 'bg-accent/10 border-accent/20' : f.conf >= 0.5 ? 'bg-warning/10 border-warning/20' : 'bg-muted border-border'
                  }`}
                >
                  <f.icon size={10} className={f.color} />
                  <span className="text-foreground">{f.value}</span>
                </motion.span>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone *</Label>
              <Input
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                onBlur={() => checkDuplicate(form.phone)}
              />
            </div>
          </div>

          {duplicate && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20">
              <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-foreground">Possible duplicate found</p>
                <p className="text-muted-foreground mt-0.5">
                  <strong>{duplicate.name}</strong> ({duplicate.phone}) — Status: {duplicate.status.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Budget Range</Label>
              <Select value={form.budget} onValueChange={v => setForm(f => ({ ...f, budget: v }))}>
                <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="₹8-12k">₹8-12k</SelectItem>
                  <SelectItem value="₹13-16k">₹13-16k</SelectItem>
                  <SelectItem value="₹21-27k">₹21-27k</SelectItem>
                  <SelectItem value="₹28-35k">₹28-35k</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preferred Location/Landmark</Label>
              <Input placeholder="HSR Layout or map link" value={form.preferred_location} onChange={e => setForm(f => ({ ...f, preferred_location: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Move-in Date</Label>
              <Input type="date" value={form.move_in_date} onChange={e => setForm(f => ({ ...f, move_in_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Occupation</Label>
              <Select value={form.occupancy} onValueChange={v => setForm(f => ({ ...f, occupancy: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="working">Working</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Room</Label>
              <Select value={form.room_privacy} onValueChange={v => setForm(f => ({ ...f, room_privacy: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Need</Label>
              <Select value={form.need} onValueChange={v => setForm(f => ({ ...f, need: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boys">Boys</SelectItem>
                  <SelectItem value="girls">Girls</SelectItem>
                  <SelectItem value="coed">Coed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assign Agent</Label>
            <Select value={form.assigned_agent_id} onValueChange={v => setForm(f => ({ ...f, assigned_agent_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Auto-assign (round robin)" /></SelectTrigger>
              <SelectContent>
                {agents?.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createLead.isPending}>
              {createLead.isPending ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadDialog;