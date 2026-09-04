I chose to build a Plant Management App to plan and track the care actions such as watering, fertilzing, pruning and repotting houseplants. The plants are sorted into the rooms they are located in. The user can add/delete rooms, add/edit/delete plants and their details. Each plant’s details open in a separate page and is linked separately.
As per by the Sprint Project requirements, it is a next.js app with only data stored in localStorage. No databases, no login. A CLAUDE.md is drafted to include the stack, how to run, context and conventions.

After the CLAUDE.md was drafted and the understanding of the stack, context and conventions were clear, I requested Claude to go into Plan Mode and went through the planning of the implementation of the app.

Claude consulted with me on many questions of which some examples are below:
Q&A and results:
Data storage: Recommended three options - localstorage + JSON Export, IndexedDB, only Localstorage - I chose first option

Photos of plants: currently no photos planned, as storing photos would require IndexedDB as storage option

Care actions - Last-done date only vs full history log - I chose first one to keep it simple for now

Schedule: per plant, per action or global setting - I chose per plant because each plant is different and has a different cycle for each action

How much to build first - Core first, polish later or full build - I chose core first

Presented a detailed plan which I approved to build.

I used the  search → paste → cite to create an about page. However the location of the about button and the linking was done differently to my liking. It was combined with the add rooms, add plants buttons which made the whole page look confusing for the user. I then directed Claude to change it accordingly.

Although Claude is very smart, it was drifting when it came to placing status buttons next to the plants or while preparing a backdrop based on my direction. It did help to highlight the exact error and ask Claude to fix it the way I want it to.

Compared to a static app, it was a bit harder to understand and manage page layout and links. But this project helped clarify that. I still haven’t figured out how to test this layout on a mobile device as it was not part of the learning material yet. Which is something I would try the next time.
