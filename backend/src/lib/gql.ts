export type GraphQLResponse<T> = {
  data: T;
};

type GraphQLErrorResponse = {
  errors: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
};

export async function gql<T>(
  graphqlUrl: string,
  query: string,
): Promise<GraphQLResponse<T>> {
  const body = JSON.stringify({ query });

  const headers = {
    "Content-Type": "application/json",
  };

  const res = await fetch(graphqlUrl, {
    method: "POST",
    body,
    headers,
  });

  if (res.status !== 200) {
    throw new Error(`GraphQL failed with code: ${res.status}`);
  }

  const json = await res.json();

  if (isGraphQLErrorResponse(json)) {
    throw new Error(
      `GraphQL failed with errors: ${JSON.stringify(json.errors, null, 2)}`,
    );
  }

  return json as GraphQLResponse<T>;
}

function isGraphQLErrorResponse(
  response: unknown,
): response is GraphQLErrorResponse {
  return (
    typeof response === "object" && response != null && "errors" in response
  );
}
