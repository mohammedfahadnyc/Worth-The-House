import assert from "node:assert/strict";
import { parseListingText } from "./listing-parser.ts";

const zillowSample = `
  $1,015,000
  545 Hollywood Avenue, Bronx, NY 10465
  5 beds 2 baths 2,717 sqft
  Multi Family Duplex
  Year built: 1971
  Annual property taxes: $8,380
`;

const parsed = parseListingText(zillowSample);

assert.equal(parsed.price, 1015000);
assert.equal(parsed.address, "545 Hollywood Avenue, Bronx, NY 10465");
assert.equal(parsed.beds, 5);
assert.equal(parsed.baths, 2);
assert.equal(parsed.sqft, 2717);
assert.equal(parsed.annualTaxes, 8380);
assert.equal(parsed.yearBuilt, 1971);
assert.match(parsed.propertyType ?? "", /Multi Family|Duplex/);
assert.ok(parsed.extractedFieldsCount > 0);

const invalid = parseListingText("hello random text");

assert.equal(invalid.extractedFieldsCount, 0);
assert.equal(invalid.rawSnapshot, "hello random text");
assert.ok(invalid.warnings?.length);

console.log("listing parser samples passed");
