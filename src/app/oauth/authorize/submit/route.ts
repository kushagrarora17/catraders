/** The shared-password sign-in endpoint is retired. */
export async function POST() {
  return Response.json({ error: "Use an individual Google or Microsoft sign-in" }, { status: 410 });
}
