import * as allure from 'allure-js-commons';
import { tokenClaims } from '@api/auth';
import { divisionListingSchema, sectorListSchema } from '@api/schemas';
import { divisionCases } from '@config/division-cases';
import { userOperationsHubApi as service } from '@config/endpoints';
import { expect, test } from '@fixtures/test-fixtures';
import { buildDivision } from '@factories/division.factory';

const listingUrl = `${service.base}/${service.divisionListing}`;

/** The listing request the application itself sends, for the raw contexts to reuse. */
const listingRequest = {
  Limit: 10,
  Page: 0,
  search_Filter: '',
  search_Division: '',
  search_overall: '',
  sort: null,
};

test.describe('Verify the division service refuses a caller who has proved nothing', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions API');
    await allure.story('Authentication boundary');
  });

  // Two cases this environment cannot give us, recorded rather than faked:
  //
  // An **expired token** — the real one lives 1440 minutes and we cannot sign a
  // replacement, so there is no way to present one that is well-formed, properly
  // signed and past its expiry. The forged-signature case below exercises the
  // same rejection path.
  //
  // A **403 permission boundary** — there is one account with one role. Telling
  // "allowed" from "forbidden" needs a second, lower-privileged account that
  // does not exist here.

  test(
    divisionCases.TC_DIVAPI_001.title,
    { tag: divisionCases.TC_DIVAPI_001.tag },
    async ({ anonymousApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_001.severity);

      const response = await anonymousApi.post(listingUrl, { data: listingRequest });

      // Asserted as "not 200 and not a division in sight", rather than pinning
      // 401 exactly: what matters is that company data does not come back to a
      // caller who proved nothing. The status is reported either way so a
      // failure says what the service actually did.
      expect(
        response.status(),
        `an unauthenticated listing request answered ${response.status()}`,
      ).not.toBe(200);

      expect(await response.text()).not.toContain('memcompsecdtls_pk');
    },
  );

  test(
    divisionCases.TC_DIVAPI_002.title,
    { tag: divisionCases.TC_DIVAPI_002.tag },
    async ({ tamperedApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_002.severity);

      // The header and payload are the real ones; only the signature is wrong.
      // A wholly malformed token would prove less — it could be turned away by a
      // parser before authentication was ever attempted.
      const response = await tamperedApi.post(listingUrl, { data: listingRequest });

      expect(
        response.status(),
        `a token with a forged signature answered ${response.status()}`,
      ).not.toBe(200);

      expect(await response.text()).not.toContain('memcompsecdtls_pk');
    },
  );
});

test.describe('Verify the division service answers in the shape its consumers rely on', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions API');
    await allure.story('Response contract');
  });

  test(
    divisionCases.TC_DIVAPI_009.title,
    { tag: divisionCases.TC_DIVAPI_009.tag },
    async ({ authenticatedApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_009.severity);

      const response = await authenticatedApi.post(listingUrl, { data: listingRequest });

      expect(response.status()).toBe(200);

      // Asserted directly, never behind a condition: the content type is part of
      // the contract, and a check that only runs sometimes proves nothing.
      expect(response.headers()['content-type']).toContain('application/json');

      // Parsed against the schema rather than spot-checked field by field. A
      // response that drops a field or changes its type fails here, naming the
      // field, instead of surfacing later as an arrange step that did nothing.
      const parsed = divisionListingSchema.safeParse(await response.json());

      expect(
        parsed.success ? [] : parsed.error.issues,
        'the division listing no longer matches its published shape',
      ).toEqual([]);
    },
  );

  test(
    divisionCases.TC_DIVAPI_010.title,
    { tag: divisionCases.TC_DIVAPI_010.tag },
    async ({ authenticatedApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_010.severity);

      const response = await authenticatedApi.get(`${service.base}/${service.sectorList}`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const parsed = sectorListSchema.safeParse(await response.json());

      expect(
        parsed.success ? [] : parsed.error.issues,
        'the sector list no longer matches its published shape',
      ).toEqual([]);

      // The division form cannot be filled without these, and the suite resolves
      // a sector by display name on every seeded division.
      expect(parsed.success && parsed.data.data.length).toBeGreaterThan(0);
    },
  );
});

