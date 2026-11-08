# AI Store Assistants

*Türkçe: [README.md](README.md)*

In a small shop, most sales happen through conversation: "do you have this dress in M?", "I'm 1.65 m, which size should I get?", "how do I take care of this necklace?". I built assistant-powered sites that can answer these questions even at midnight, show the product and add it to the cart. Each one was made for a real business. In this repo I changed the brand names (Örnek Moda, Örnek Butik, Örnek Kuyum, Örnek Güzellik), addresses and contact details.

**Live:** [3D jewelry showcase](https://emirhnnnk-lab.github.io/ai-magaza-asistanlari/3-kuyum-3d-vitrin/)

| # | Project | Sector | What the assistant does |
|---|---|---|---|
| 1 | [Fashion Style Advisor](1-moda-stil-danismani) | Women's clothing, online store | **Defne**: shows products as cards with images, suggests a size from height and weight, builds outfits, adds to the cart from the chat |
| 2 | [Boutique Shoe Assistant](2-butik-ayakkabi-asistani) | Shoe boutique | Suggests products from the catalog, asks about stock and size; forwards questions it can't answer to the team via Telegram |
| 3 | [Jewelry 3D Showcase](3-kuyum-3d-vitrin) | Jewelry | A 3D product showcase with Three.js; an assistant that answers product and care questions |
| 4 | [Beauty Booking Assistant](4-guzellik-randevu-asistani) | Beauty salon | Service advice, appointment suggestions, customer and admin panels |

## Shared setup and my decisions
- **The assistant does real work:** the model doesn't just chat; through tools it searches the catalog, adds to the cart and suggests appointments (OpenAI API, tool calling).
- **The assistant's rules are tested:** each project has written rules the assistant must follow, and contract tests that check them **without calling the model at all** (`contract-test.js`), for example never suggesting a product that is not in the catalog. So whenever I change something, I can see in seconds, for free, whether I broke a rule.
- **It keeps working if the model can't be reached:** if the jewelry showcase can't reach the model, it continues with its own rule-based assistant; the customer never sees an empty screen.
- **Simple setup:** the server is a plain Node.js server with no extra packages; the front end is plain JavaScript, CSS and Three.js for 3D.

## Running it
In each folder:
```bash
# .env file in the root folder: OPENAI_API_KEY=...
node server.js        # for the Fashion Style Advisor: node demo/server.js
```

## Notes
- Product images are used with the businesses' permission and are stored locally in the repo. The Fashion Style Advisor includes a 40-product part of the catalog; in the boutique, products without images use a placeholder.
- The 3D models (.glb) come from sources licensed for commercial use; copyright and attribution belong to their owners.

---
Built by **Emirhan Karaca**
