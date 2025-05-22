// ≈New-York geoname-id so we get Diaspora sedra sequence & times:
const GEO_ID = 5128581;

async function getParasha(person) {
  // 1. 13 or 12 years later
  const born = new Date(person.birthdate);
  const yearsToAdd = person.gender === "female" ? 12 : 13;
  const barDate = new Date(
    born.getFullYear() + yearsToAdd,
    born.getMonth(),
    born.getDate()
  );

  // 2. bump forward to next Shabbat (Saturday = 6)
  const shabbat = new Date(barDate);
  shabbat.setDate(shabbat.getDate() + ((6 - shabbat.getDay() + 7) % 7));

  // 3. YYYY-MM-DD for the API
  const pad = n => String(n).padStart(2, "0");
  const url = `https://www.hebcal.com/shabbat?cfg=json&geonameid=${GEO_ID}&date=` +
              `${shabbat.getFullYear()}-${pad(shabbat.getMonth()+1)}-${pad(shabbat.getDate())}`;

  const data = await fetch(url).then(r => r.json());
  const parashaItem = data.items.find(it => it.category === "parashat");
  return parashaItem ? parashaItem.title : "Unknown";
}

async function buildPage() {
  // fire all look-ups in parallel, wait for them
  const enriched = await Promise.all(
    PEOPLE.map(async p => ({ ...p, parasha: await getParasha(p) }))
  );

  // group by parasha
  const byParasha = {};
  enriched.forEach(p => {
    (byParasha[p.parasha] ||= []).push(p.name);
  });

  // build HTML
  const container = document.getElementById("content");
  container.innerHTML = Object.entries(byParasha)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([parasha, names]) => `
        <section>
          <h2 id="${parasha.replace(/\s+/g, "-")}">${parasha}</h2>
          <ul>${names.map(n => `<li>${n}</li>`).join("")}</ul>
        </section>`
    )
    .join("");

  // add instant-filtering
  const fuse = new Fuse(enriched, { keys: ["name"], includeScore: false });
  document.getElementById("search").addEventListener("input", e => {
    const term = e.target.value.trim();
    const matches = term ? fuse.search(term).map(r => r.item.name) : null;

    document.querySelectorAll("section").forEach(sec => {
      const lis = sec.querySelectorAll("li");
      let anyVisible = false;
      lis.forEach(li => {
        const show = !matches || matches.includes(li.textContent);
        li.style.display = show ? "" : "none";
        if (show) anyVisible = true;
      });
      sec.style.display = anyVisible ? "" : "none";
    });
  });
}

buildPage();
