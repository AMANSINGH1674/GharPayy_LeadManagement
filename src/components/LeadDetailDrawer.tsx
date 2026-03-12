import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PIPELINE_STAGES, SOURCE_LABELS } from '@/types/crm';
import { useUpdateLead, useAgents, useCreateVisit, type LeadWithRelations } from '@/hooks/useCrmData';
import { useCreateBooking, useUpdateBooking, useBookingsByLead } from '@/hooks/useBookings';
import { useConversations, useFollowUps, useCreateFollowUp } from '@/hooks/useLeadDetails';
import { useActivityLog } from '@/hooks/useActivityLog';
import { usePropertiesWithOwners, useAllBeds } from '@/hooks/useInventoryData';
import { format, formatDistanceToNow } from 'date-fns';
import { Phone, Mail, MapPin, IndianRupee, Clock, MessageCircle, CalendarCheck, User, Star, Send, Bell, ArrowRightLeft, Eye, Activity, Sparkles, Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  lead: LeadWithRelations | null;
  open: boolean;
  onClose: () => void;
}

const scoreColor = (score: number) => {
  if (score >= 70) return 'text-emerald-600 bg-emerald-100';
  if (score >= 40) return 'text-amber-600 bg-amber-100';
  return 'text-red-600 bg-red-100';
};

const ACTION_ICONS: Record<string, typeof Activity> = {
  status_change: ArrowRightLeft,
  agent_reassigned: User,
  visit_scheduled: Eye,
  visit_outcome: CalendarCheck,
};

