import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import LeadCard from '@/components/LeadCard';
import LeadDetailDrawer from '@/components/LeadDetailDrawer';
import AddLeadDialog from '@/components/AddLeadDialog';
import { useLeads, useUpdateLead, useCreateVisit, type LeadWithRelations } from '@/hooks/useCrmData';
import type { Database } from '@/integrations/supabase/types';
import { PIPELINE_STAGES, type PipelineStage } from '@/types/crm';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor,
  useSensor, useSensors, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-[60px] space-y-2 transition-all rounded-lg ${isOver ? 'bg-accent/5 ring-1 ring-accent/20' : ''}`}>
      {children}
    </div>
  );
}

function DraggableCard({ lead, onClick }: { lead: LeadWithRelations; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`} onDoubleClick={onClick}>
      <LeadCard lead={{
        id: lead.id, name: lead.name, phone: lead.phone,
        source: lead.source as Database['public']['Enums']['lead_source'], 
        status: lead.status as Database['public']['Enums']['pipeline_stage'],
        assignedAgent: lead.agents?.name || 'Unassigned',
        createdAt: lead.created_at, lastActivity: lead.last_activity_at,
        firstResponseTime: lead.first_response_time_min ?? undefined,
        budget: lead.budget ?? undefined, preferredLocation: lead.preferred_location ?? undefined,
        property: lead.properties?.name ?? undefined,
      }} stale={new Date(lead.last_activity_at).getTime() < Date.now() - 7 * 86400000} />
    </div>
  );
}

const Pipeline = () => {
  const { data: leads, isLoading } = useLeads();
  const updateLead = useUpdateLead();
  const createVisit = useCreateVisit();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeLead = leads?.find(l => l.id === activeId);

  // Conversion rates between stages
  const conversionRates = useMemo(() => {
    if (!leads) return {};
    const rates: Record<string, number> = {};
    for (let i = 0; i < PIPELINE_STAGES.length - 1; i++) {
      const current = leads.filter(l => {
        const idx = PIPELINE_STAGES.findIndex(s => s.key === l.status);
        return idx >= i;
      }).length;
      const next = leads.filter(l => {
        const idx = PIPELINE_STAGES.findIndex(s => s.key === l.status);
        return idx >= i + 1;
      }).length;
      rates[PIPELINE_STAGES[i].key] = current > 0 ? Math.round((next / current) * 100) : 0;
    }
    return rates;
  }, [leads]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragEnd = async (event: { active: any; over: any }) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const lead = active.data.current?.lead as LeadWithRelations;
    const newStatus = over.id as Database['public']['Enums']['pipeline_stage'];

    if (!lead || lead.status === newStatus) return;

    try {
      await updateLead.mutateAsync({ id: lead.id, status: newStatus });
      toast.success(`Moved to ${newStatus.replace('_', ' ')}`);

      // Auto-create visit if moved to visit_scheduled
      if (newStatus === 'visit_scheduled') {
        if (lead.property_id) {
          await createVisit.mutateAsync({
            lead_id: lead.id,
            property_id: lead.property_id,
            assigned_staff_id: lead.assigned_agent_id || null,
            scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });
          toast.success('Visit auto-scheduled for tomorrow in Visits tab');
        } else {
          toast.warning('Moved to Visit Scheduled, but please assign a property to auto-create a visit record.', {
            duration: 5000,
          });
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Failed to update lead');
    }
  };

  const openDetail = (lead: LeadWithRelations) => { setSelectedLead(lead); setDrawerOpen(true); };

  if (isLoading) {
    return (
      <AppLayout title="Pipeline" subtitle="Revenue engine — track leads through every stage">
        <div className="flex gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[400px] w-[272px] rounded-xl" />)}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Pipeline" subtitle="Revenue engine — track leads through every stage" actions={<AddLeadDialog />}>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-2 min-w-max">
            {PIPELINE_STAGES.map((stage, i) => {
              const stageLeads = leads?.filter(l => l.status === stage.key) || [];
              const rate = conversionRates[stage.key];
              return (
                <div key={stage.key} className="flex items-start">
                  <motion.div
                    className="pipeline-column bg-secondary/30 w-[272px]"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                  >
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${stage.color}`} />
                        <h3 className="font-semibold text-[11px] text-foreground">{stage.label}</h3>
                      </div>
                      <span className="text-[10px] font-medium bg-card px-1.5 py-0.5 rounded-md text-muted-foreground border border-border">
                        {stageLeads.length}
                      </span>
                    </div>
                    <DroppableColumn id={stage.key}>
                      {stageLeads.map(lead => (
                        <DraggableCard key={lead.id} lead={lead} onClick={() => openDetail(lead)} />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="text-center py-8 text-[11px] text-muted-foreground">No leads</div>
                      )}
                    </DroppableColumn>
                  </motion.div>

                  {/* Conversion arrow between stages */}
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className="flex flex-col items-center justify-start pt-8 px-0.5 min-w-[28px]">
                      <ArrowRight size={10} className="text-muted-foreground/40" />
                      {rate !== undefined && (
                        <span className={`text-[9px] font-bold mt-0.5 ${
                          rate >= 50 ? 'status-good' : rate >= 25 ? 'status-warn' : 'status-bad'
                        }`}>
                          {rate}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-1 opacity-90">
              <LeadCard lead={{
                id: activeLead.id, name: activeLead.name, phone: activeLead.phone,
                source: activeLead.source as any, status: activeLead.status as any,
                assignedAgent: activeLead.agents?.name || 'Unassigned',
                createdAt: activeLead.created_at, lastActivity: activeLead.last_activity_at,
                firstResponseTime: activeLead.first_response_time_min ?? undefined,
                budget: activeLead.budget ?? undefined, preferredLocation: activeLead.preferred_location ?? undefined,
                property: activeLead.properties?.name ?? undefined,
              }} compact stale={new Date(activeLead.last_activity_at).getTime() < Date.now() - 7 * 86400000} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LeadDetailDrawer lead={selectedLead} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </AppLayout>
  );
};

export default Pipeline;
