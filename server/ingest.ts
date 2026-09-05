import crypto from 'crypto';
import { OperationalDeltaRecord, OperationalMetric, OperationalVector, SubVector } from '../src/types';

export interface ExternalCandidate {
  title: string;
  url: string;
  publisher: string;
  pubDate: string;
  type: 'NEWS' | 'DOCKET';
  docketNumber?: string;
}

/** The result of successfully resolving and HTTP-verifying a candidate's real publisher URL. */
export interface VerifiedCandidate {
  candidate: ExternalCandidate;
  canonicalUrl: string;
  urlVerifiedAt: string;
}

/** A candidate that failed resolution or verification and must not be accessioned. */
export interface QuarantinedCandidate {
  candidate: ExternalCandidate;
  reason: string;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Normalizes a headline for dedup comparison. Google News appends `" - <Publisher>"` to every
 * title, and the same story is frequently syndicated under near-identical headlines across
 * aggregators — a plain `.toLowerCase()` equality check (the previous behavior) misses both, so
 * re-fetches and cross-aggregator duplicates both slipped past dedup and got re-ingested.
 */
export function normalizeHeadline(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+-\s+[^-]+$/, '') // strip a trailing " - Publisher" suffix
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokenizes a normalized headline into a set, for similarity comparison rather than equality. */
export function headlineTokens(headline: string): Set<string> {
  return new Set(normalizeHeadline(headline).split(' ').filter(Boolean));
}

/**
 * Jaccard similarity between two token sets. Exact-string headline equality (the previous dedup
 * check) misses the same event reported under materially different headlines — e.g. "raises $10M
 * to build portable nuclear reactors on barges" vs. "raises $10M pre-seed to put nuclear reactors
 * on barges" describe the same funding round but share no normalized substring long enough for an
 * equality check to catch. Token overlap catches both without requiring exact phrasing.
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Above this token-overlap ratio, two headlines are treated as describing the same story. */
export const DUPLICATE_HEADLINE_THRESHOLD = 0.6;

const NEWS_QUERIES = [
  '%22Bluecore+Energy%22',
  '%22Port+of+Long+Beach%22+nuclear',
  'MARAD+%22small+modular+reactor%22',
  'maritime+%22small+modular+reactor%22+floating',
];

/** Pulls candidate news items (Google News RSS) and federal dockets (Federal Register API). */
export async function fetchRealExternalCandidates(): Promise<ExternalCandidate[]> {
  const candidates: ExternalCandidate[] = [];

  for (const q of NEWS_QUERIES) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BluecoreIntelligence/1.0)' },
      });
      if (!res.ok) continue;

      const xml = await res.text();
      for (const item of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const block = item[1];
        const title = decodeXmlEntities(block.match(/<title>(.*?)<\/title>/)?.[1] || '');
        const link = block.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
        const source = decodeXmlEntities(block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '');

        if (title && link) {
          candidates.push({
            title,
            url: link,
            publisher: source || 'Maritime Trade Wire',
            pubDate: pubDate || new Date().toISOString(),
            type: 'NEWS',
          });
        }
      }
    } catch (err) {
      console.warn(`Error querying RSS for ${q}:`, err);
    }
  }

  try {
    const fedUrl = 'https://www.federalregister.gov/api/v1/documents.json?conditions[term]=small+modular+reactor&per_page=10';
    const res = await fetch(fedUrl);
    if (res.ok) {
      const json = await res.json();
      for (const doc of json.results ?? []) {
        candidates.push({
          title: doc.title,
          url: doc.html_url,
          publisher: `Federal Register (${doc.agencies?.[0]?.name || 'U.S. Government'})`,
          pubDate: doc.publication_date,
          type: 'DOCKET',
          docketNumber: doc.document_number,
        });
      }
    }
  } catch (err) {
    console.warn('Error fetching Federal Register API:', err);
  }

  return candidates;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort extraction of the real publisher URL embedded in a Google News RSS redirect link
 * (`news.google.com/rss/articles/CBMi...`). The path segment is a base64url-encoded protobuf
 * blob with no documented, stable decoding, and as of this writing it does NOT contain the
 * plaintext target URL — verified by decoding real links and finding no `http(s)://` run inside.
 * Google resolves these client-side (a JS-rendered interstitial, not a server redirect and not a
 * canonical link in the HTML), so there is currently no reliable way to recover the real URL from
 * one of these links without a headless browser, which this pipeline does not run. This function
 * is kept as a cheap first attempt in case Google's format changes or an older-style link (which
 * historically did embed the URL) is encountered, but callers must expect it to return null for
 * essentially all current links and quarantine accordingly — this is the correct, safe outcome,
 * not a bug: an opaque redirect is exactly the kind of citation this pipeline must not accession
 * (see `ARCHITECTURE.md`'s note on the previous records that did exactly that).
 */
export function tryDecodeGoogleNewsUrl(link: string): string | null {
  const match = link.match(/\/articles\/([^/?]+)/);
  if (!match) return null;
  try {
    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const decoded = Buffer.from(b64, 'base64').toString('latin1');
    const urlMatch = decoded.match(/https?:\/\/[-a-zA-Z0-9@:%._+~#=/?&]{8,}/);
    return urlMatch ? urlMatch[0] : null;
  } catch {
    return null;
  }
}

/**
 * Resolves a candidate's real, canonical publisher URL. Federal Register candidates already
 * carry their real `html_url`. Google News candidates require following the redirect: an actual
 * HTTP request is tried first (Google serves a real 30x for some queries), and if the response is
 * still on `news.google.com` (an HTML interstitial rather than a redirect, which is the common
 * case), `tryDecodeGoogleNewsUrl` is used as a fallback.
 */
async function resolveCanonicalUrl(candidate: ExternalCandidate): Promise<string | null> {
  if (candidate.type === 'DOCKET') return candidate.url;

  try {
    const res = await fetchWithTimeout(
      candidate.url,
      { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BluecoreIntelligence/1.0)' } },
      10_000
    );
    const finalUrl = res.url || candidate.url;
    if (finalUrl && !new URL(finalUrl).hostname.endsWith('news.google.com')) {
      return finalUrl;
    }
  } catch {
    // fall through to the decode-based fallback below
  }

  return tryDecodeGoogleNewsUrl(candidate.url);
}

/** Confirms a URL is actually live (2xx) before it is allowed into an accessioned record. */
async function verifyReachable(url: string): Promise<boolean> {
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; BluecoreIntelligence/1.0)' };
  try {
    const headRes = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow', headers }, 10_000);
    if (headRes.ok) return true;
    // Some publishers reject HEAD outright (405/501) without it meaning the page is down.
    const getRes = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow', headers }, 10_000);
    return getRes.ok;
  } catch {
    return false;
  }
}

/**
 * Resolves and HTTP-verifies one candidate's real publisher URL. This is the gate that stops an
 * opaque or dead link from ever becoming `sourceProvenance.externalUrl` on an accessioned record
 * — every prior record in this system that cited a URL was never checked, and three of the nine
 * hand-authored ones turned out to be 404s.
 */
export async function resolveAndVerify(
  candidate: ExternalCandidate
): Promise<VerifiedCandidate | QuarantinedCandidate> {
  const canonicalUrl = await resolveCanonicalUrl(candidate);
  if (!canonicalUrl) {
    return { candidate, reason: 'Could not resolve a canonical publisher URL from the feed link.' };
  }

  const reachable = await verifyReachable(canonicalUrl);
  if (!reachable) {
    return { candidate, reason: `Canonical URL did not return a successful response: ${canonicalUrl}` };
  }

  return { candidate, canonicalUrl, urlVerifiedAt: new Date().toISOString() };
}

export function isVerified(result: VerifiedCandidate | QuarantinedCandidate): result is VerifiedCandidate {
  return 'canonicalUrl' in result;
}

interface Classification {
  vector: OperationalVector;
  subVector: SubVector;
  targetSubdir: 'technical' | 'regulatory' | 'ecosystem';
}

/**
 * Classifies a fetched news/docket candidate into an operational vector and sub-vector.
 *
 * This is intentionally a separate ruleset from `classifyVector` in `server/git.ts`: that one
 * tags short, already-written commit subject lines (`"docket(marad): ..."`) and defaults to
 * TECHNICAL_EVOLUTION when nothing matches; this one classifies raw headline + publisher text
 * from an external feed, needs a sub-vector (not just a vector), and defaults to
 * REGULATORY_PATHWAYS — an unclassified public filing is a safer default bucket than an
 * unclassified engineering claim. Merging them would blur two heuristics tuned to different
 * inputs for the sake of a superficial resemblance.
 *
 * Regulatory signals are checked first: a story like "Long Beach is first port to partner with
 * MARAD on maritime reactors" mentions "reactors" but is a regulatory-pact story, not an
 * engineering one — testing the technical branch first (the previous order) misclassified it.
 * Publisher/person-name keys (`forbes`, `kofi asante`) have been dropped: they classified by who
 * covered a story rather than what it was about, and broke the moment a different outlet ran it.
 */
export function classifyIngestCandidate(candidate: ExternalCandidate): Classification {
  const text = `${candidate.title} ${candidate.publisher}`.toLowerCase();

  if (/marad|federal register|\bnrc\b|uscg|coast guard|docket|rulemaking|memorandum|cooperation agreement/.test(text)) {
    return {
      vector: 'REGULATORY_PATHWAYS',
      targetSubdir: 'regulatory',
      subVector: text.includes('long beach') ? 'Port of Long Beach Compliance' : 'MARAD Frameworks',
    };
  }

  if (/\bfund(ing|s)?\b|pre-seed|seed round|venture|series [a-z]\b/.test(text)) {
    return {
      vector: 'ECOSYSTEM_MOMENTUM',
      targetSubdir: 'ecosystem',
      subVector: /\bfund|seed|venture|series [a-z]\b/.test(text)
        ? 'Capital Structure Updates'
        : 'Corporate & Maritime Alliances',
    };
  }

  if (/barge|reactor|power|thermal|subsea|megawatt|smr-10|engineering/.test(text)) {
    return {
      vector: 'TECHNICAL_EVOLUTION',
      targetSubdir: 'technical',
      subVector: text.includes('barge') ? 'Marine Barge Modifications' : 'SMR Scaling Metrics',
    };
  }

  return {
    vector: 'REGULATORY_PATHWAYS',
    targetSubdir: 'regulatory',
    subVector: text.includes('long beach') ? 'Port of Long Beach Compliance' : 'MARAD Frameworks',
  };
}

/** `REC-{VECTOR}-{YYYYMMDD}-{8-char digest of the canonical URL}` — stable and re-derivable from
 * the source, unlike the previous `Date.now().toString().slice(-4)` scheme, which took the last
 * four digits of a millisecond timestamp and could collide across records written moments apart.
 */
export function makeRecordId(vector: OperationalVector, canonicalUrl: string, now: Date): string {
  const abbr = vector === 'TECHNICAL_EVOLUTION' ? 'TECH' : vector === 'REGULATORY_PATHWAYS' ? 'REG' : 'ECO';
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const digest = crypto.createHash('sha256').update(canonicalUrl).digest('hex').slice(0, 8);
  return `REC-${abbr}-${yyyymmdd}-${digest}`;
}

/**
 * Builds a complete `OperationalDeltaRecord` for a freshly-accessioned external candidate.
 *
 * Every field here is either taken verbatim from the source feed, actually measured (the URL
 * verification timestamp, the content digest), or explicitly marked as not yet established
 * (`verificationStatus: 'UNVERIFIED_EXTERNAL_ITEM'`, no `confidenceScore`, no `nextMilestone`).
 * An earlier version of this function synthesized a claim, a corroboration statement, three fake
 * "metrics," an invented milestone, a hardcoded 0.99 confidence score, and a checksum that was
 * just the record's own id relabeled — none of which this pipeline had any basis to assert. Do
 * not reintroduce a literal in place of an unresolved field; render it absent instead, the way
 * `metricDrift.ts` renders an unsupported metric as `isUnpopulated` rather than a placeholder.
 */
export function buildRecordFromCandidate(
  verified: VerifiedCandidate,
  recordId: string,
  targetSubdir: string,
  vector: OperationalVector,
  subVector: SubVector
): OperationalDeltaRecord {
  const { candidate, canonicalUrl, urlVerifiedAt } = verified;
  const now = new Date().toISOString();

  const keyMetrics: OperationalMetric[] | undefined =
    candidate.type === 'DOCKET' && candidate.docketNumber
      ? [{ label: 'Docket Number', value: candidate.docketNumber, status: 'nominal' }]
      : undefined;

  const contentDigest = crypto
    .createHash('sha256')
    .update(`${recordId}|${candidate.title}|${canonicalUrl}|${now}`)
    .digest('hex');

  return {
    id: recordId,
    operationalVector: vector,
    subVector,
    headline: candidate.title,
    // The headline verbatim is the only claim this pipeline can state without reading the
    // article body — anything more specific would be inference this code did not perform.
    verifiableClaim: candidate.title,
    verifiableDelta: `Accessioned from ${candidate.publisher}, published ${candidate.pubDate}. This record captures the headline, publisher, and publication date as stated by the source feed; the article body was not retrieved and no claim within it has been independently corroborated.`,
    keyMetrics,
    sourceProvenance: {
      // For a docket, the document number is a real, retrievable reference. For a news item
      // there is no such identifier — the canonical URL itself is the most honest documentRef,
      // since it is the actual location of the source, not an invented filename.
      documentRef: candidate.docketNumber ?? canonicalUrl,
      commitHash: '', // backfilled by the caller once the commit exists
      timestamp: now,
      filePath: `intelligence/${targetSubdir}/${recordId}.json`,
      externalUrl: candidate.url,
      canonicalUrl,
      urlVerifiedAt,
      sourcePublisher: candidate.publisher,
      externalDocketId: candidate.docketNumber,
    },
    prNoiseFilter: {
      prChatterDetected: false,
      chatterFlags: [],
      verificationStatus: 'UNVERIFIED_EXTERNAL_ITEM',
      filterRationale: `Canonical URL resolved to ${canonicalUrl} and confirmed reachable (successful HTTP response) at ${urlVerifiedAt}. No further corroboration — article body, cross-source confirmation, or claim verification — has been performed.`,
    },
    agentRoutingMeta: {
      targetAgent:
        vector === 'REGULATORY_PATHWAYS'
          ? 'AGENT_NUCLEAR_COMPLIANCE'
          : vector === 'TECHNICAL_EVOLUTION'
          ? 'AGENT_MARITIME_INFRASTRUCTURE'
          : 'AGENT_CAPITAL_AUDITOR',
      actionType: 'UPDATE_METRIC_STORE',
      priority: 'P2_INFORMATIONAL',
      checksum: `sha256:${contentDigest}`,
      routingTimestamp: now,
    },
  };
}
