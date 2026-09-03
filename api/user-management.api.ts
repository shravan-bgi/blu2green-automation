import type { APIRequestContext } from '@playwright/test';
import { obfuscate } from '@api/obfuscation';
import {
  divisionListingSchema,
  mutationResultSchema,
  sectorListSchema,
  type DivisionRecord,
  type SectorOption,
} from '@api/schemas';
import { userManagementApi as service } from '@config/endpoints';
import type { Division } from '@typings/division.types';

/**
 * The user-management service, for the work a test needs done but is not
 * testing: seeding a precondition, taking back what a test created, and reading
 * what the screen does not show.
 *
 * Every call is scoped to the company in the bearer token. The service reads
 * `companyPk` from the token and never takes it as an argument, which is what
 * makes one context the unit of isolation.
 *
 * Responses are parsed against the schemas in `api/schemas.ts` rather than
 * trusted, so a shape that drifts fails here instead of turning into an arrange
 * step that quietly did nothing.
 */
export class UserManagementApi {
  constructor(private readonly api: APIRequestContext) {}

  /** This method returns the full path for one service action. */
  private url(action: string): string {
    return `${service.base}/${action}`;
  }

  /** This method reads a response body, failing loudly on a bad status or a bad shape. */
  // Both checks matter and they catch different things: the status catches a
  // rejected token or a broken service, and the parse catches the response
  // quietly changing shape underneath us.
  private async parse<T>(
    action: string,
    response: Awaited<ReturnType<APIRequestContext['post']>>,
    schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: unknown } },
  ): Promise<T> {
    if (!response.ok()) {
      throw new Error(
        `${action} responded ${response.status()} ${response.statusText()}: ${await response.text()}`,
      );
    }

    const result = schema.safeParse(await response.json());

    if (!result.success || result.data === undefined) {
      throw new Error(
        `${action} returned a body this suite does not recognise: ${JSON.stringify(result.error)}`,
      );
    }

    return result.data;
  }

  /** This method returns every sector the environment offers. */
  async sectors(): Promise<SectorOption[]> {
    const response = await this.api.get(this.url(service.sectorList));

    return (await this.parse(service.sectorList, response, sectorListSchema)).data;
  }

  /** This method resolves a sector's display name to the key the form submits. */
  async sectorPk(name: string): Promise<number> {
    const match = (await this.sectors()).find((sector) => sector.secname_en === name);

    if (!match) {
      throw new Error(`No sector named "${name}" is offered by this environment.`);
    }

    return match.secpk;
  }

  /** This method returns the divisions belonging to this company. */
  // `search` matches Division ID or Division Name, the same field the listing's
  // search box fills. Left empty it returns the first page of all of them, which
  // is why a caller that cares about one division passes its name.
  async listDivisions(search = '', limit = 100): Promise<DivisionRecord[]> {
    const response = await this.api.post(this.url(service.divisionListing), {
      data: {
        Limit: limit,
        Page: 0,
        search_Filter: '',
        search_Division: '',
        search_overall: search,
        sort: null,
      },
    });

    return (await this.parse(service.divisionListing, response, divisionListingSchema))
      .data;
  }

  /** This method returns one division by its exact name. */
  // The service's search is a substring match, so the result is narrowed again
  // here: a caller checking that a duplicate was refused deserves an exact
  // answer rather than a near one.
  async findDivision(name: string): Promise<DivisionRecord | undefined> {
    return (await this.listDivisions(name)).find(
      (division) => division.mcsd_businessunitrefname === name,
    );
  }

  /** This method returns how many divisions carry exactly this name. */
  // Zero, one, or a product bug.
  async countDivisionsNamed(name: string): Promise<number> {
    return (await this.listDivisions(name)).filter(
      (division) => division.mcsd_businessunitrefname === name,
    ).length;
  }

  /** This method creates a division and returns its primary key. */
  // Mirrors what the form posts, including the empty `image` and the null
  // `secpk` that mark this as a create rather than an update. The key comes back
  // as plain base64 in `data`, which is what lets a caller delete it afterwards
  // without searching the listing for it again.
  async createDivision(division: Division): Promise<number> {
    const response = await this.api.post(this.url(service.addDivision), {
      data: {
        data: {
          division_name: division.name,
          division_sector: await this.sectorPk(division.sector),
          description: `<p>${division.description}</p>`,
          image: '',
          secpk: null,
        },
      },
    });

    const result = await this.parse(service.addDivision, response, mutationResultSchema);

    // Everything answers 200, refusals included, so `status` is the only thing
    // that says whether a division was made. A seeding step that silently did
    // nothing is worse than one that fails.
    if (!result.status) {
      throw new Error(
        `Could not seed a division named "${division.name}": ${result.message || 'the service refused it'}.`,
      );
    }

    return Number(Buffer.from(result.data, 'base64').toString('utf8'));
  }

  /** This method removes a division by its primary key. */
  // Permanent, despite the endpoint being named for a deactivation: the
  // application's own confirmation says "This will permanently delete ... This
  // action can't be undone." Callers must pass a key they got from creating the
  // division or resolved from an exact name — never one found by a filter or by
  // "whatever is newest".
  async deleteDivision(pk: number): Promise<void> {
    const response = await this.api.post(this.url(service.deactivateDivision), {
      data: { divpk: obfuscate(pk) },
    });

    await this.parse(service.deactivateDivision, response, mutationResultSchema);
  }

  /** This method removes a division by name if it is there, and reports whether it was. */
  // False for a test whose division was never created — the normal outcome for
  // the refusal cases, and not a failure.
  async deleteDivisionNamed(name: string): Promise<boolean> {
    const division = await this.findDivision(name);

    if (!division) return false;

    await this.deleteDivision(division.memcompsecdtls_pk);

    return true;
  }
}
