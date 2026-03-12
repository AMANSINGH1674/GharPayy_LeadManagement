import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Shield, ArrowRight, Bed, Users, ChevronRight, Menu, X, Instagram, Facebook } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { KORAMANGALA_FEATURED_PROPERTIES } from '@/data/featuredProperties';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const featured = useMemo(() => {
    const coed = KORAMANGALA_FEATURED_PROPERTIES.filter(p => p.gender_allowed === 'any').slice(0, 2);
    const boys = KORAMANGALA_FEATURED_PROPERTIES.filter(p => p.gender_allowed === 'male').slice(0, 2);
    const girls = KORAMANGALA_FEATURED_PROPERTIES.filter(p => p.gender_allowed === 'female').slice(0, 2);
    
    return [
      coed[0], boys[0], girls[0],
      coed[1], boys[1], girls[1]
    ].filter(Boolean);
  }, []);

  const getRentRange = (property: any) => {
    if (!property.rooms?.length) return property.price_range || '—';
    const rents = property.rooms.map((r: any) => r.rent_per_bed || r.expected_rent).filter(Boolean);
    if (!rents.length) return property.price_range || '—';
    const min = Math.min(...rents);
    return `₹${min.toLocaleString()}`;
  };

  const handleSearch = () => {
    navigate(`/explore${searchQuery ? `?area=${searchQuery}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-background font-body selection:bg-accent/20 text-foreground">
      
      {/* ─── NAVIGATION ──────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-background/90 backdrop-blur-md py-4 border-b border-border/40' : 'bg-transparent py-8'}`}>
        <div className="max-w-[1600px] mx-auto px-6 sm:px-10 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
            <div className={`w-8 h-8 rounded-sm bg-primary flex items-center justify-center transition-transform duration-500 group-hover:rotate-90`}>
              <span className="text-primary-foreground font-serif font-bold text-base italic">G</span>
            </div>
            <span className={`font-serif text-2xl tracking-tight transition-colors duration-500 ${!isScrolled ? 'text-white' : 'text-foreground'}`}>Gharpayy</span>
          </div>

          <nav className="hidden lg:flex items-center gap-12 text-[13px] font-medium uppercase tracking-[0.2em]">
            {['Explore', 'Owners', 'Boutique Experience', 'Contact'].map((item) => (
              <button 
                key={item} 
                onClick={() => item === 'Explore' ? navigate('/explore') : navigate('/owner-portal')}
                className={`transition-colors duration-500 hover:text-accent ${!isScrolled ? 'text-white/80' : 'text-foreground/70'}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <button className={`hidden sm:block text-[13px] font-medium uppercase tracking-[0.2em] transition-colors duration-500 hover:text-accent ${!isScrolled ? 'text-white/80' : 'text-foreground/70'}`} onClick={() => navigate('/auth')}>
              Login
            </button>
            <button 
              className={`p-2 transition-colors duration-500 ${!isScrolled ? 'text-white' : 'text-foreground'}`}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── MOBILE MENU ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-primary text-primary-foreground flex flex-col p-10"
          >
            <div className="flex justify-end mb-20">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:rotate-90 transition-transform duration-300">
                <X size={32} strokeWidth={1} />
              </button>
            </div>
            <div className="flex flex-col gap-8">
              {['Explore Properties', 'For Owners', 'Our Story', 'Boutique Experience', 'Contact Us'].map((item, i) => (
                <motion.button 
                  key={item}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="text-4xl sm:text-6xl font-serif italic text-left hover:translate-x-4 transition-transform duration-300"
                  onClick={() => { setMobileMenuOpen(false); navigate('/explore'); }}
                >
                  {item}
                </motion.button>
              ))}
            </div>
            <div className="mt-auto flex justify-between items-end border-t border-white/10 pt-10">
              <div className="flex gap-6">
                <Instagram size={20} />
                <Facebook size={20} />
              </div>
              <p className="text-xs uppercase tracking-widest opacity-50">Gharpayy © 2026</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Full-screen high-quality lifestyle image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover" 
            alt="Premium Interior" 
          />
          <div className="absolute inset-0 bg-black/30" /> {/* Subtle overlay */}
        </div>

        <div className="relative z-10 text-center text-white px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-[13px] font-medium uppercase tracking-[0.4em] mb-6 block">Echt, ursprünglich — Authentic, Original</span>
            <h1 className="text-6xl sm:text-8xl lg:text-[110px] font-serif italic tracking-tight leading-none mb-10">
              Honest<br />Hospitality.
            </h1>
            <div className="max-w-xl mx-auto flex flex-col items-center">
              <div className="w-px h-20 bg-white/30 mb-10" />
              <button 
                onClick={() => navigate('/explore')}
                className="group relative px-10 py-5 overflow-hidden"
              >
                <div className="absolute inset-0 border border-white/40 transition-transform duration-500 group-hover:scale-105" />
                <span className="text-[13px] font-bold uppercase tracking-[0.3em] relative z-10">Explore Our Stays</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-white/50">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <div className="w-px h-10 bg-white/20 relative overflow-hidden">
            <motion.div 
              animate={{ y: [0, 40] }} 
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} 
              className="absolute top-0 left-0 w-full h-1/2 bg-white" 
            />
          </div>
        </div>
      </section>

      {/* ─── INTRODUCTION SECTION ─────────────────────────────────────────────── */}
      <section className="py-32 lg:py-48 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-accent mb-10">The Gharpayy Philosophy</h2>
            <p className="font-serif text-3xl sm:text-5xl leading-[1.4] text-foreground mb-12">
              “We believe co-living should be as <span className="italic">personal</span> as it is <span className="italic">professional</span>. No brokers, no hidden fees—just authentic spaces designed for life.”
            </p>
            <div className="w-20 h-px bg-border mx-auto mb-12" />
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Since our inception, we've focused on quality over quantity. Every property in our portfolio is physically inspected, verified, and curated to meet the highest standards of boutique urban living.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURED GRID SECTION ───────────────────────────────────────────── */}
      <section className="py-20 lg:py-32 px-6 sm:px-10 max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row items-end justify-between gap-8 mb-20">
          <div className="max-w-2xl">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.3em] text-accent mb-6">Our Collection</h2>
            <h3 className="text-4xl sm:text-6xl font-serif italic tracking-tight leading-tight">Hand-picked<br />Boutique Retreats</h3>
          </div>
          <button 
            onClick={() => navigate('/explore')}
            className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.2em] group border-b border-foreground/10 pb-2"
          >
            View Entire Portfolio <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-300" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-24">
          {featured?.slice(0, 6).map((property: any, i: number) => {
            const startingRent = getRentRange(property);
            return (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                className="group cursor-pointer"
                onClick={() => navigate(`/property/${property.id}`)}
              >
                <div className="relative aspect-[4/5] overflow-hidden mb-8">
                  {property.photos?.length > 0 ? (
                    <img src={property.photos[0]} alt={property.name} className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <Bed size={48} className="text-muted-foreground/20" />
                    </div>
                  )}
                  
                  {/* Overlay Tags */}
                  <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <Badge className="bg-white/90 text-primary border-none rounded-none text-[10px] font-bold tracking-[0.1em] px-3 py-1 uppercase">{property.gender_allowed === 'any' ? 'Co-Ed' : property.gender_allowed}</Badge>
                    {property.is_verified && <Badge className="bg-primary text-primary-foreground border-none rounded-none text-[10px] font-bold tracking-[0.1em] px-3 py-1 uppercase">Verified</Badge>}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-2xl font-serif italic tracking-tight">{property.name}</h4>
                    <p className="text-lg font-medium tracking-tighter">{startingRent}<span className="text-[10px] text-muted-foreground ml-1 font-normal uppercase tracking-widest">/mo</span></p>
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{property.area} · Bangalore</p>
                  <div className="pt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    Discover Spaces <ChevronRight size={12} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── ALTERNATING STORY SECTIONS ──────────────────────────────────────── */}
      <section className="bg-primary text-primary-foreground overflow-hidden">
        {/* Section 1 */}
        <div className="flex flex-col lg:flex-row min-h-[80vh]">
          <div className="lg:w-1/2 p-10 sm:p-20 lg:p-32 flex flex-col justify-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] mb-8 block opacity-60">The Culinary Experience</span>
              <h3 className="text-4xl sm:text-6xl font-serif italic mb-10 leading-tight">Real Food.<br />Authentic Flavors.</h3>
              <p className="text-lg text-primary-foreground/70 leading-relaxed mb-12 font-light">
                We believe that honest hospitality starts with the kitchen. Our PGs feature home-cooked meals prepared with fresh, locally sourced ingredients. Experience the taste of home in the heart of the city.
              </p>
              <button className="text-[11px] font-bold uppercase tracking-[0.3em] border-b border-white/20 pb-2 hover:border-white transition-colors duration-300">Our Menu Standards</button>
            </motion.div>
          </div>
          <div className="lg:w-1/2 relative h-[50vh] lg:h-auto">
            <img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover" alt="Kitchen" />
          </div>
        </div>

        {/* Section 2 */}
        <div className="flex flex-col lg:flex-row-reverse min-h-[80vh]">
          <div className="lg:w-1/2 p-10 sm:p-20 lg:p-32 flex flex-col justify-center bg-accent text-white">
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] mb-8 block opacity-60">Architectural Comfort</span>
              <h3 className="text-4xl sm:text-6xl font-serif italic mb-10 leading-tight">Space to Breathe,<br />Room to Grow.</h3>
              <p className="text-lg text-white/80 leading-relaxed mb-12 font-light">
                Our rooms are designed with a minimalist aesthetic, focusing on natural light, high-quality textures, and functional elegance. Every detail is considered to create a peaceful urban sanctuary.
              </p>
              <button className="text-[11px] font-bold uppercase tracking-[0.3em] border-b border-white/20 pb-2 hover:border-white transition-colors duration-300">View Interior Details</button>
            </motion.div>
          </div>
          <div className="lg:w-1/2 relative h-[50vh] lg:h-auto">
            <img src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover" alt="Minimalist Room" />
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─────────────────────────────────────────────────────── */}
      <section className="py-32 lg:py-48 px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <span className="text-[13px] font-bold uppercase tracking-[0.4em] mb-10 block text-accent">Your Urban Sanctuary Awaits</span>
          <h2 className="text-5xl sm:text-7xl font-serif italic mb-16 tracking-tight">Ready to find<br />your next home?</h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button 
              onClick={() => navigate('/explore')}
              className="bg-primary text-primary-foreground px-12 py-6 text-[13px] font-bold uppercase tracking-[0.3em] hover:bg-accent transition-colors duration-500 shadow-xl"
            >
              Start Exploring
            </button>
            <button 
              onClick={() => navigate('/owner-portal')}
              className="px-12 py-6 text-[13px] font-bold uppercase tracking-[0.3em] border border-border hover:bg-secondary transition-colors duration-500"
            >
              List Your Space
            </button>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-primary text-primary-foreground/40 py-20 px-6 sm:px-10 border-t border-white/5">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-24">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-6 h-6 rounded-sm bg-white/10 flex items-center justify-center">
                <span className="text-white font-serif font-bold text-xs italic">G</span>
              </div>
              <span className="font-serif text-xl tracking-tight text-white/90">Gharpayy</span>
            </div>
            <p className="text-sm leading-relaxed mb-8">
              Redefining urban co-living through boutique hospitality and honest, verified spaces.
            </p>
            <div className="flex gap-6 text-white/60">
              <Instagram size={18} />
              <Facebook size={18} />
            </div>
          </div>
          
          <div>
            <h5 className="text-white text-[11px] font-bold uppercase tracking-[0.2em] mb-8">Navigation</h5>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => navigate('/explore')} className="hover:text-white transition-colors">Explore Portfolio</button></li>
              <li><button onClick={() => navigate('/owner-portal')} className="hover:text-white transition-colors">Property Owners</button></li>
              <li><button className="hover:text-white transition-colors">Boutique Experience</button></li>
              <li><button className="hover:text-white transition-colors">The Gharpayy Story</button></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white text-[11px] font-bold uppercase tracking-[0.2em] mb-8">Locations</h5>
            <ul className="space-y-4 text-sm font-medium uppercase tracking-widest text-[10px]">
              <li>Koramangala</li>
              <li>HSR Layout</li>
              <li>Indiranagar</li>
              <li>Whitefield</li>
            </ul>
          </div>

          <div>
            <h5 className="text-white text-[11px] font-bold uppercase tracking-[0.2em] mb-8">Inquiries</h5>
            <p className="text-sm mb-4">hello@gharpayy.net</p>
            <p className="text-sm">+91 98765 43210</p>
            <p className="text-sm mt-8">Bangalore, India</p>
          </div>
        </div>
        
        <div className="max-w-[1600px] mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em]">
          <p>© 2026 Gharpayy Boutique Stays</p>
          <div className="flex gap-8">
            <button className="hover:text-white">Privacy</button>
            <button className="hover:text-white">Terms</button>
            <button className="hover:text-white">Legal</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
