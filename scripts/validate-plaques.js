
async function findWikidataEntity(searchTerm) {

  const url =
    "https://www.wikidata.org/w/api.php?" +
    new URLSearchParams({
      action: "wbsearchentities",
      search: searchTerm,
      language: "en",
      format: "json",
      origin: "*"
    });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Wikidata search failed");
  }

  const data = await response.json();

  return (data.search || []).map(item => ({
    qid: item.id,
    label: item.label,
    description: item.description || "",
    url: item.concepturi
  }));
}

// Example: search for a plaque
findWikidataEntity("Treaty Tree Cape Town")
  .then(results => console.table(results));

