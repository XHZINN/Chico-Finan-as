const NHOST_URL = process.env.NHOST_GRAPHQL_URL;
const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET;

export async function nhostQuery(query, variables) {
  const res = await fetch(NHOST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": ADMIN_SECRET,
      "x-hasura-role": "henry",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    throw new Error(json.errors[0].message);
  }
  return json.data;
}