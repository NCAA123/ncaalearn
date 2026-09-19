import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// No functionMiddleware needed for auth anymore: the session lives in a
// cookie (see integrations/supabase/{client,server}.ts), which the browser
// attaches automatically on same-origin server-fn calls. This used to
// require attachSupabaseAuth to manually pull the token out of localStorage
// and attach it as a Bearer header.
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
