export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/api/country") {

      const country = request.cf?.country || "UNKNOWN";

      return new Response(
        JSON.stringify({
          country: country
        }),
        {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