test.describe('Verify the division service enforces what the screen cannot', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions API');
    await allure.story('Service rules');
  });

  test(
    divisionCases.TC_DIVAPI_003.title,
    { tag: divisionCases.TC_DIVAPI_003.tag },
    async ({ userOperationsHubApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_003.severity);

      const { companyPk } = tokenClaims();
      await allure.parameter('Company', String(companyPk));

      const listing = await userOperationsHubApi.divisionListing('', 500);

      expect(listing.data.length).toBeGreaterThan(0);

      // The service takes no company argument — it reads one from the token — so
      // this is the only assertion that says it honours it.
      const foreign = listing.data.filter(
        (division) => division.mcsd_membercompmst_fk !== companyPk,
      );

      expect(
        foreign.map((division) => division.mcsd_referenceno),
        'the listing returned divisions belonging to another company',
      ).toEqual([]);
    },
  );

  test(
    divisionCases.TC_DIVAPI_004.title,
    { tag: divisionCases.TC_DIVAPI_004.tag },
    async ({ userOperationsHubApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_004.severity);

      const divisions = [buildDivision(), buildDivision(), buildDivision(), buildDivision()];
      const created: number[] = [];

      try {
        await test.step('When four divisions are created at the same moment', async () => {
          const keys = await Promise.all(
            divisions.map((division) => userOperationsHubApi.createDivision(division)),
          );

          created.push(...keys);
          expect(new Set(keys).size, 'two creations returned the same key').toBe(keys.length);
        });

        await test.step('Then every one has a distinct Division ID', async () => {
          const records = await Promise.all(
            divisions.map((division) => userOperationsHubApi.findDivision(division.name)),
          );

          const ids = records.map((record) => record?.mcsd_referenceno);
          await allure.parameter('Division IDs', ids.join(', '));

          expect(ids.every(Boolean), 'a division created here could not be read back').toBe(true);

          // The reason this test exists: a collision was found in the wild,
          // `DIV-10111-113` sitting on two different divisions, which is what a
          // race in ID generation looks like from the outside.
          expect(new Set(ids).size, `two divisions share a Division ID: ${ids.join(', ')}`).toBe(
            ids.length,
          );
        });
      } finally {
        // Removed by key in a finally, because a failure here still leaves four
        // real divisions behind on an environment nothing prunes.
        await Promise.all(created.map((pk) => userOperationsHubApi.deleteDivision(pk)));
      }
    },
  );

  test(
    divisionCases.TC_DIVAPI_005.title,
    { tag: divisionCases.TC_DIVAPI_005.tag },
    async ({ userOperationsHubApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_005.severity);

      const sectorPk = await userOperationsHubApi.sectorPk(buildDivision().sector);

      // Posted raw, because the typed client cannot express a division with no
      // name — the form cannot either, which is exactly why the server's own
      // answer has never been observed.
      const result = await userOperationsHubApi.postDivision({
        division_name: '',
        division_sector: sectorPk,
        description: '<p>Server-side validation probe.</p>',
        image: '',
        secpk: null,
      });

      await allure.parameter('Service answered', JSON.stringify(result));

      expect(
        result.status,
        'the service accepted a division with no name — the mandatory-field guard is client-side only',
      ).toBe(false);

      // If it was accepted anyway, the division has to come back out: this
      // environment is shared and nothing prunes it.
      if (result.status && result.data) {
        await userOperationsHubApi.deleteDivision(
          Number(Buffer.from(result.data, 'base64').toString('utf8')),
        );
      }
    },
  );

  test(
    divisionCases.TC_DIVAPI_008.title,
    { tag: divisionCases.TC_DIVAPI_008.tag },
    async ({ userOperationsHubApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_008.severity);

      const division = buildDivision();
      const pk = await userOperationsHubApi.createDivision(division);

      const first = await userOperationsHubApi.deleteDivision(pk);
      const second = await userOperationsHubApi.deleteDivision(pk);

      await allure.parameter('Second attempt answered', JSON.stringify(second));

      expect(first.status, 'the first delete did not succeed').toBe(true);

      // Idempotency, in the sense that matters: the second call is safe and
      // leaves the same result behind. The client throws on any status that is
      // not 200, so reaching this line is already half the assertion.
      //
      // The service reports success for the second attempt too, which is
      // arguably over-generous — nothing was deleted — but it is the behaviour
      // REST prescribes for a repeated DELETE, and it is what makes the
      // `existingDivision` fixture's teardown safe every time a delete test has
      // already removed its own division.
      expect(second.status, 'the second delete was rejected outright').toBe(true);

      expect(await userOperationsHubApi.countDivisionsNamed(division.name)).toBe(0);
    },
  );
});

test.describe('Verify the division search cannot be made to leak or to fail', () => {
  test.beforeEach(async () => {
    await allure.epic('User Operations Hub');
    await allure.feature('Divisions API');
    await allure.story('Search safety');
  });

  test(
    divisionCases.TC_DIVAPI_006.title,
    { tag: divisionCases.TC_DIVAPI_006.tag },
    async ({ userOperationsHubApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_006.severity);

      const nothing = 'zzz-no-division-is-called-this-zzz';
      const listing = await userOperationsHubApi.divisionListing(nothing);

      // A filter that quietly matches everything is far worse than one matching
      // nothing, and it is what a broken query change produces.
      expect(listing.data, 'a term matching nothing returned rows').toEqual([]);
      expect(listing.tolalcount).toBe(0);
    },
  );

  test(
    divisionCases.TC_DIVAPI_007.title,
    { tag: divisionCases.TC_DIVAPI_007.tag },
    async ({ userOperationsHubApi }) => {
      await allure.severity(divisionCases.TC_DIVAPI_007.severity);

      const everything = (await userOperationsHubApi.divisionListing('', 1)).tolalcount;

      const probes = [
        { label: 'percent sign', term: '%' },
        { label: 'bare quote', term: "'" },
        { label: 'injection probe', term: "' OR '1'='1" },
        { label: 'very long term', term: 'x'.repeat(300) },
      ];

      for (const probe of probes) {
        await test.step(`When a ${probe.label} is searched for`, async () => {
          const listing = await userOperationsHubApi.divisionListing(probe.term);

          // Reaching here already proves no error page or raw SQL came back: the
          // client parses every response against the listing schema and throws
          // on anything else.
          expect(divisionListingSchema.safeParse(listing).success).toBe(true);

          // The defect this guards against: an unescaped term reaching the query
          // and turning a filtered search into the whole table.
          expect(
            listing.tolalcount,
            `searching a ${probe.label} returned the entire tenant`,
          ).toBeLessThan(everything);
        });
      }
    },
  );
});