const LeadDetailDrawer = ({ lead, open, onClose }: Props) => {
  const updateLead = useUpdateLead();
  const createVisit = useCreateVisit();
  const { data: agents } = useAgents();
  const { data: conversations } = useConversations(lead?.id);
  const { data: followUps } = useFollowUps(lead?.id);
  const { data: activityLog } = useActivityLog(lead?.id);
  const { data: bookings } = useBookingsByLead(lead?.id);
  const { data: properties } = usePropertiesWithOwners();
  const { data: allBeds } = useAllBeds();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();

  const handleUpdateBooking = async (id: string, updates: Record<string, unknown>) => {
    try {
      await updateBooking.mutateAsync({ id, ...updates });
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message);
    }
  };

  const createFollowUp = useCreateFollowUp();
  const [note, setNote] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    budget: '',
    preferred_location: '',
    notes: '',
  });

  useEffect(() => {
    if (lead) {
      setEditForm({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        budget: lead.budget || '',
        preferred_location: lead.preferred_location || '',
        notes: lead.notes || '',
      });
      setEditMode(false);
    }
  }, [lead]);

  const handleAiSummary = async () => {
    if (!lead) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-summary', {
        body: {
          lead: { ...lead, agent_name: lead.agents?.name },
          conversations: conversations?.slice(0, 5),
          visits: [],
          bookings: bookings?.map((b: any) => ({ property_name: b.properties?.name, booking_status: b.booking_status, monthly_rent: b.monthly_rent })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiSummary(data);
    } catch (e: any) {
      toast.error(e.message || 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (!lead) return null;

  const stage = PIPELINE_STAGES.find(s => s.key === lead.status);
  const score = (lead as any).lead_score ?? 0;

  const handleStatusChange = async (status: string) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, status: status as any });
      toast.success(`Status updated to ${PIPELINE_STAGES.find(s => s.key === status)?.label}`);

      // If marked as booked and no booking exists yet, create a basic booking record
      if (status === 'booked' && (bookings?.length || 0) === 0) {
        await createBooking.mutateAsync({
          lead_id: lead.id,
          property_id: lead.property_id || undefined,
          notes: lead.notes || undefined,
          booked_by: lead.assigned_agent_id || undefined,
        });
      }

      // Auto-create visit if moved to visit_scheduled
      if (status === 'visit_scheduled') {
        if (lead.property_id) {
          await createVisit.mutateAsync({
            lead_id: lead.id,
            property_id: lead.property_id,
            assigned_staff_id: lead.assigned_agent_id || null,
            scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
          toast.success('Visit auto-scheduled for tomorrow in Visits tab');
        } else {
          toast.warning('Status updated to Visit Scheduled, but please assign a property above to auto-create a visit record.', {
            duration: 5000,
          });
        }
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAgentChange = async (agentId: string) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, assigned_agent_id: agentId });
      toast.success('Agent reassigned');
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePropertyChange = async (propertyId: string) => {
    try {
      await updateLead.mutateAsync({ id: lead.id, property_id: propertyId === 'none' ? null : propertyId });
      toast.success('Property assigned to lead');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveEdits = async () => {
    if (!lead) return;
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        budget: editForm.budget.trim() || null,
        preferred_location: editForm.preferred_location.trim() || null,
        notes: editForm.notes.trim() || null,
      });
      toast.success('Lead details updated');
      setEditMode(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    }
  };

  const handleAddFollowUp = async () => {
    if (!reminderDate) { toast.error('Pick a date'); return; }
    try {
      await createFollowUp.mutateAsync({
        lead_id: lead.id,
        agent_id: lead.assigned_agent_id,
        reminder_date: new Date(reminderDate).toISOString(),
        note: note || null,
      });
      toast.success('Follow-up scheduled');
      setNote('');
      setReminderDate('');
    } catch (err: any) { toast.error(err.message); }
  };

  const formatAction = (action: string, metadata: any) => {
    switch (action) {
      case 'status_change': return `Status changed from ${(metadata.from || '').replace(/_/g, ' ')} to ${(metadata.to || '').replace(/_/g, ' ')}`;
      case 'agent_reassigned': return 'Agent reassigned';
      case 'visit_scheduled': return `Visit scheduled for ${metadata.scheduled_at ? format(new Date(metadata.scheduled_at), 'MMM d, h:mm a') : 'TBD'}`;
      case 'visit_outcome': return `Visit outcome: ${metadata.outcome || 'unknown'}`;
      default: return action.replace(/_/g, ' ');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto p-0">
        <div className="p-6 border-b border-border">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="font-display text-lg truncate">
                  {editMode ? (
                    <Input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  ) : (
                    lead.name
                  )}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge-pipeline text-[10px] text-primary-foreground ${stage?.color}`}>
                    {stage?.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${scoreColor(score)}`}>
                    <Star size={10} /> {score}/100
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {editMode ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 text-[11px]" onClick={handleSaveEdits} disabled={updateLead.isPending}>
                      {updateLead.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={() => {
                        setEditMode(false);
                        if (lead) {
                          setEditForm({
                            name: lead.name || '',
                            phone: lead.phone || '',
                            email: lead.email || '',
                            budget: lead.budget || '',
                            preferred_location: lead.preferred_location || '',
                            notes: lead.notes || '',
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    onClick={() => setEditMode(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Contact / core details */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone size={12} />
              {editMode ? (
                <Input
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  className="h-8 text-xs"
                />
              ) : (
                lead.phone
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail size={12} />
              {editMode ? (
                <Input
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="Email"
                />
              ) : (
                (lead.email || 'No email')
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin size={12} />
              {editMode ? (
                <Input
                  value={editForm.preferred_location}
                  onChange={e => setEditForm(f => ({ ...f, preferred_location: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="Preferred location"
                />
              ) : (
                (lead.preferred_location || 'No location')
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IndianRupee size={12} />
              {editMode ? (
                <Input
                  value={editForm.budget}
                  onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="Budget"
                />
              ) : (
                (lead.budget || 'No budget')
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={12} /> {lead.first_response_time_min != null ? `${lead.first_response_time_min}m response` : 'No response yet'}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User size={12} /> {lead.agents?.name || 'Unassigned'}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Change Status</label>
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Assign Agent</label>
              <Select value={lead.assigned_agent_id || ''} onValueChange={handleAgentChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {agents?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3">
            <label className="text-[10px] text-muted-foreground mb-1 block">Assigned Property (for Visit/Booking)</label>
            <Select value={lead.property_id || ''} onValueChange={handlePropertyChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {properties?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Summary */}
          <div className="mt-4">
            {!aiSummary && (
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs rounded-xl" onClick={handleAiSummary} disabled={aiLoading}>
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {aiLoading ? 'Analyzing with AI...' : 'AI Lead Analysis'}
              </Button>
            )}
            {aiSummary && (
              <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-accent" />
                  <span className="text-[10px] font-semibold text-accent">AI ANALYSIS</span>
                  <Badge variant="outline" className={`text-[9px] ml-auto ${aiSummary.urgency === 'hot' ? 'border-success text-success' : aiSummary.urgency === 'warm' ? 'border-warning text-warning' : 'border-muted-foreground text-muted-foreground'}`}>
                    {aiSummary.urgency?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-foreground">{aiSummary.intent}</p>
                <p className="text-[10px] text-muted-foreground">{aiSummary.urgency_reason}</p>
                <div className="border-t border-border pt-2 mt-2">
                  <p className="text-[10px] font-medium text-foreground">→ {aiSummary.next_action}</p>
                  <p className="text-[10px] text-destructive mt-0.5">⚠ {aiSummary.risk}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bookings */}
          {bookings && bookings.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1"><Receipt size={10} /> BOOKINGS</p>
              {bookings.map((b: any) => (
                <div key={b.id} className="p-3 rounded-xl bg-secondary/50 space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Select 
                        value={b.property_id || ''} 
                        onValueChange={v => handleUpdateBooking(b.id, { property_id: v, room_id: null, bed_id: null })}
                      >
                        <SelectTrigger className="h-5 text-[10px] border-0 bg-transparent p-0 hover:bg-secondary/80 focus:ring-0">
                          <SelectValue placeholder="Select Property">
                            {b.properties?.name || 'TBD'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {properties?.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select 
                        value={b.bed_id || ''} 
                        onValueChange={v => {
                          const bed = (allBeds as any[] | undefined)?.find(x => (x as any).id === v);
                          handleUpdateBooking(b.id, { bed_id: v, room_id: (bed as any)?.room_id });
                        }}
                        disabled={!b.property_id}
                      >
                        <SelectTrigger className="h-5 text-[10px] border-0 bg-transparent p-0 hover:bg-secondary/80 focus:ring-0">
                          <SelectValue placeholder="Select Bed">
                            {b.rooms?.room_number ? `${b.rooms.room_number}${b.beds?.bed_number ? ` / ${b.beds.bed_number}` : ''}` : 'Select Bed'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(allBeds as any[] | undefined)?.filter(x => (x as any).rooms?.property_id === b.property_id).map((x: any) => (
                            <SelectItem key={x.id} value={x.id}>
                              {x.rooms?.room_number} / {x.bed_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{b.booking_status}</Badge>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">₹</span>
                        <Input 
                          type="number" 
                          defaultValue={b.monthly_rent || ''} 
                          className="h-5 text-[10px] border-0 bg-transparent p-0 hover:bg-secondary/80 w-14 text-right focus-visible:ring-0"
                          onBlur={e => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            if (val !== b.monthly_rent) handleUpdateBooking(b.id, { monthly_rent: val });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <Input 
                      type="date" 
                      defaultValue={b.move_in_date ? format(new Date(b.move_in_date), 'yyyy-MM-dd') : ''} 
                      className="h-5 text-[10px] border-0 bg-transparent p-0 hover:bg-secondary/80 w-full focus-visible:ring-0"
                      onBlur={e => {
                        const val = e.target.value || null;
                        if (val !== b.move_in_date) handleUpdateBooking(b.id, { move_in_date: val });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="p-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="timeline" className="text-xs">Activity</TabsTrigger>
            <TabsTrigger value="conversations" className="text-xs">Messages</TabsTrigger>
            <TabsTrigger value="followups" className="text-xs">Follow-ups</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-2">
            {/* Activity log from DB */}
            {activityLog?.map(entry => {
              const IconComp = ACTION_ICONS[entry.action] || Activity;
              return (
                <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComp size={10} className="text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-xs">{formatAction(entry.action, entry.metadata)}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}</p>
                    {(entry as any).agents?.name && (
                      <p className="text-[10px] text-muted-foreground">by {(entry as any).agents.name}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Static entries */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <User size={10} className="text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-xs">Lead created</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}</p>
                <p className="text-[10px]">Source: {SOURCE_LABELS[lead.source as keyof typeof SOURCE_LABELS]}</p>
              </div>
            </div>

            {(!activityLog || activityLog.length === 0) && (
              <>
                {lead.first_response_time_min != null && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={10} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-xs">First response</p>
                      <p className="text-[10px]">{lead.first_response_time_min} minutes after creation</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {(lead.notes || editMode) && (
              <div className="p-3 rounded-lg bg-accent/50 border border-accent">
                <p className="text-[10px] font-medium text-accent-foreground mb-1">Notes</p>
                {editMode ? (
                  <Textarea
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="text-xs"
                    placeholder="Add notes about this lead..."
                  />
                ) : (
                  <p className="text-xs text-foreground">{lead.notes}</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conversations" className="mt-4">
            <div className="space-y-2">
              {conversations?.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No conversations yet</p>
              )}
              {conversations?.map(c => (
                <div key={c.id} className={`p-3 rounded-lg text-xs ${c.direction === 'inbound' ? 'bg-secondary/50' : 'bg-primary/5 border border-primary/10'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground capitalize">{c.direction === 'inbound' ? lead.name : 'Agent'}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-muted-foreground">{c.message}</p>
                  <Badge variant="outline" className="text-[9px] mt-1">{c.channel}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="followups" className="mt-4 space-y-4">
            <div className="space-y-2">
              {followUps?.map(f => (
                <div key={f.id} className={`p-3 rounded-lg border text-xs ${f.is_completed ? 'bg-secondary/30 border-border' : 'bg-warning/5 border-warning/20'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Bell size={10} /> {format(new Date(f.reminder_date), 'MMM d, h:mm a')}
                    </span>
                    <Badge variant={f.is_completed ? 'secondary' : 'default'} className="text-[9px]">
                      {f.is_completed ? 'Done' : 'Pending'}
                    </Badge>
                  </div>
                  {f.note && <p className="text-muted-foreground mt-1">{f.note}</p>}
                </div>
              ))}
              {followUps?.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No follow-ups scheduled</p>}
            </div>

            {/* Add follow-up */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium text-foreground">Schedule Follow-up</p>
              <input type="datetime-local" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                className="w-full text-xs bg-secondary border border-border rounded-lg px-3 py-2 text-foreground" />
              <Textarea placeholder="Note (optional)..." value={note} onChange={e => setNote(e.target.value)} rows={2} className="text-xs" />
              <Button size="sm" className="w-full gap-1.5 text-xs" onClick={handleAddFollowUp} disabled={createFollowUp.isPending}>
                <CalendarCheck size={12} /> {createFollowUp.isPending ? 'Scheduling...' : 'Schedule Follow-up'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDetailDrawer;
