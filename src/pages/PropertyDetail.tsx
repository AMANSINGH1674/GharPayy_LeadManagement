import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Shield, MapPin, Bed, Wifi, Coffee, Shirt, ShieldCheck, Sparkles, Users, MessageCircle, Video, CalendarCheck, CreditCard, Clock, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicProperty, useCreateReservation, useConfirmReservation, useSimilarProperties } from '@/hooks/usePublicData';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import PropertyChat from '@/components/PropertyChat';
import NearbyLandmarks from '@/components/NearbyLandmarks';

const AMENITY_ICONS: Record<string, any> = {
  WiFi: Wifi, Food: Coffee, Laundry: Shirt, Security: ShieldCheck, Cleaning: Sparkles,
};

type ActionMode = null | 'chat' | 'virtual_tour' | 'schedule_visit' | 'pre_book';

export default function PropertyDetail() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { data: property, isLoading } = usePublicProperty(propertyId);
  const createReservation = useCreateReservation();
  const confirmReservation = useConfirmReservation();

  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', moveInDate: '' });
  const [reservationResult, setReservationResult] = useState<any>(null);
  const [heroIdx, setHeroIdx] = useState(0);

  const { data: similarProperties } = useSimilarProperties(property?.area, property?.city, propertyId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading property...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Property not found</h2>
          <Button onClick={() => navigate('/explore')}>Back to Explore</Button>
        </div>
      </div>
    );
  }

  const allRooms = property.rooms || [];
  const vacantBeds = allRooms.flatMap((r: any) => (r.beds || []).filter((b: any) => b.status === 'vacant'));
  const totalBeds = allRooms.reduce((s: number, r: any) => s + (r.beds?.length || 0), 0);

  const getSimRent = (p: any) => {
    const rents = (p.rooms || []).map((r: any) => r.rent_per_bed || r.expected_rent).filter(Boolean);
    if (!rents.length) return p.price_range || '—';
    return `₹${Math.min(...rents).toLocaleString()}`;
  };
  const getSimBeds = (p: any) => (p.rooms || []).flatMap((r: any) => (r.beds || []).filter((b: any) => b.status === 'vacant')).length;

  const handlePreBook = async () => {
    if (!selectedBed || !selectedRoom || !customerForm.name || !customerForm.phone) {
      toast.error('Please fill in all required fields and select a bed.');
      return;
    }
    try {
      const result = await createReservation.mutateAsync({
        property_id: property.id,
        bed_id: selectedBed.id,
        room_id: selectedRoom.id,
        customer_name: customerForm.name,
        customer_phone: customerForm.phone,
        customer_email: customerForm.email || undefined,
        move_in_date: customerForm.moveInDate || undefined,
        room_type: selectedRoom.room_type || undefined,
        monthly_rent: selectedRoom.rent_per_bed || selectedRoom.expected_rent || undefined,
      });
      setReservationResult(result);
      toast.success('Bed reserved! Complete payment within 10 minutes.');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleConfirmPayment = async () => {
    if (!reservationResult?.reservation_id) return;
    try {
      await confirmReservation.mutateAsync({
        reservation_id: reservationResult.reservation_id,
        payment_reference: 'SIM_' + Date.now(),
      });
      toast.success('Booking confirmed! Our team will contact you shortly.');
      setActionMode(null);
      setReservationResult(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const photos = property.photos || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/explore')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Back to search
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-xs">G</span>
            </div>
            <span className="font-semibold text-sm">Gharpayy</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Title Section (Moved above gallery for modern look) */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {(property as any).is_verified && (
                  <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20 text-xs px-2.5 py-0.5 font-medium shadow-none gap-1.5"><Shield size={14} /> Verified Property</Badge>
                )}
                {property.gender_allowed && property.gender_allowed !== 'any' && (
                  <Badge variant="outline" className="text-xs px-2.5 py-0.5 capitalize border-border/60">{property.gender_allowed} only</Badge>
                )}
                {property.gender_allowed === 'any' && (
                  <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-border/60">CO-ED</Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-2">{property.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5"><MapPin size={16} /> {[property.area, property.city].filter(Boolean).join(', ')}</span>
                {(property as any).rating && (
                  <span className="flex items-center gap-1 text-foreground"><Star size={16} className="fill-accent text-accent" /> {(property as any).rating} <span className="text-muted-foreground font-normal underline decoration-muted-foreground/30 underline-offset-4 ml-1">({(property as any).total_reviews || 12} reviews)</span></span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="text-right hidden md:block">
                 <p className="text-sm text-muted-foreground">Starting from</p>
                 <p className="text-2xl font-bold text-foreground">{getSimRent(property)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
               </div>
            </div>
          </div>
        </div>

        {/* Hero Gallery */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10 lg:mb-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-3 rounded-2xl sm:rounded-[24px] overflow-hidden">
            <div className="md:col-span-2 aspect-[4/3] sm:aspect-auto sm:h-[400px] bg-muted relative cursor-pointer group" onClick={() => setHeroIdx((heroIdx + 1) % Math.max(photos.length, (property as any).previewLink ? 1 : 1))}>
              {photos.length > 0 ? (
                <img src={photos[heroIdx % photos.length]} alt={property.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (property as any).previewLink ? (
                <img src={(property as any).previewLink} alt={property.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Bed size={64} className="text-muted-foreground/20" /></div>
              )}
              {photos.length > 1 && (
                <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-md border border-border/50 text-xs font-semibold shadow-sm">
                  {heroIdx + 1} / {photos.length}
                </div>
              )}
            </div>
            <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2 sm:gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[4/3] sm:aspect-auto sm:h-[194px] bg-muted relative overflow-hidden cursor-pointer group" onClick={() => photos[i] && setHeroIdx(i)}>
                  {photos[i] ? (
                    <img src={photos[i]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/50"><Bed size={24} className="text-muted-foreground/15" /></div>
                  )}
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">

            {/* Stats */}
            <div className="flex items-center justify-between py-6 border-y border-border/50">
              <div className="text-center flex-1">
                <p className="text-2xl font-semibold text-foreground">{vacantBeds.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Beds Available</p>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="text-center flex-1">
                <p className="text-2xl font-semibold text-foreground">{allRooms.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Rooms</p>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="text-center flex-1">
                <p className="text-2xl font-semibold text-foreground">{totalBeds}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Capacity</p>
              </div>
            </div>

            {/* Amenities */}
            {property.amenities?.length > 0 && (
              <>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight mb-5">What this place offers</h2>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    {property.amenities.map((amenity: string) => {
                      const Icon = AMENITY_ICONS[amenity] || Check;
                      return (
                        <div key={amenity} className="flex items-center gap-3">
                          <Icon size={20} className="text-foreground/80" strokeWidth={1.5} />
                          <span className="text-sm font-medium text-foreground/90">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator className="bg-border/50" />
              </>
            )}

            {/* Rooms */}
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-5">Select your room</h2>
              <div className="space-y-4">
                {allRooms.map((room: any) => {
                  const roomVacant = (room.beds || []).filter((b: any) => b.status === 'vacant').length;
                  const rent = room.rent_per_bed || room.expected_rent;
                  const isSelected = selectedRoom?.id === room.id;
                  return (
                    <div key={room.id} className={`p-5 rounded-2xl border transition-all duration-200 ${isSelected ? 'border-accent bg-accent/5 shadow-sm' : 'border-border/60 hover:border-border bg-card'}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base text-foreground">Room {room.room_number}</h3>
                            {room.room_type && <Badge variant="secondary" className="text-[10px] capitalize bg-secondary/50">{room.room_type}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {room.floor && `Floor ${room.floor} · `}{room.furnishing && `${room.furnishing} · `}{room.bathroom_type || 'Shared'} bathroom
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">{rent ? `₹${rent.toLocaleString()}` : '—'}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                          <p className={`text-xs mt-0.5 font-medium ${roomVacant > 0 ? 'text-success' : 'text-muted-foreground'}`}>{roomVacant} of {room.bed_count} beds free</p>
                        </div>
                      </div>
                      
                      {roomVacant > 0 && (
                        <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-border/50">
                          <span className="text-xs font-medium text-muted-foreground w-full mb-1">Available beds:</span>
                          {(room.beds || []).filter((b: any) => b.status === 'vacant').map((bed: any) => {
                            const bedSelected = selectedBed?.id === bed.id;
                            return (
                              <button
                                key={bed.id}
                                onClick={() => { setSelectedRoom(room); setSelectedBed(bed); }}
                                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                                  bedSelected
                                    ? 'bg-accent text-accent-foreground border-accent shadow-md scale-[1.02]'
                                    : 'bg-background text-foreground border-border/60 hover:border-muted-foreground/40 hover:bg-secondary/20'
                                }`}
                              >
                                <Bed size={14} className="inline mr-1.5 opacity-70" />{bed.bed_number}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Nearby Landmarks */}
            <NearbyLandmarks latitude={(property as any).latitude} longitude={(property as any).longitude} city={property.city || undefined} />

            {/* Confidence Signals */}
            <div className="py-2 space-y-4">
              {(property as any).is_verified && (
                <div className="flex items-start gap-4">
                  <Shield size={24} className="text-success mt-0.5" strokeWidth={1.5} />
                  <div>
                    <h4 className="font-medium text-foreground">Verified by Gharpayy</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">This property has been physically inspected for quality and safety.</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-4">
                <Clock size={24} className="text-foreground/70 mt-0.5" strokeWidth={1.5} />
                <div>
                  <h4 className="font-medium text-foreground">Real-time availability</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">The room status you see is updated instantly.</p>
                </div>
              </div>
            </div>

            {/* Similar Properties */}
            {similarProperties && similarProperties.length > 0 && (
              <>
                <Separator className="bg-border/50" />
                <div>
                  <h2 className="text-xl font-semibold tracking-tight mb-5">Similar properties nearby</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {similarProperties.slice(0, 3).map((sp: any) => (
                      <div
                        key={sp.id}
                        className="rounded-2xl border border-border/60 bg-card overflow-hidden cursor-pointer hover:shadow-md hover:border-border transition-all duration-300 group"
                        onClick={() => navigate(`/property/${sp.id}`)}
                      >
                        <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                          {sp.photos?.[0] ? (
                            <img src={sp.photos[0]} alt={sp.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                          ) : sp.previewLink ? (
                            <img src={sp.previewLink} alt={sp.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary/50"><Bed size={32} className="text-muted-foreground/20" /></div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-base text-foreground line-clamp-1">{sp.name}</h3>
                          <p className="text-xs text-muted-foreground mb-3">{sp.area}</p>
                          <div className="flex justify-between items-baseline pt-3 border-t border-border/50">
                            <span className="font-bold text-base">From {getSimRent(sp)}</span>
                            <span className="text-[11px] font-medium text-success">{getSimBeds(sp)} beds free</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="rounded-[24px] border border-border/60 bg-card shadow-xl p-6 mb-8">
                <div className="mb-6">
                  <h3 className="font-semibold text-2xl mb-1 text-foreground">₹1,000<span className="text-sm font-normal text-muted-foreground ml-1">to pre-book</span></h3>
                  <p className="text-sm text-muted-foreground">Reserve instantly. Fully refundable.</p>
                </div>

                <div className="space-y-3 mb-6">
                  <Button className="w-full h-14 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-md transition-transform active:scale-[0.98]" onClick={() => setActionMode('pre_book')}>
                    Pre-Book Now
                  </Button>
                  <Button variant="outline" className="w-full h-12 text-sm font-medium rounded-xl border-border/80 hover:bg-secondary/50" onClick={() => setActionMode('schedule_visit')}>
                    Schedule a Visit
                  </Button>
                </div>

                <Separator className="my-6 bg-border/50" />

                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground mb-2">Have questions?</p>
                  <button className="flex items-center gap-4 w-full p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left border border-transparent hover:border-border/50" onClick={() => setChatOpen(true)}>
                    <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center shrink-0">
                      <MessageCircle size={18} className="text-info" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Chat with us</p>
                      <p className="text-xs text-muted-foreground">Usually replies in 5m</p>
                    </div>
                  </button>

                  <button className="flex items-center gap-4 w-full p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left border border-transparent hover:border-border/50" onClick={() => setActionMode('virtual_tour')}>
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Video size={18} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Virtual Tour</p>
                      <p className="text-xs text-muted-foreground">Explore via video call</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Nearby areas */}
              <div>
                <h4 className="text-sm font-medium mb-4 text-foreground/80 px-1">Explore nearby areas</h4>
                <div className="flex flex-wrap gap-2">
                  {['Bellandur', 'Brookefield', 'Whitefield', 'Marathahalli', 'Sarjapur Road', 'HSR Layout'].map(area => (
                    <button key={area} className="px-3 py-1.5 rounded-full border border-border/60 bg-card text-xs font-medium hover:border-accent/40 hover:bg-secondary/30 transition-colors" onClick={() => navigate(`/explore?area=${area}`)}>
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <PropertyChat propertyName={property.name} isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Pre-Book Dialog */}
      <Dialog open={actionMode === 'pre_book'} onOpenChange={(o) => { if (!o) { setActionMode(null); setReservationResult(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{reservationResult ? 'Complete Payment' : 'Pre-Book a Bed'}</DialogTitle>
          </DialogHeader>
          {!reservationResult ? (
            <div className="space-y-4">
              {selectedBed ? (
                <div className="p-3 rounded-lg bg-secondary text-sm">
                  <strong>{property.name}</strong> · Room {selectedRoom?.room_number} · Bed {selectedBed.bed_number}
                  <br /><span className="text-muted-foreground">₹{(selectedRoom?.rent_per_bed || selectedRoom?.expected_rent || 0).toLocaleString()}/month</span>
                </div>
              ) : (
                <p className="text-sm text-destructive">Please select a bed from the rooms section first.</p>
              )}
              <div className="space-y-3">
                <div><Label>Full Name *</Label><Input value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Phone *</Label><Input value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Email</Label><Input value={customerForm.email} onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Move-in Date</Label><Input type="date" value={customerForm.moveInDate} onChange={e => setCustomerForm(f => ({ ...f, moveInDate: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button onClick={handlePreBook} disabled={!selectedBed || !customerForm.name || !customerForm.phone || createReservation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {createReservation.isPending ? 'Reserving...' : 'Reserve Bed — ₹1,000'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                <Check size={32} className="mx-auto text-success mb-2" />
                <p className="font-medium text-sm">Bed Reserved!</p>
                <p className="text-[11px] text-muted-foreground mt-1">Complete payment within 10 minutes to confirm.</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold mb-1">₹1,000</p>
                <p className="text-[11px] text-muted-foreground">Reservation Fee (adjusted against first month rent)</p>
              </div>
              <DialogFooter>
                <Button onClick={handleConfirmPayment} disabled={confirmReservation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {confirmReservation.isPending ? 'Processing...' : 'Simulate Payment ₹1,000'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Visit Dialog */}
      <Dialog open={actionMode === 'schedule_visit'} onOpenChange={(o) => !o && setActionMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Schedule a Visit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Your Name</Label><Input placeholder="Full name" /></div>
            <div><Label>Phone</Label><Input placeholder="+91..." /></div>
            <div><Label>Preferred Date</Label><Input type="date" /></div>
            <div><Label>Preferred Time</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger>
                <SelectContent>
                  {['10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => { toast.success("Visit request submitted! We'll confirm shortly."); setActionMode(null); }}>
              Request Visit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Virtual Tour Dialog */}
      <Dialog open={actionMode === 'virtual_tour'} onOpenChange={(o) => !o && setActionMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Book a Virtual Tour</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">See the property from the comfort of your home. A Gharpayy agent will give you a live video walkthrough.</p>
            <div><Label>Your Name</Label><Input placeholder="Full name" /></div>
            <div><Label>Phone / WhatsApp</Label><Input placeholder="+91..." /></div>
            <div><Label>Preferred Slot</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today_now">Today - As soon as possible</SelectItem>
                  <SelectItem value="today_eve">Today - Evening (5-7 PM)</SelectItem>
                  <SelectItem value="tomorrow_morn">Tomorrow - Morning (10-12 PM)</SelectItem>
                  <SelectItem value="tomorrow_eve">Tomorrow - Evening (5-7 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => { toast.success('Virtual tour booked! Check WhatsApp for the link.'); setActionMode(null); }}>
              Book Virtual Tour
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
