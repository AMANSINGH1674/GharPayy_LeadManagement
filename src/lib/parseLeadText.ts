export interface ParsedLead {
  name: string;
  phone: string;
  email: string;
  budget: string;
  preferred_location: string;
  move_in_date: string;
  notes: string;
  confidence: {
    name: number;
    phone: number;
    email: number;
    budget: number;
    location: number;
  };
}

// --- Regex patterns ---
// Simplified to prevent catastrophic backtracking and stack overflow

const PHONE_RE = /(?:\+?91[\s.-]?)?([6-9]\d{4}[\s.-]?\d{5})\b/;
const INTL_PHONE_RE = /\+\d{1,3}[\s.-]?\d{6,14}/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Basic matchers for keywords
const BUDGET_KW = /\b(?:budget|₹|rs\.?|inr|price|rent)\b/i;
const LOCATION_KW = /\b(?:in|at|near|area|location|locality|sector|phase|village|town|city)\b/i;

// KV Label matchers
const LABEL_NAME = /^(?:name|customer|client|lead)$/i;
const LABEL_PHONE = /^(?:phone|mobile|mob|contact|number|cell|whatsapp|wa)$/i;
const LABEL_EMAIL = /^(?:email|e-?mail|mail)$/i;
const LABEL_BUDGET = /^(?:budget(?:\s*range)?|price|rent|amount)$/i;
const LABEL_LOCATION = /^(?:preferred\s*)?(?:location|area|address|city|locality|place|landmark|sector|landmark|locationlandmark|location\s*landmark)$/i;
const LABEL_MOVEIN = /^(?:move-?in|move\s*in)(?:\s*date)?$/i;
const LABEL_SPECIAL = /^(?:special\s*requests?|notes?)$/i;

/**
 * Main safe entry point
 */
export function parseLeadTextSafe(raw: string): ParsedLead {
  try {
    return parseLeadText(raw);
  } catch (e) {
    console.error("Parser failed:", e);
    return empty();
  }
}

export function parseLeadText(raw: string): ParsedLead {
  if (!raw || !raw.trim()) return empty();

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Try line-by-line KV parsing first
  const kvResult = parseLinesAsKV(lines);
  
  // If we found at least name or phone via KV, return it
  if (kvResult.name || kvResult.phone) {
    return kvResult;
  }

  // Handle very compact, line-based formats like:
  // Name
  // 9876543210
  // email@example.com
  // 8
  // Wrk
  // Girl
  // 1
  const compactResult = parseCompactLines(lines);
  if (compactResult.name || compactResult.phone || compactResult.email || compactResult.budget || compactResult.notes) {
    return compactResult;
  }

  // Fallback to free-text parsing if KV failed
  return parseFreeText(raw);
}

/**
 * Parse line-by-line to avoid complex multiline regexes
 */
function parseLinesAsKV(lines: string[]): ParsedLead {
  const result = empty();

  for (const line of lines) {
    // Remove decorative leading symbols/emojis/bullets
    const cleanLine = line.replace(/^[^a-zA-Z0-9\s]+?\s*/, '').trim();
    
    // Split by common separators (colon or equals are standard for KV)
    const parts = cleanLine.split(/[:=]/);
    if (parts.length >= 2) {
      const label = parts[0].trim().replace(/[^a-zA-Z\s]/g, '').trim();
      const value = parts.slice(1).join(':').trim();
      
      if (!value) continue;

      if (LABEL_NAME.test(label)) {
        result.name = value;
        result.confidence.name = 0.95;
      } else if (LABEL_PHONE.test(label)) {
        const phoneMatch = value.match(PHONE_RE) || value.match(INTL_PHONE_RE);
        result.phone = phoneMatch ? phoneMatch[0].replace(/[\s.-]/g, '') : value.replace(/[\s.-]/g, '');
        result.confidence.phone = phoneMatch ? 1.0 : 0.7;
      } else if (LABEL_EMAIL.test(label)) {
        const emailMatch = value.match(EMAIL_RE);
        result.email = emailMatch ? emailMatch[0] : value;
        result.confidence.email = emailMatch ? 1.0 : 0.5;
      } else if (LABEL_BUDGET.test(label)) {
        result.budget = value;
        result.confidence.budget = 0.9;
      } else if (LABEL_LOCATION.test(label)) {
        result.preferred_location = value;
        result.confidence.location = 0.9;
      } else if (LABEL_MOVEIN.test(label)) {
        result.move_in_date = normalizeMoveIn(value);
      } else if (LABEL_SPECIAL.test(label)) {
        result.notes = value;
      }
    }
  }

  return result;
}

/**
 * Handle very compact, unlabeled line formats.
 * Example:
 *   Preena
 *   8489096954
 *   Prinajas218@gmail.com
 *   8
 *   Wrk
 *   Girl
 *   1
 */
