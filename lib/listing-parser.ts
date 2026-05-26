export type ParsedListing = {
  rawSnapshot: string;
  extractedFieldsCount: number;
  warnings?: string[];
  price?: number;
  address?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  annualTaxes?: number;
  yearBuilt?: number;
  propertyType?: string;
  monthlyHoa?: number | null;
};

const EMPTY_WARNING =
  "We couldn't confidently extract listing details. You can still save the pasted text in your notes.";

export function cleanText(rawText: string) {
  return String(rawText ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#36;/g, "$")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

export function safeParseMoney(value: string | undefined) {
  if (!value) return undefined;
  if (/--|n\/a|unknown/i.test(value)) return undefined;

  const multiplier = /\bm\b|million/i.test(value) ? 1_000_000 : /\bk\b/i.test(value) ? 1_000 : 1;
  const cleaned = value.replace(/[$,\s]/g, "").replace(/million|m|k/gi, "");
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * multiplier);
}

export function safeParseNumber(value: string | undefined) {
  if (!value) return undefined;
  if (/--|n\/a|unknown/i.test(value)) return undefined;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isValidAddressLike(value: string | undefined) {
  if (!value) return false;
  const cleaned = value.trim();
  return /^\d{1,6}\s+.{4,},\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?$/i.test(cleaned);
}

type ExtractedListingKey = Exclude<
  keyof ParsedListing,
  "rawSnapshot" | "extractedFieldsCount" | "warnings"
>;

export function countExtractedFields(parsed: Partial<Record<ExtractedListingKey, unknown>>) {
  const keys: ExtractedListingKey[] = [
    "price",
    "address",
    "beds",
    "baths",
    "sqft",
    "annualTaxes",
    "yearBuilt",
    "propertyType",
    "monthlyHoa",
  ];

  return keys.filter((key) => {
    const value = parsed[key];
    return value !== undefined && value !== null && value !== "" && !Number.isNaN(value);
  }).length;
}

function emptyParsedListing(rawText: string): ParsedListing {
  return {
    rawSnapshot: rawText,
    extractedFieldsCount: 0,
    warnings: [EMPTY_WARNING],
  };
}

function normalizePropertyType(value: string | undefined) {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (/multi.?family/i.test(cleaned)) return "Multi Family";
  if (/duplex/i.test(cleaned)) return "Duplex";
  if (/single.?family/i.test(cleaned)) return "Single Family";
  if (/condo/i.test(cleaned)) return "Condo";
  if (/townhouse|townhome/i.test(cleaned)) return "Townhouse";
  return cleaned.length > 2 && cleaned.length < 80 ? cleaned : undefined;
}

function findAddress(text: string, oneLine: string) {
  const lineAddress = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => isValidAddressLike(line));
  if (lineAddress) return lineAddress;

  return firstMatch(oneLine, [
    /(?:^|\s)(\d{1,6}\s+[A-Za-z0-9 .#'-]+?,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)(?:\s|$)/i,
    /address\s*[:\-]?\s*(\d{1,6}\s+[A-Za-z0-9 .#'-]+?,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
  ]);
}

export function parseListingText(rawText: string): ParsedListing {
  try {
    const rawSnapshot = String(rawText ?? "");
    const text = cleanText(rawSnapshot);
    if (!text) return emptyParsedListing(rawSnapshot);

    const oneLine = text.replace(/\n/g, " ");
    const price = safeParseMoney(
      firstMatch(oneLine, [
        /(?:price|list price|asking price)\s*[:\-]?\s*(\$[\d,.]+(?:\s*(?:m|million|k))?)/i,
        /(\$[\d,.]+(?:\s*(?:m|million|k))?)\s*(?:\||-|for sale|home|house)?/i,
      ]),
    );

    const possibleAddress = findAddress(text, oneLine);

    const beds = safeParseNumber(
      firstMatch(oneLine, [
        /(\d+(?:\.\d+)?)\s*(?:bd|bed|beds|bedrooms)\b/i,
        /(?:beds|bedrooms)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      ]),
    );
    const baths = safeParseNumber(
      firstMatch(oneLine, [
        /(\d+(?:\.\d+)?)\s*(?:ba|bath|baths|bathrooms)\b/i,
        /(?:baths|bathrooms)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
      ]),
    );
    const sqft = safeParseNumber(
      firstMatch(oneLine, [
        /([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)\b/i,
        /(?:sq\.?\s*ft\.?|sqft|square feet)\s*[:\-]?\s*([\d,]+)/i,
      ]),
    );
    const annualTaxes = safeParseMoney(
      firstMatch(oneLine, [
        /(?:annual\s*)?(?:property\s*)?tax(?:es)?\s*[:\-]?\s*(\$[\d,.]+)/i,
        /(\$[\d,.]+)\s*(?:\/\s*yr|per year|annually)\s*(?:property\s*)?tax/i,
      ]),
    );
    const yearBuilt = safeParseNumber(
      firstMatch(oneLine, [
        /year built\s*[:\-]?\s*(\d{4})/i,
        /built in\s*(\d{4})/i,
      ]),
    );
    const propertyType = normalizePropertyType(
      firstMatch(oneLine, [
        /property type\s*[:\-]?\s*([A-Za-z /-]{3,80})/i,
        /\b(Multi Family|Multi-Family|Duplex|Single Family|Single-Family|Condo|Townhouse|Townhome)\b/i,
      ]),
    );
    const hoaMatch = firstMatch(oneLine, [
      /hoa\s*[:\-]?\s*(\$--|\$[\d,.]+|--|n\/a|none)/i,
      /(\$--|\$[\d,.]+|--|n\/a|none)\s*(?:\/\s*mo|monthly)?\s*hoa/i,
    ]);
    const monthlyHoa = /none/i.test(hoaMatch ?? "") ? 0 : safeParseMoney(hoaMatch);

    const parsed: ParsedListing = {
      rawSnapshot,
      extractedFieldsCount: 0,
      ...(price && price > 50_000 ? { price } : {}),
      ...(isValidAddressLike(possibleAddress) ? { address: possibleAddress } : {}),
      ...(beds && beds > 0 ? { beds } : {}),
      ...(baths && baths > 0 ? { baths } : {}),
      ...(sqft && sqft > 100 ? { sqft: Math.round(sqft) } : {}),
      ...(annualTaxes && annualTaxes > 0 ? { annualTaxes } : {}),
      ...(yearBuilt && yearBuilt >= 1700 && yearBuilt <= new Date().getFullYear() + 1
        ? { yearBuilt: Math.round(yearBuilt) }
        : {}),
      ...(propertyType ? { propertyType } : {}),
      ...(monthlyHoa !== undefined ? { monthlyHoa } : {}),
    };

    const extractedFieldsCount = countExtractedFields(parsed);
    if (extractedFieldsCount === 0) return emptyParsedListing(rawSnapshot);

    return {
      ...parsed,
      extractedFieldsCount,
    };
  } catch (error) {
    console.error("Listing parse failed", error);
    return emptyParsedListing(String(rawText ?? ""));
  }
}

export function parsedListingNotes(parsed: ParsedListing) {
  const lines = [
    parsed.beds ? `Beds: ${parsed.beds}` : "",
    parsed.baths ? `Baths: ${parsed.baths}` : "",
    parsed.sqft ? `Sqft: ${parsed.sqft}` : "",
    parsed.yearBuilt ? `Year built: ${parsed.yearBuilt}` : "",
    parsed.propertyType ? `Property type: ${parsed.propertyType}` : "",
  ].filter(Boolean);

  return lines.length ? `Listing details\n${lines.join("\n")}` : "";
}
