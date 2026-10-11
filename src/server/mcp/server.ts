import "server-only";
import { McpServer } from "@modelcontextprotocol/server";
import { registerCatalogReadTools } from "./tools/catalog-read";
import { registerCatalogWriteTools } from "./tools/catalog-write";
import { registerImportTool } from "./tools/import";
import { registerRequestTools } from "./tools/requests";
import { registerReviewTools } from "./tools/reviews";
import { registerTaxonomyWriteTools } from "./tools/taxonomy-write";

const INSTRUCTIONS = `Manage the Catraders automotive catalog, customer reviews and quote requests.
- Writes go live on the website immediately; there is no draft step. Hiding (set_visibility) is the reversible way to take something down; nothing can be deleted here.
- Before creating or importing products, call get_taxonomy so category slugs and attribute values are spelled exactly. Add missing values with upsert_attribute_value.
- Run import_products_csv as a dry run first and review the report before applying.
- Products are identified by id, slug or SKU. Stock changes in bulk go through set_stock.
- Quote requests (RFQ-…) and inquiries (INQ-…) are read with list_requests/get_request; update_request_status only records the status and doesn't email the customer.`;

/** A fresh server per request: the endpoint is stateless. */
export function createCatradersServer() {
  const server = new McpServer({ name: "catraders", version: "1.0.0" }, { instructions: INSTRUCTIONS });
  registerCatalogReadTools(server);
  registerCatalogWriteTools(server);
  registerTaxonomyWriteTools(server);
  registerImportTool(server);
  registerReviewTools(server);
  registerRequestTools(server);
  return server;
}
