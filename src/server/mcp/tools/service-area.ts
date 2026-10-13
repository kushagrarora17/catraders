import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getWriteClient } from "@/sanity/write-client";
import { revalidateServiceArea } from "../revalidate";
import { fail, IDEMPOTENT_WRITE, ok, READ_ONLY } from "./util";

/** The Studio singleton's fixed document id (see studio/structure.ts). */
const SERVICE_AREA_ID = "serviceArea";

interface ServiceAreaDoc {
  _id: string;
  _type: string;
  vertical?: string;
  region?: string;
  description?: string;
  cities?: string[];
}

async function loadServiceArea() {
  const doc = await getWriteClient().getDocument<ServiceAreaDoc>(SERVICE_AREA_ID);
  return doc?._type === "serviceArea" && doc.vertical === "automotive" ? doc : undefined;
}

export function registerServiceAreaTools(server: McpServer) {
  server.registerTool(
    "get_service_area",
    {
      title: "Get service area",
      description:
        "The landing-page Service Area section: the region (shown as \"Serving <region>\"), the description and the cities served, in display order.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const area = await loadServiceArea();
      if (!area) return fail("No service area is set, so the section is hidden. Create it with update_service_area.");
      return ok({ region: area.region ?? null, description: area.description ?? null, cities: area.cities ?? [] });
    },
  );

  server.registerTool(
    "update_service_area",
    {
      title: "Update service area",
      description:
        "Change the landing-page Service Area section. Only the fields you pass change; 'cities' replaces the whole list, so call get_service_area first to add or remove one city. Creating it for the first time needs all three fields.",
      inputSchema: z.object({
        region: z.string().trim().min(1).max(100).optional().describe('Shown in the heading as "Serving <region>"'),
        description: z.string().trim().min(1).max(1000).optional(),
        cities: z
          .array(z.string().trim().min(1).max(100))
          .min(1)
          .max(100)
          .optional()
          .describe('City names in display order, without the province; each is shown followed by ", ON"'),
      }),
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ region, description, cities }) => {
      const fields = Object.fromEntries(
        Object.entries({ region, description, cities }).filter(([, value]) => value !== undefined),
      );
      if (!Object.keys(fields).length) return fail("Nothing to update: pass at least one field to change");

      if (cities) {
        const lower = cities.map((city) => city.toLowerCase());
        const duplicates = cities.filter((_, i) => lower.indexOf(lower[i]) !== i);
        if (duplicates.length) return fail(`Cities must be unique; repeated: ${[...new Set(duplicates)].join(", ")}`);
      }

      const client = getWriteClient();
      const existing = await loadServiceArea();
      if (!existing) {
        if (!region || !description || !cities) {
          return fail("No service area exists yet: pass region, description and cities to create it");
        }
        await client.create({ _id: SERVICE_AREA_ID, _type: "serviceArea", vertical: "automotive", ...fields });
        revalidateServiceArea();
        return ok({ created: true, updated: Object.keys(fields) });
      }

      await client.patch(existing._id).set(fields).commit();
      revalidateServiceArea();
      return ok({ created: false, updated: Object.keys(fields) });
    },
  );
}
