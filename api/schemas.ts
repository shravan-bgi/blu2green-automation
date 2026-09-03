import { z } from 'zod';

/**
 * The shapes the user-management service actually returns.
 *
 * Responses are parsed against these rather than spot-checked with
 * `toHaveProperty`, so a field that quietly changes type or disappears fails
 * here — where the message names the field — instead of surfacing later as an
 * arrange step that silently did nothing.
 */

/** One option in the Division (Sector) dropdown. */
export const sectorOptionSchema = z.object({
  secpk: z.number(),
  secname_en: z.string(),
});

/** What `getsectorlist` returns. */
export const sectorListSchema = z.object({
  data: z.array(sectorOptionSchema),
});

/** One division row, as `divisionlisting` returns it. */
// Only the columns the suite reads are declared. The response carries some forty
// more — audit stamps, NIBE bridge ids, workspace fields — and `catchall` keeps
// them from failing the parse, because this suite is not their consumer.
export const divisionRecordSchema = z
  .object({
    memcompsecdtls_pk: z.number(),
    /** The company the division belongs to — the tenant boundary. */
    mcsd_membercompmst_fk: z.number(),
    mcsd_businessunitrefname: z.string(),
    /** Stored as HTML — the rich-text editor wraps plain input in `<p>`. */
    mcsd_bunitdesc: z.string().nullable(),
    /** The system-generated identifier, `DIV-{companyPk}-{sequence}`. */
    mcsd_referenceno: z.string(),
    mcsd_sectormst_fk: z.number(),
    /** The attached image, null when none was chosen. */
    mcsd_memcompfiledtls_fk: z.number().nullable(),
  })
  .catchall(z.unknown());

/** What `divisionlisting` returns. */
// The total really is spelled `tolalcount` by the service.
export const divisionListingSchema = z.object({
  tolalcount: z.number(),
  data: z.array(divisionRecordSchema),
});

/**
 * What `adddivision` and `deactivatedivision` both answer with.
 *
 * `data` carries the affected division's primary key as plain base64 — not the
 * XOR obfuscation the request side uses. Everything returns HTTP 200, so
 * `status` is the only thing that says whether the call did anything.
 */
export const mutationResultSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  /**
   * The affected division's key, as plain base64 — not the XOR obfuscation the
   * request side uses.
   *
   * Optional because a refusal omits it entirely: posting a division with no
   * name answers `{ status, message }` and no `data` at all. Declaring it
   * required made the first refusal look like a broken contract.
   */
  data: z.string().optional(),
});

export type SectorOption = z.infer<typeof sectorOptionSchema>;
export type DivisionRecord = z.infer<typeof divisionRecordSchema>;
export type DivisionListing = z.infer<typeof divisionListingSchema>;
export type MutationResult = z.infer<typeof mutationResultSchema>;