function parseCompactLines(lines: string[]): ParsedLead {
  const result = empty();
  if (lines.length === 0) return result;

  // Heuristic: these compact messages usually have <= 10 short lines
  if (lines.length > 10) return result;

  // First pass: try to pick out obvious email and phone lines
  const emailIdx = lines.findIndex(l => EMAIL_RE.test(l));
  if (emailIdx >= 0) {
    const match = lines[emailIdx].match(EMAIL_RE);
    if (match) {
      result.email = match[0];
      result.confidence.email = 1.0;
    }
  }

  const phoneIdx = lines.findIndex(l => PHONE_RE.test(l) || INTL_PHONE_RE.test(l));
  if (phoneIdx >= 0) {
    const match = lines[phoneIdx].match(PHONE_RE) || lines[phoneIdx].match(INTL_PHONE_RE);
    if (match) {
      result.phone = match[0].replace(/[\s.-]/g, '');
      result.confidence.phone = 0.9;
    }
  }

  // Name: first non-empty line that is not clearly email/phone or numeric-only
  const nameIdx = lines.findIndex((l, idx) => {
    if (!l) return false;
    if (idx === emailIdx || idx === phoneIdx) return false;
    if (EMAIL_RE.test(l)) return false;
    if (PHONE_RE.test(l) || INTL_PHONE_RE.test(l)) return false;
    if (/^\d+(\.\d+)?k?$/i.test(l)) return false; // likely budget
    return true;
  });
  if (nameIdx >= 0) {
    result.name = lines[nameIdx];
    result.confidence.name = 0.9;
  }

  // Remaining lines: infer budget / occupation / need / members into budget/notes
  const noteBits: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === emailIdx || i === phoneIdx || i === nameIdx) continue;
    const raw = lines[i];
    const l = raw.toLowerCase();
    if (!raw) continue;

    // Budget: plain small number like "8" or "10" -> treat as "₹8k"
    const budgetMatch = raw.match(/^(\d{1,3})(k)?$/i);
    if (!result.budget && budgetMatch) {
      const num = parseInt(budgetMatch[1], 10);
      if (!isNaN(num) && num > 0 && num <= 500) {
        const display = `₹${num}k`;
        result.budget = display;
        result.confidence.budget = 0.8;
        continue;
      }
    }

    // Occupation
    if (/wrk|work|working|job|professional/.test(l)) {
      noteBits.push('Working professional');
      continue;
    }
    if (/stud|student/.test(l)) {
      noteBits.push('Student');
      continue;
    }

    // Need / gender preference
    if (/girls?|female/.test(l)) {
      noteBits.push('Looking for girls PG / accommodation');
      continue;
    }
    if (/boys?|male/.test(l)) {
      noteBits.push('Looking for boys PG / accommodation');
      continue;
    }
    if (/coed|mixed/.test(l)) {
      noteBits.push('Coed accommodation');
      continue;
    }

    // Member count like "1", "2", etc.
    const membersMatch = raw.match(/^(\d{1,2})$/);
    if (membersMatch) {
      const count = parseInt(membersMatch[1], 10);
      if (!isNaN(count) && count > 0 && count <= 20) {
        noteBits.push(`Members: ${count}`);
        continue;
      }
    }
  }

  if (noteBits.length > 0) {
    result.notes = noteBits.join(', ');
  }

  return result;
}

/**
 * Fallback free-text parser
 */
function parseFreeText(raw: string): ParsedLead {
  const result = empty();
  let text = raw.replace(/\s+/g, ' ').trim();

  // 1. Phone
  const phoneMatch = text.match(PHONE_RE) || text.match(INTL_PHONE_RE);
  if (phoneMatch) {
    result.phone = phoneMatch[0].replace(/[\s.-]/g, '');
    result.confidence.phone = 0.9;
    text = text.replace(phoneMatch[0], ' ');
  }

  // 2. Email
  const emailMatch = text.match(EMAIL_RE);
  if (emailMatch) {
    result.email = emailMatch[0];
    result.confidence.email = 1.0;
    text = text.replace(emailMatch[0], ' ');
  }

  // 3. Simple name heuristic - first 2-3 capitalized words
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const nameWords: string[] = [];
  for (const w of words) {
    if (/^[A-Z][a-z]+$/.test(w) && nameWords.length < 3) {
      nameWords.push(w);
    } else if (nameWords.length > 0) {
      break;
    }
  }
  if (nameWords.length >= 1) {
    result.name = nameWords.join(' ');
    result.confidence.name = 0.6;
  }

  return result;
}

function empty(): ParsedLead {
  return {
    name: '', phone: '', email: '', budget: '', preferred_location: '', move_in_date: '', notes: '',
    confidence: { name: 0, phone: 0, email: 0, budget: 0, location: 0 },
  };
}

function normalizeMoveIn(s: string): string {
  const months: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
    jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  const y = new Date().getFullYear();
  const t = s.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  
  // DD- Month
  const m1 = t.match(/^(\d{1,2})\s*[-/ ]\s*([A-Za-z]+)/i);
  if (m1) {
    const d = parseInt(m1[1], 10);
    const mon = months[m1[2].toLowerCase().slice(0, 3)] || 0;
    if (mon && d >= 1 && d <= 31) return `${y}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  
  // Month DD
  const m2 = t.match(/^([A-Za-z]+)\s+(\d{1,2})/i);
  if (m2) {
    const mon = months[m2[1].toLowerCase().slice(0, 3)] || 0;
    const d = parseInt(m2[2], 10);
    if (mon && d >= 1 && d <= 31) return `${y}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // YYYY-MM-DD or similar
  const dt = new Date(t);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().split('T')[0];
  }
  
  return '';
}
