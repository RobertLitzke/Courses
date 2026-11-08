# Course status

Made by `npm run status` on 2026-11-08. Don't edit this file: change the lessons, the review queues or `tools/lesson-status.json` and run it again. How to keep it current: [CLAUDE.md](../CLAUDE.md#keeping-the-status-table-current).

A lesson's status is the first step it still waits for, in the order: student read-through, Gemini copy edit, fact check, photos. "Also waiting on" lists the later ones.

| Course | Version | Written | Planned | Need read-through | Awaiting Gemini | Awaiting fact check | Awaiting photos | Done |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [Clouds](#clouds) | 0.1 beta | 16 | 0 | 0 | 16 | 16 | 0 | 0 |
| [Dirt](#soil) | 0.1 beta | 11 | 0 | 0 | 11 | 11 | 0 | 0 |
| [Geology](#geology) | 1.1 released | 47 | 0 | 0 | 1 | 0 | 1 | 45 |
| [Circuitry](#electronics) | 0.1 beta | 14 | 0 | 0 | 14 | 14 | 0 | 0 |
| [Photography: Out of Auto](#photography) | 0.1 beta | 12 | 0 | 0 | 0 | 12 | 4 | 0 |
| [Astronomy](#astronomy) | 0.2 beta | 25 | 43 | 0 | 0 | 25 | 15 | 0 |
| [Ecology](#ecology) | 0.2 beta | 37 | 0 | 0 | 0 | 37 | 15 | 0 |
| [Botany](#botany) | 0.2 beta | 33 | 0 | 0 | 0 | 33 | 33 | 0 |
| [Synthesizers](#synthesizers) | 0.3 beta | 30 | 0 | 0 | 0 | 30 | 0 | 0 |
| [Money That Lasts](#finance) | 0.3 beta | 32 | 0 | 0 | 0 | 32 | 0 | 0 |
| [Fungi](#fungi) | 0.3 beta | 25 | 0 | 0 | 0 | 25 | 24 | 0 |
| [Rivers and the Salish Sea](#rivers) | 0.2 beta | 22 | 0 | 0 | 0 | 22 | 13 | 0 |
| [Bats](#bats) | 0.2 beta | 15 | 0 | 0 | 0 | 15 | 6 | 0 |

A course is in beta (version 0.x) until Rob releases it (1.0). The bar for asking him: every planned lesson written, and every lesson through the read-through, the Gemini copy edit, the fact check and its photos. Versions go up only when someone runs `npm run release` (tools/release.mjs), not with every change.

| Course | Version | Since | Ready to release? |
| --- | --- | --- | --- |
| Clouds | 0.1 beta | 2026-11-04 | no: 16 to copy-edit, 16 to fact-check |
| Dirt | 0.1 beta | 2026-11-04 | no: 11 to copy-edit, 11 to fact-check |
| Geology | 1.1 released | 2026-11-08 | released; still to do: 1 to copy-edit, 1 awaiting photos |
| Circuitry | 0.1 beta | 2026-11-04 | no: 14 to copy-edit, 14 to fact-check |
| Photography: Out of Auto | 0.1 beta | 2026-11-04 | no: 12 to fact-check, 4 awaiting photos |
| Astronomy | 0.2 beta | 2026-11-08 | no: 43 lessons to write, 25 to fact-check, 15 awaiting photos |
| Ecology | 0.2 beta | 2026-11-08 | no: 37 to fact-check, 15 awaiting photos |
| Botany | 0.2 beta | 2026-11-08 | no: 33 to fact-check, 33 awaiting photos |
| Synthesizers | 0.3 beta | 2026-11-08 | no: 30 to fact-check |
| Money That Lasts | 0.3 beta | 2026-11-08 | no: 32 to fact-check |
| Fungi | 0.3 beta | 2026-11-08 | no: 25 to fact-check, 24 awaiting photos |
| Rivers and the Salish Sea | 0.2 beta | 2026-11-08 | no: 22 to fact-check, 13 awaiting photos |
| Bats | 0.2 beta | 2026-11-08 | no: 15 to fact-check, 6 awaiting photos |

## Clouds <a id="clouds"></a>

`courses/clouds`, version 0.1 (beta, 2026-11-04). The oldest course. Its prose went through several student read-throughs (Oct 2026) and a physics review of the sky lab (3 Nov), but never a Gemini copy edit or a full fact check.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | Morning fog and afternoon puffs (`fog`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | What a cloud is made of, how a calm clear night makes fog and stratus, and how rising air builds fair-weather cumulus. |
| 2 | Will this grey sky actually rain? (`low-sky`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Stable and unstable air, the lid that flattens heaps into stratocumulus, and why a deep cloud rains when a dark thin one doesn't; nimbostratus. |
| 3 | Sorting the sky in 30 seconds (`middle-sky`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | The three height floors, how the Latin names fit together, and three field checks for a cloud's height; altocumulus, cirrocumulus and cirrus. |
| 4 | Tomorrow’s weather written high up (`ice-realm`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Mares' tails, contrails, the 22° halo and altostratus's frosted sun, read as a warm front's countdown 12 to 24 hours ahead. |
| 5 | Afternoon ambush: reading storm towers (`giants`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Latent heat and conditional instability, the morning signs of an afternoon storm, anvils, gust fronts and the 30-30 lightning rule. |
| 6 | Wind shifts, cold fronts, and radar (`front`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Lows and their fronts, the barometer, why warm fronts soak and cold fronts squall, the crossed-winds rule, and reading rain on radar. |
| 7 | Local tricks: mountains, winter ice, and rare skies (`local-sky`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Rain shadows, standing mountain waves and lens clouds, supercooled water, rime and freezing rain, and how ice crystals make rain. |
| P1 | Why does wind blow in a circle around a storm? (`wind`) | The Pacific coast | awaiting Gemini review (never copy-edited, not queued) | Fact check | How pressure pushes the wind, how the turning Earth bends it along the isobars, friction near the ground, and the jet stream. |
| P2 | Why does the Pacific coast almost never thunder? (`coast`) | The Pacific coast | awaiting Gemini review (never copy-edited, not queued) | Fact check | Why the coast from Seattle to San Francisco hardly ever thunders: a cold sea, a lid of sinking air and the marine layer. |
| P3 | Where does a week of winter rain come from? (`rivers`) | The Pacific coast | awaiting Gemini review (never copy-edited, not queued) | Fact check | Why the Northwest's rain comes from October to April: the storm track, atmospheric rivers, snow level and the Puget Sound convergence zone. |
| V1 | What makes a storm violent? (`violent`) | Violent storms | awaiting Gemini review (never copy-edited, not queued) | Fact check | Why a few thunderstorms last all evening and drop big hail: the energy a rising bubble gains, the cap that stores it, and wind shear. |
| V2 | How does a tornado form? (`tornado`) | Violent storms | awaiting Gemini review (never copy-edited, not queued) | Fact check | Where a tornado's spin comes from (a horizontal roll tipped up and stretched by an updraft), wall clouds, hook echoes and the EF scale. |
| V3 | Why does a hurricane need a warm sea? (`hurricane`) | Violent storms | awaiting Gemini review (never copy-edited, not queued) | Fact check | How tropical showers become a hurricane: the trade winds, a heat engine run on warm sea, the eye, what kills one, and storm surge. |
| F1 | Why does a valley stay grey for weeks in winter? (`winter-fog`) | Fog, dust and wind | awaiting Gemini review (never copy-edited, not queued) | Fact check | Why a basin can stay foggy for weeks in winter while the hills are sunny: the cold pool, other kinds of fog, rime and freezing rain. |
| F2 | Where do walls of dust and hot east winds come from? (`east-wind`) | Fog, dust and wind | awaiting Gemini review (never copy-edited, not queued) | Fact check | Dust walls raised by storms whose rain never lands, and why wind coming down off the Cascades arrives hot and dry; the Gorge and the Santa Ana. |
| S1 | The rainmakers, 1946 (`seeding`) | Cloud seeding | awaiting Gemini review (never copy-edited, not queued) | Fact check | The 1946 dry ice and silver iodide experiments, which clouds seeding can and can't help, and how randomised trials tested it. |

## Dirt <a id="soil"></a>

`courses/soil`, version 0.1 (beta, 2026-11-04). Came in from the old Dirt repository. No record of a Gemini copy edit or a full fact check; the read-through status is a guess.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | Inside a handful of soil (`made-of`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | The ingredients in a handful of soil, the sizes of mineral grain, and how their mix shapes a garden bed. |
| 2 | Water and air in the pores (`water`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | How pores of different sizes hold water or let it drain, why rain pools on some beds, and how long a bed lasts between waterings. |
| 3 | The living soil (`food-web`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Soil organisms, the underground food chain, and how plant roots feed the microbes around them. |
| 4 | Organic matter and compost (`organic-matter`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | How organic matter improves soil structure, balancing browns and greens in a compost heap, and the breakdown of dead plants into humus. |
| 5 | Advanced composting (`compost-methods`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Running a hot heap through its temperature stages, slower methods such as leaf mould, worm bins and bokashi, and testing whether compost is finished. |
| 6 | Crumb and soil structure (`structure`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | The gluing of mineral grains into crumbs by roots and microbes, drainage and airflow between crumbs, and the effects of digging and footsteps. |
| 7 | Feeding plants: nutrients and pH (`nutrients`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Plants take mineral nutrients from soil water, clay and humus hold positive ions against rain, soil pH controls which nutrients stay dissolved, and leaf symptoms help diagnose shortages. |
| 8 | Building soil through the year (`seasons`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Year-round habits that protect soil structure, seasonal bed care from autumn through summer, and using cover crops and mulch to feed soil life. |
| 9 | Reading your soil (`diagnosis`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Combining field tests to trace bed symptoms back to their root causes, prioritizing physical and biological fixes before buying fertilizers, and taking a composite sample for a soil lab. |
| 10 | Raised beds (`raised-beds`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Choosing a raised bed's height, filling it with a mix that holds its level and drains into the ground below, and keeping it watered and fed. |
| 11 | Soil in pots (`pots`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | The perched water at the bottom of every pot, potting mixes and their ingredients, and watering and feeding plants whose roots cannot reach any other soil. |

## Geology <a id="geology"></a>

`courses/geology`, version 1.1 (released, 2026-11-08). Every lesson was fact-checked on 3 Nov. Gemini's later fact notes still need checking against that review when the queue is run.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | Seashells on mountaintops (`steno`) |  | done |  | How loose mud becomes layers of rock, and how to read their order. |
| 2 | A desert turned to stone (`dunes`) |  | done |  | How water and wind sort grains, and how a moving dune leaves sloping layers behind. |
| 3 | The map that read the ground (`smith`) |  | done |  | How fossils match layers across the countryside, and how tilted beds show up on a map. |
| 4 | The rock that was once on fire (`basalt`) |  | done |  | How molten rock cools into glass or crystals, and how a lava flow cracks into columns. |
| 5 | Garnets in the mud (`barrow`) |  | done |  | How heat and pressure alter buried rock in the solid state, and how the resulting minerals record the depth of burial. |
| 6 | Fossils in the schist (`families`) |  | done |  | How the conditions a rock has been through sort it into one of three families, and why the families shade into one another. |
| 7 | The rock at Siccar Point (`siccar`) |  | done |  | Unconformities, the cycle that makes and unmakes rock, and how Hutton read deep time in a single cliff. |
| 8 | How old is the Earth? (`age`) |  | done |  | Kelvin's cooling Earth, the objections that undid it, and the clock in radioactive atoms. |
| 9 | Continents that fit (`drift`) |  | done |  | Wegener's evidence that the continents have moved, and why most geologists rejected it for forty years. |
| 10 | Stripes on the seafloor (`stripes`) |  | done |  | How magnetic reversals recorded in ocean-floor rock showed the sea floor spreading apart. |
| 11 | Where the Earth shakes (`quakes`) |  | done |  | How earthquakes outline the plates, and how the angle of a sinking slab of ocean floor sets where volcanoes rise. |
| 12 | Islands that get older in a line (`hotspot`) |  | done |  | How a nearly fixed source of magma under a moving plate builds a chain of volcanoes, and what the Hawaiian-Emperor bend records. |
| 13 | The ocean before the Atlantic (`supercontinents`) |  | done |  | How geologists rebuilt the map for a billion years: an ocean that closed before the Atlantic opened, compass needles frozen in rock, and the cycle of supercontinents from Rodinia through Gondwana and Pangaea to today. |
| 14 | A river that cuts through a mountain (`rivers`) |  | done |  | How rivers cut down to base level, and how a river can come to cross a mountain range rather than go around it. |
| 15 | Boulders where they don't belong (`erratics`) |  | awaiting Gemini review (queued 2026-11-08) |  | How glaciers grow, flow, carry rock and drop it, and how Agassiz argued for an ice age. |
| 16 | The pacemaker of the ice ages (`pacemaker`) |  | done |  | How slow changes in the Earth's orbit time the ice ages, and how the record was read from deep-sea mud. |
| 17 | A lake with no river (`kettles`) |  | done |  | The landforms an ice sheet leaves behind, how shaded relief reveals them, and how the land rises once the ice is gone. |
| 18 | Why faults snap (`faults`) |  | done |  | How a stuck fault stores the plates' motion as bent rock and releases it in an earthquake, what sets an earthquake's size, and why soft ground shakes harder. |
| 19 | Why some volcanoes explode (`explode`) |  | done |  | How the silica and water in magma decide whether a volcano pours out lava or explodes, and what a pyroclastic flow is. |
| 20 | Barnacles above the tide (`barnacles`) |  | done |  | How George Plafker read the 1964 Alaska earthquake from barnacles and drowned forests, and how a locked subduction zone lifts and drops a coast and starts a tsunami. |
| W1 | Shells at the top of the bluff (`ebey`) | Whidbey Island | done |  | How to read the bluff at Ebey’s Landing from the beach up, and why clam shells and boulders sit together in clay near its top. |
| W2 | Holes in the prairie (`prairie`) | Whidbey Island | done |  | Why central Whidbey has open prairies and pits with no outlets: gravel that drains too fast for young firs, blocks of buried ice, and thousands of years of fire. |
| W3 | Where the beaches come from (`feeder-bluffs`) | Whidbey Island | done |  | How Whidbey’s bluffs fail when water builds up above clay, and how the sand that falls feeds the beaches along the shore, until a bulkhead cuts it off. |
| W4 | Seafloor at Deception Pass (`deception`) | Whidbey Island | done |  | How pillow basalt, ribbon chert and serpentinite at Deception Pass record pieces of ocean floor scraped off and welded onto North America. |
| W5 | A fault under the island (`whidbey-fault`) | Whidbey Island | done |  | How geologists showed that the South Whidbey Island fault is active with no earthquake on record: lidar that sees through forest, trenches across scarps, and dates from the layers. |
| S1 | Why Seattle’s hills run north–south (`hills`) | Seattle | done |  | How a lobe of the Cordilleran ice sheet, a kilometre thick, flowed south over Seattle and left its hills, lakes and the Sound lined up in its direction. |
| S2 | Drowned forests in Lake Washington (`drowned`) | Seattle | awaiting photos/images (1 photo parked in pending-photos.json) |  | How tree rings, a raised beach, a tsunami sand and underwater landslides together revealed a large earthquake on the Seattle fault about 1,100 years ago. |
| S3 | Why the hills slide (`slides`) | Seattle | done |  | Why Seattle’s landslides happen at the same level on its bluffs, and why they come after wet winters: sand over clay, and water that cannot get out. |
| S4 | The ground people built (`fill`) | Seattle | done |  | How Seattle sluiced away hills and filled its tideflats, and why loose, wet fill shook hardest and liquefied in the 2001 Nisqually earthquake. |
| F1 | Bretz’s heresy (`bretz`) | The ice age floods | done |  | How J Harlen Bretz read the channelled scablands of eastern Washington as the work of a flood far bigger than any river, and why geologists refused to believe him for forty years. |
| F2 | Ripples the size of hills (`ripples`) | The ice age floods | done |  | How Joseph Pardee found the source of Bretz's flood in a glacial lake in Montana, how an ice dam floats and fails, and why the lake drained again and again. |
| F3 | How many floods? (`rhythmites`) | The ice age floods | done |  | How Richard Waitt counted dozens of separate floods in the Touchet Beds of Washington's Walla Walla valley, using burrows, ash and the shape of each bed. |
| F4 | Montana rocks in Oregon (`montana-rocks`) | The ice age floods | done |  | How boulders from Montana came to rest on hillsides in Oregon's Willamette Valley, carried by icebergs on the floodwater. |
| C1 | The orphan tsunami (`orphan`) | Cascadia | done |  | How buried marshes, dead cedars, Japanese records and Indigenous stories showed that Cascadia's megathrust broke in a magnitude 9 earthquake on 26 January 1700. |
| C2 | Mud under Auburn (`osceola`) | Cascadia | done |  | How towns from Enumclaw to Kent came to stand on a mudflow from Mount Rainier, and why lahars are the volcano's biggest threat to the Puget Lowland. |
| C3 | The sideways blast (`blast`) | Cascadia | done |  | Why Mount St Helens exploded sideways on 18 May 1980: a bulging flank, a landslide, and magma suddenly unloaded. |
| P1 | Round holes on the Moon (`craters`) | The Moon and planets | done |  | Why craters were long thought to be volcanoes, how a fast impact becomes an explosion, and how geologists trained the Apollo crews. |
| P2 | Dating a surface you can’t visit (`crater-ages`) | The Moon and planets | done |  | How counting craters gives an age, and how the Apollo and Luna samples turned the count into years. |
| P3 | Why the highlands are white (`highlands`) | The Moon and planets | done |  | White crystals in Apollo 11's soil, the ocean of magma that floated the Moon's crust, and where the mare lavas came from. |
| P4 | Where the Moon came from (`moon-origin`) | The Moon and planets | done |  | Three theories that Apollo's samples ruled out, the giant impact that replaced them, and the oxygen puzzle that remains. |
| L1 | Wood that turned to stone (`petrified`) | Fossils | done |  | Why most living things leave no trace, and the chemistry that turns wood, shell and soft bodies into fossils. |
| D1 | Weighing the Earth (`weigh`) | Deep Earth | done |  | How a mountain and a pair of lead balls measured the Earth's density, and why that density demands a dense core. |
| D2 | Finding a quake nobody saw (`epicentre`) | Deep Earth | done |  | The two kinds of wave an earthquake sends through the Earth, how three stations find where it happened, and how its size is measured. |
| D3 | Mohorovičić’s second wave (`moho`) | Deep Earth | done |  | How a doubled wave from a 1909 earthquake revealed the base of the crust, and why the crust is thick under mountains and thin under oceans. |
| D4 | The shadow behind the core (`core`) | Deep Earth | done |  | How missing waves on the far side of the Earth revealed the core, and how S waves showed it is liquid. |
| D5 | Lehmann’s inner core (`lehmann`) | Deep Earth | done |  | Faint waves inside the shadow zone, the solid inner core they revealed, and how its growth powers the magnetic field. |
| D6 | The deepest hole (`boreholes`) | Deep Earth | done |  | Project Mohole, the Kola Superdeep Borehole and KTB: what drilling into the crust found, and why the holes stopped. |

## Circuitry <a id="electronics"></a>

`courses/electronics`, version 0.1 (beta, 2026-11-04). Came in from the old Circuitry repository. Circuits are drawn by its solver, so it needs no photos. No record of a Gemini copy edit or a full fact check; the read-through status is a guess.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | Current, voltage and resistance (`what-flows`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Current, voltage and resistance, measuring them with a multimeter, and Ohm's law in resistors and lamps. |
| 2 | Series and parallel (`series-parallel`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Bulbs in a line and side by side, Kirchhoff's two laws, and cells stacked and paired. |
| 3 | Every source has a resistor inside (`sources`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Voltage dividers and pots, voltage sag under load, and measuring the resistance inside a source. |
| 4 | Power, energy, and wire losses (`power`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Calculating power in watts and energy in watt-hours, keeping components within their thermal ratings, sizing cables for voltage drop, and protecting wires with fuses. |
| 5 | Voltages that change (`signals`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | The scope, sine waves and frequency, and a signal as a wiggle riding on a steady voltage. |
| 6 | Things that take time (`capacitors`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Capacitors and RC time, coupling and filtering, the corner frequency, and inductors in brief. |
| 7 | Curved lines (`diodes`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Diodes and LEDs, their bent current curve, current limiting, rectifying and clipping. |
| 8 | A small current steering a big one (`switches`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Transistors and MOSFETs as switches, driving a relay, and the flyback diode. |
| 9 | Turning it up (`amplifiers`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Bias, gain set by two resistors, the emitter follower, clipping, negative feedback and the op-amp. |
| 10 | The dead circuit (`dead-circuit`) |  | awaiting Gemini review (never copy-edited, not queued) | Fact check | Reading one circuit as a schematic and a board, and finding faults with a multimeter. |
| 11 | Inside a Fuzz Face (`fuzz-face`) | Guitar pedals | awaiting Gemini review (never copy-edited, not queued) | Fact check | A guitar signal and its impedance, two transistors with lots of gain, and the clipping that makes the fuzz. |
| 12 | Inside a Tube Screamer (`tube-screamer`) | Guitar pedals | awaiting Gemini review (never copy-edited, not queued) | Fact check | An op-amp gain stage, diodes clipping in the feedback loop, the tone filter, and buffered versus true bypass. |
| 13 | Solar panels (`solar-panels`) | Off-grid solar | awaiting Gemini review (never copy-edited, not queued) | Fact check | A cell's current curve and its maximum power point, panels in series and parallel, shade and bypass diodes, and cold and heat. |
| 14 | Wiring an off-grid system (`off-grid`) | Off-grid solar | awaiting Gemini review (never copy-edited, not queued) | Fact check | Charge controllers, batteries, inverters and loads, sizing it all, and the fuses, disconnects and grounding that keep it safe. |

## Photography: Out of Auto <a id="photography"></a>

`courses/photography`, version 0.1 (beta, 2026-11-04). Student read-through done 3 Nov (d041fec). Three of the four stages are still drawn stand-ins until Rob's picture sets arrive.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | Camera decisions in automatic modes (`tour`) |  | awaiting fact check |  | Core exposure and focus controls, preset priorities in Bird-watching mode, and manual overrides. |
| 2 | Light, and the three ways to let it in (`light`) |  | awaiting fact check |  | Why the camera turns snow grey and a bird against the sky black, how to read the histogram, and which dial each shooting mode hands back to you. |
| 3 | The aperture and what stays sharp (`aperture`) |  | awaiting fact check |  | Why the hole in the lens decides how much of the scene is sharp, why a small sensor makes that band so deep, and where narrowing the aperture stops helping. |
| 4 | Shutter speed, and everything that moves (`shutter`) |  | awaiting fact check |  | How far things move while the shutter is open, telling your own shake from the subject's movement, panning, and leaving the shutter open on purpose. |
| 5 | ISO, noise, and the light you do not have (`iso`) |  | awaiting fact check |  | Why grain is a counting problem, when to raise ISO without hesitating, and where this small-sensor camera runs out of light. |
| 6 | The lens: 24 mm to 2000 mm (`lens`) |  | awaiting fact check | Photos (the moonrise stage is a drawn stand-in) | What focal length really changes, why a far moon looks huge behind a near tree, when cropping beats zooming, and the air between you and the subject. |
| 7 | Focus: telling the camera what you meant (`focus`) |  | awaiting fact check | Photos (the bramble stage is a drawn stand-in) | How autofocus chooses what to focus on, why it grabs the twig in front of the bird, and how to point it, follow a moving bird, or wait for one. |
| 8 | The colour of light (`colour`) |  | awaiting fact check |  | Colour temperature, what white balance is guessing, the hours of the day as different kinds of light, and what a polariser does. |
| 9 | Seeing the picture before you take it (`seeing`) |  | awaiting fact check | Photos (the meadow stage is a drawn stand-in) | Backgrounds, light direction, framing and fieldcraft: the decisions made with your feet before any dial is turned. |
| 10 | Birds, in practice (`birds`) |  | awaiting fact check |  | Starting settings for perched and flying birds, what Bird-watching mode was choosing for you, finding a bird at 2000 mm, and working a subject. |
| 11 | After the shutter (`after`) |  | awaiting fact check |  | What the JPEG and RAW files keep, what can still be recovered from them, and a short editing pass that is mostly undoing. |
| 12 | How the camera got here (`history`) |  | awaiting fact check | Photos (Boulevard du Temple photo still to fetch (Commons, from Rob's PC)) | The long story behind the dials: the dark room, the silver, the film and the chip, and why the numbers on the camera are the numbers they are. |

## Astronomy <a id="astronomy"></a>

`courses/astronomy`, version 0.2 (beta, 2026-11-08). Lessons 1-11 had the six-reviewer pass on 3 Nov, whose fixes are queued for Gemini; that was not a full fact check. Lessons 8 and 12-25 have no photos or encyclopedia links yet.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | Two shadows (`shadows`) |  | awaiting fact check |  | How a shadow measured the Earth, and how an angle measured the distance to the Sun. |
| 2 | Planets that loop backwards (`loops`) |  | awaiting fact check |  | Why planets sometimes run backwards across the sky, and why their orbits are ellipses. |
| 3 | The falling Moon (`falling`) |  | awaiting fact check |  | Why the Moon goes round the Earth instead of falling down, and why orbits are ellipses. |
| 4 | A planet found with a pen (`neptune`) |  | awaiting fact check |  | How small errors in Uranus's orbit revealed Neptune, and why the same trick failed for Mercury. |
| 5 | How far are the stars? (`parallax`) |  | awaiting fact check |  | Why the stars should shift as the Earth moves, why nobody could see it, and how Bessel finally did. |
| 6 | What the stars are made of (`spectra`) |  | awaiting fact check |  | How dark lines in sunlight revealed the elements in the Sun, and found one that wasn't known on Earth. *Outline v2 adds the Doppler shift here (not written yet).* |
| 7 | Why are there no green stars? (`colour`) |  | awaiting fact check |  | How a star's colour gives its temperature, and why no star looks green. |
| 8 | A schoolteacher's number puzzle (`ladder`) |  | awaiting fact check | Photos (no photos chosen yet) | Why each kind of atom gives out and soaks up only certain colours: Balmer's pattern, Bohr's ladder, and the electron as a wave. |
| 9 | Mostly hydrogen (`hydrogen`) |  | awaiting fact check |  | How stars were sorted into classes, and why the classes are temperatures, not ingredients. |
| 10 | Giants and dwarfs (`hr`) |  | awaiting fact check |  | How plotting brightness against colour sorted the stars, and showed that some are giants and some are no bigger than the Earth. *Outline v2 adds binary stars here (not written yet).* |
| 11 | What makes the Sun shine? (`sunshine`) |  | awaiting fact check |  | Why burning and shrinking can't power the Sun for long enough, and how fusing hydrogen into helium does. |
| 12 | Clusters as clocks (`clusters`) |  | awaiting fact check | Photos (no photos chosen yet) | How a star's mass decides how long it lives, what happens when its core runs out of hydrogen, and how a cluster of stars tells its own age. |
| 13 | Muons that live too long (`muons`) |  | awaiting fact check | Photos (no photos chosen yet) | Why light's speed is the same for everyone, why that makes moving clocks run slow, and how muons raining down a mountain prove it. |
| 14 | The Sun bends starlight (`bending`) |  | awaiting fact check | Photos (no photos chosen yet) | How gravity slows time, why that makes things fall and bends light, and how Mercury, an eclipse and the satellites in your phone test it. |
| 15 | Stars that shouldn't exist (`dead-stars`) |  | awaiting fact check | Photos (no photos chosen yet) | What holds up a dead star that has no fuel left, why a heavier white dwarf is smaller, and why no white dwarf can weigh more than about 1.4 Suns. |
| 16 | Little green men (`pulsars`) |  | awaiting fact check | Photos (no photos chosen yet) | How a graduate student found a clock in the sky, how she and her colleagues ruled out aliens, and why it had to be a spinning star made of neutrons. |
| 17 | Star stuff (`star-stuff`) |  | awaiting fact check | Photos (no photos chosen yet) | How stars build the elements, why fusion stops at iron, how heavy stars explode, and where the carbon, calcium and gold around you were made. |
| 18 | Dark stars (`dark-stars`) |  | awaiting fact check | Photos (no photos chosen yet) | Why enough mass in a small enough space traps light, what a black hole's horizon is and isn't, and how one was found. |
| 19 | Island universes (`island`) |  | awaiting fact check | Photos (no photos chosen yet) | How we found we are not at the centre of our galaxy, how the 1920 debate about the spiral nebulae was settled, and how a pulsing star measures distances to other galaxies. |
| 20 | Everything is running away (`running`) |  | awaiting fact check | Photos (no photos chosen yet) | How the redshifts of galaxies showed the universe is expanding, why that doesn't put us at the centre, and how the expansion gives the universe an age. |
| 21 | Brighter than a galaxy (`quasars`) |  | awaiting fact check | Photos (no photos chosen yet) | How a faint blue 'star' turned out to outshine whole galaxies, why the engine must be a giant black hole, and how one was found at the centre of our own galaxy. |
| 22 | Why is the night sky dark? (`dark-night`) |  | awaiting fact check | Photos (no photos chosen yet) | Why the darkness of night means the universe had a beginning, how the Big Bang beat the Steady State, and how the afterglow of the hot young universe was found. |
| 23 | Unseen mass or a wrong law? (`missing-mass`) |  | awaiting fact check | Photos (no photos chosen yet) | Why galaxies and clusters seem to hold far more mass than we can see, the case for dark matter against a change in the law of gravity, and why the answer is still open. |
| 24 | The speeding universe (`speeding`) |  | awaiting fact check | Photos (no photos chosen yet) | How exploding white dwarfs showed the expansion of the universe is speeding up, what dark energy is (and isn't known to be), and how it settled the puzzle of stars older than the universe. |
| 25 | Did time have a beginning? (`beginning`) |  | awaiting fact check | Photos (no photos chosen yet) | What Einstein's theory says about the first moment, why it predicts its own failure there, and what is well tested about the Big Bang and what isn't. |
| N1 | Why is summer hot? (`december`) | The sky from home | planned, listed as coming |  | Tilt, not distance: the seasons, and Seattle’s dark Decembers. |
| N2 | The changing Moon (`phases`) | The sky from home | planned, listed as coming |  | Phases, and why eclipses don’t come every month. |
| N3 | The Sun over the Olympics (`sun-path`) | The sky from home | planned, listed as coming |  | The Sun’s path through the year at 48° N. |
| N4 | Two tides a day (`tides`) | The sky from home | planned, listed as coming |  | Why the far side of the Earth bulges too, and springs and neaps. |
| N5 | Aurora over Whidbey (`aurora`) | The sky from home | planned, listed as coming |  | The solar wind and the May 2024 storm. |
| N6 | Meteors and comets (`meteors`) | The sky from home | planned, listed as coming |  | Halley’s return, and where the Perseids come from. |
| T1 | Galileo’s spyglass (`spyglass`) | Telescopes and invisible light | planned, listed as coming |  | Lenses, mirrors and light grasp. |
| T2 | Beyond the rainbow (`invisible`) | Telescopes and invisible light | planned, listed as coming |  | Infrared, radio and X-rays: light the eye can’t see. |
| T3 | Why telescopes go to space (`windows`) | Telescopes and invisible light | planned, listed as coming |  | The atmosphere’s windows. |
| T4 | Why stars twinkle (`seeing`) | Telescopes and invisible light | planned, listed as coming |  | Turbulent air and adaptive optics. |
| G1 | Volcanoes predicted three days early (`io`) | Gas giants and their moons | planned, listed as coming |  | Tidal heating of Jupiter’s moon Io. |
| G2 | Stripes and a storm (`stripes`) | Gas giants and their moons | planned, listed as coming |  | Why Jupiter is banded. |
| G3 | Rings made of pebbles (`rings`) | Gas giants and their moons | planned, listed as coming |  | Maxwell, Keeler and the Roche limit. |
| G4 | The planet that glows (`glow`) | Gas giants and their moons | planned, listed as coming |  | Jupiter’s inner heat. |
| G5 | Oceans under ice (`ice-oceans`) | Gas giants and their moons | planned, listed as coming |  | Europa and Enceladus. |
| G6 | Methane rain (`titan`) | Gas giants and their moons | planned, listed as coming |  | Titan, a world with weather. |
| X1 | A planet that shouldn’t be there (`wobble`) | Exoplanets | planned, listed as coming |  | 51 Pegasi b and the wobble method. |
| X2 | The dip (`dip`) | Exoplanets | planned, listed as coming |  | Transits and the Kepler telescope. |
| X3 | Planets we don’t have (`sub-neptunes`) | Exoplanets | planned, listed as coming |  | The commonest planets, and the radius valley. |
| X4 | Hot Jupiters (`hot-jupiters`) | Exoplanets | planned, listed as coming |  | Giant planets that moved. |
| X5 | Goldilocks (`goldilocks`) | Exoplanets | planned, listed as coming |  | Habitable zones and TRAPPIST-1. |
| X6 | Reading an atmosphere (`atmospheres`) | Exoplanets | planned, listed as coming |  | Starlight through a planet’s air. |
| R1 | Where the planets came from (`nebula`) | Rocky planets | planned, listed as coming |  | Spinning discs and the snow line. |
| R2 | Venus and the greenhouse (`venus`) | Rocky planets | planned, listed as coming |  | Why the planet next door is hotter than an oven. |
| R3 | Canals on Mars (`canals`) | Rocky planets | planned, listed as coming |  | Lowell’s canals and Mariner’s craters. |
| R4 | Why only Earth still has plates (`cooling`) | Rocky planets | planned, listed as coming |  | Small planets cool first. |
| R5 | The faint young Sun (`faint-sun`) | Rocky planets | planned, listed as coming |  | Why the early Earth didn’t freeze. |
| L1 | The Pale Blue Dot (`blue-dot`) | Life and the long view | planned, listed as coming |  | Earth from six billion kilometres. |
| L2 | Looking for life (`life-search`) | Life and the long view | planned, listed as coming |  | Viking, a Martian meteorite and biosignatures. |
| L3 | Where is everybody? (`fermi`) | Life and the long view | planned, listed as coming |  | Fermi’s question, Drake’s factors and messages in bottles. |
| L4 | The long future (`future`) | Life and the long view | planned, listed as coming |  | What happens to the Sun, the galaxy and the universe. |
| B1 | The chirp (`chirp`) | Black holes and gravitational waves | planned, listed as coming |  | Gravitational waves. |
| B2 | Black holes ain’t so black (`hawking`) | Black holes and gravitational waves | planned, listed as coming |  | Bekenstein’s entropy and Hawking radiation. |
| B3 | The information paradox (`information`) | Black holes and gravitational waves | planned, listed as coming |  | What happens to what falls in. |
| B4 | Photographing a shadow (`shadow`) | Black holes and gravitational waves | planned, listed as coming |  | The Event Horizon Telescope. |
| B5 | Faster than light? (`superluminal`) | Black holes and gravitational waves | planned, listed as coming |  | Quasar jets that seem to break the speed limit. |
| C1 | The first three minutes (`three-minutes`) | Cosmic beginnings | planned, listed as coming |  | Helium and deuterium from the Big Bang. |
| C2 | Ripples in the afterglow (`ripples`) | Cosmic beginnings | planned, listed as coming |  | Spots on the microwave sky and the shape of space. |
| C3 | The dark ages and the first stars (`first-stars`) | Cosmic beginnings | planned, listed as coming |  | The quasar light that went missing. |
| C4 | Before the Big Bang? (`before`) | Cosmic beginnings | planned, listed as coming |  | The horizon problem and inflation. |
| C5 | Nothing north of the North Pole (`no-boundary`) | Cosmic beginnings | planned, listed as coming |  | Hartle and Hawking’s no-boundary proposal. |
| C6 | Why do we remember the past? (`arrow`) | Cosmic beginnings | planned, listed as coming |  | The arrow of time and a smooth beginning. |
| C7 | Just six numbers (`six-numbers`) | Cosmic beginnings | planned, listed as coming |  | The numbers that shape a universe, and why they might be as they are. |

## Ecology <a id="ecology"></a>

`courses/ecology`, version 0.2 (beta, 2026-11-08). Lessons 1-10 had a Haiku student read-through (3 Nov); lessons 11-19 and branches H, N, T, M, S and W were written 4 Nov, each read by a Haiku student. 22 of 26 parked photos fetched and restored 4 Nov; Hubbard Brook weir, Lake 226, the Muir Glacier pair and a BDFFP fragment are still parked in tools/pending-photos.json (no free photo found). No encyclopedia links yet.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | How many kinds are there? (`kinds`) |  | awaiting fact check | Photos (no photos chosen yet) | How to estimate what you can’t count, and why no one knows how many species there are. |
| 2 | Why aren’t we knee-deep in elephants? (`elephants`) |  | awaiting fact check | Photos (no photos chosen yet) | How populations grow, why growth compounds, and what brings it to a stop. |
| 3 | The reindeer of St Matthew Island (`reindeer`) |  | awaiting fact check | Photos (no photos chosen yet) | Why a population can shoot past its ceiling and crash when its food is slow to grow back. |
| 4 | The hare and the lynx (`lynx`) |  | awaiting fact check | Photos (no photos chosen yet) | Why predators and prey rise and fall in cycles, and why fishing both can help the prey. |
| 5 | A drought on Daphne Major (`finches`) |  | awaiting fact check | Photos (no photos chosen yet) | What natural selection is, and how it was watched changing a population in a single year. |
| 6 | Gause’s bottles (`gause`) |  | awaiting fact check | Photos (no photos chosen yet) | Why two species can’t share one food in the same way, and how splitting it lets them live together. |
| 7 | The sea star experiment (`seastar`) |  | awaiting fact check | Photos (no photos chosen yet) | How one predator can keep many species on a shore, and what a keystone species is. |
| 8 | Why is the world green? (`green`) |  | awaiting fact check | Photos (no photos chosen yet) | How a predator can protect plants it never eats, and why food chains flip in alternation. |
| 9 | The ants that guard a tree (`acacia`) |  | awaiting fact check | Photos (no photos chosen yet) | What a mutualism is, what each partner pays, and how cheaters threaten it. |
| 10 | Why big fierce animals are rare (`pyramid`) |  | awaiting fact check | Photos (no photos chosen yet) | How energy passes up a food chain, why most of it ends as heat, and why that keeps chains short and top predators few. |
| 11 | The planet breathes (`breathes`) |  | awaiting fact check |  | Keeling’s curve, its yearly sawtooth and the carbon cycle as stocks and flows. |
| 12 | The forest that was cut on purpose (`hubbard`) |  | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Hubbard Brook, and how living plants hold a watershed’s nitrogen. |
| 13 | A curtain across a lake (`curtain`) |  | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Lake 226 and the nutrient that runs short. |
| 14 | Walking back in time (`glacier-bay`) |  | awaiting fact check |  | Glacier Bay and how new ground fills with life. |
| 15 | Is a forest an organism? (`gaps`) |  | awaiting fact check |  | Clements, Gleason and a forest grown gap by gap. |
| 16 | Boulders and fires (`fires`) |  | awaiting fact check |  | Why some disturbance keeps more kinds alive. |
| 17 | Humboldt’s mountain (`humboldt`) |  | awaiting fact check |  | Chimborazo, climate zones and why they move. |
| 18 | Islands that refilled (`islands`) |  | awaiting fact check |  | Mangrove islets, arrivals, losses and the species-area rule. |
| 19 | Half the Earth? (`half`) |  | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Habitat loss, extinction debt and how much to protect. |
| H1 | Eggs that broke (`eggs`) | People in the web | awaiting fact check |  | Peregrines, DDT and poisons that build up the food chain. |
| H2 | Arrivals (`arrivals`) | People in the web | awaiting fact check |  | Species carried to new places, and the few that take over. |
| H3 | The cod that didn’t come back (`cod`) | People in the web | awaiting fact check | Photos (no photos chosen yet) | Harvesting a stock, and a fishery that collapsed. |
| N1 | Trails that fade (`trails`) | Ants and other societies | awaiting fact check |  | How ants find the shortest path with no one in charge. |
| N2 | Why work for someone else’s children? (`kin`) | Ants and other societies | awaiting fact check | Photos (no photos chosen yet) | Hamilton’s rule and the sterile workers. |
| N3 | Farmers in the forest (`farmers`) | Ants and other societies | awaiting fact check |  | Leafcutter ants and their fungus gardens. |
| T1 | Stripes on the rocks (`stripes`) | Tide pools of the Salish Sea | awaiting fact check |  | Zones of a Salish Sea shore and what sets each edge. |
| T2 | The year the sea stars melted (`melted`) | Tide pools of the Salish Sea | awaiting fact check |  | Sea star wasting and the urchins that followed. |
| T3 | The otters came back (`otters`) | Tide pools of the Salish Sea | awaiting fact check |  | Sea otters on the outer coast of Washington. |
| M1 | Survivors under the snow (`under-snow`) | Mount St Helens | awaiting fact check |  | What lived through the 1980 blast at Mount St Helens. |
| M2 | Lupine on the pumice (`lupine`) | Mount St Helens | awaiting fact check |  | The first plants on the Pumice Plain. |
| M3 | Spirit Lake (`spirit-lake`) | Mount St Helens | awaiting fact check |  | A lake that went dead and came back. |
| S1 | Why no trees? (`no-trees`) | The dry side | awaiting fact check |  | The shrub-steppe of the dry side. |
| S2 | Cheatgrass and fire (`cheatgrass`) | The dry side | awaiting fact check |  | An annual grass that changed a fire cycle. |
| S3 | The prairie under the wheat (`palouse`) | The dry side | awaiting fact check |  | The Palouse prairie and what is left of it. |
| W1 | Salmon in the trees (`salmon-trees`) | Salmon and Lake Washington | awaiting fact check |  | Ocean nitrogen carried up rivers by salmon. |
| W2 | After the dams came down (`elwha`) | Salmon and Lake Washington | awaiting fact check |  | The Elwha River since 2014. |
| W3 | The lake Seattle saved (`lake-washington`) | Salmon and Lake Washington | awaiting fact check |  | Edmondson, sewage and a lake that cleared. |

## Botany <a id="botany"></a>

`courses/botany`, version 0.2 (beta, 2026-11-08). Lessons 1-10 had a Haiku student read-through (3 Nov); 11-21 and all branches (K, C, O) were written 4 Nov with one read-through each. No photos or encyclopedia links yet.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | The willow in the tub (`willow`) |  | awaiting fact check | Photos (no photos chosen yet) | Where a plant's mass comes from: mostly the air, a little water, almost none from the soil. |
| 2 | Restoring the air (`air`) |  | awaiting fact check | Photos (no photos chosen yet) | That plants make oxygen only in light but breathe all the time, and how a leaf's balance sets where it can live. |
| 3 | Why leaves are green (`green`) |  | awaiting fact check | Photos (no photos chosen yet) | Which colours of light leaves use, why they still look green, and what happens to the green in autumn. |
| 4 | Where the oxygen comes from (`oxygen`) |  | awaiting fact check | Photos (no photos chosen yet) | That the oxygen plants give off comes from splitting water, and how carbon dioxide is turned into sugar in a cycle. |
| 5 | Boxes full of water (`cells`) |  | awaiting fact check | Photos (no photos chosen yet) | What plant cells are, how water moves into them by osmosis, and how its pressure holds a soft plant up. |
| 6 | Higher than a pump can lift (`xylem`) |  | awaiting fact check | Photos (no photos chosen yet) | How trees lift water a hundred metres by pulling it, under tension, through dead pipes. |
| 7 | The pores on old herbarium sheets (`stomata`) |  | awaiting fact check | Photos (no photos chosen yet) | How leaves trade water for carbon dioxide through their pores, and how a plant adjusts within its life. |
| 8 | Sour in the morning (`cam`) |  | awaiting fact check | Photos (no photos chosen yet) | Rubisco's mistake with oxygen, and the two ways plants get round it: the C4 pump and CAM's night shift. |
| 9 | The ring around the trunk (`phloem`) |  | awaiting fact check | Photos (no photos chosen yet) | How sugar moves through a plant in the phloem, pushed by osmotic pressure from where it's made to where it's used. |
| 10 | Peas in sterile sand (`peas`) |  | awaiting fact check | Photos (no photos chosen yet) | What plants take from the soil, why fertiliser isn't food, and how peas get nitrogen from the air with the help of bacteria. |
| 11 | The plant with no green (`pale`) |  | awaiting fact check | Photos (no photos chosen yet) | How root fungi trade phosphorus and water for a plant's sugar, and how some plants with no chlorophyll cheat on the trade. |
| 12 | The spiral in the pine cone (`spiral`) |  | awaiting fact check | Photos (no photos chosen yet) | How plants grow longer only near their tips, and how one rule for placing each new leaf makes Fibonacci spirals. |
| 13 | The bending seedling (`bending`) |  | awaiting fact check | Photos (no photos chosen yet) | How a shoot bends toward light: the tip senses it, and a hormone, auxin, makes the shaded side grow faster. |
| 14 | The foolish seedling (`foolish`) |  | awaiting fact check | Photos (no photos chosen yet) | Gibberellin, the hormone that lengthens stems, found through a rice disease, and the short wheat and rice of the Green Revolution. |
| 15 | The plant in the cupboard (`cupboard`) |  | awaiting fact check | Photos (no photos chosen yet) | How plants keep time with an inner clock, time the night to know the season, and read red and far-red light to tell sun from shade. |
| 16 | Rings that tell time (`rings`) |  | awaiting fact check | Photos (no photos chosen yet) | How the cambium under the bark makes a ring of wood each year, and how matching patterns of wide and thin rings dates old timber. |
| 17 | Plants without leaves (`rhynie`) |  | awaiting fact check | Photos (no photos chosen yet) | How plants came onto land, what they had to solve there, and the two generations in the life of a moss, a fern and a pine. |
| 18 | The comet orchid (`orchid`) |  | awaiting fact check | Photos (no photos chosen yet) | What flowers are for, how they make animals carry pollen, the double fertilisation that makes a seed and fruit, and a moth Darwin predicted forty years early. |
| 19 | Travelling and waiting (`seeds`) |  | awaiting fact check | Photos (no photos chosen yet) | How seeds travel by wind, water and animals, why many wait in the soil for a cue, and why waiting pays when years are unpredictable. |
| 20 | The caterpillar’s menu (`menu`) |  | awaiting fact check | Photos (no photos chosen yet) | How plants defend themselves with poisons, spines and toughness, what defence costs, and how specialist insects beat one family's poisons and use them to find their food. |
| 21 | Darwin’s abominable mystery (`abominable`) |  | awaiting fact check | Photos (no photos chosen yet) | How quickly flowering plants spread, how their family tree is read from DNA and why it overturned some groupings by looks, Amborella, and telling monocots from eudicots. |
| K1 | Counting stamens (`stamens`) | Naming and keying plants | awaiting fact check | Photos (no photos chosen yet) | Linnaeus's system of sorting plants by counting stamens, the two-word names that outlived it, how to read a plant's name, and why names and families still change. |
| K2 | Using a key (`key`) | Naming and keying plants | awaiting fact check | Photos (no photos chosen yet) | How to name an unknown plant with a chain of either-or questions or a key you can enter anywhere, the words keys use, and what to note in a field notebook. |
| K3 | Ten families to know (`families`) | Naming and keying plants | awaiting fact check | Photos (no photos chosen yet) | The signatures of ten flowering-plant families that make up much of what grows in a temperate field or garden, and how to tell grasses, sedges and rushes apart. |
| K4 | The deadly look-alikes (`look-alikes`) | Naming and keying plants | awaiting fact check | Photos (no photos chosen yet) | Camas and death camas, and poison hemlock, water hemlock and Queen Anne's lace: how botanists tell them apart, and why this course gives no advice on eating wild plants. |
| C1 | Mendel’s peas (`mendel`) | Crops and breeding | awaiting fact check | Photos (no photos chosen yet) | How Gregor Mendel's counts of pea plants showed that traits are passed on as particles, one copy from each parent, why short plants vanish and come back in a quarter of the next generation, and what the short gene does. |
| C2 | Corn has no wild ancestor (`corn`) | Crops and breeding | awaiting fact check | Photos (no photos chosen yet) | How maize was made from teosinte, a Mexican grass that looks nothing like it, how George Beadle and later DNA showed it, and how a few genes made the biggest changes. |
| C3 | Wheat on the Palouse (`wheat`) | Crops and breeding | awaiting fact check | Photos (no photos chosen yet) | How eastern Washington grows high wheat yields without irrigation: winter wheat and its need for cold, Orville Vogel's short wheats, storing water in fallow fields, and the soil it has cost. |
| C4 | Every Red Delicious is one tree (`apples`) | Crops and breeding | awaiting fact check | Photos (no photos chosen yet) | Why an apple seed almost never grows the apple it came from, how grafting copies a tree by joining cambium to cambium, how rootstocks set a tree's size, and the apples of Washington. |
| O1 | Snap traps and sticky leaves (`traps`) | Odd plants | awaiting fact check | Photos (no photos chosen yet) | Why plants of nitrogen-poor bogs catch insects, how a sundew tells food from grit, and how a Venus flytrap counts touches and snaps shut faster than water can move. |
| O2 | Plants that steal (`steal`) | Odd plants | awaiting fact check | Photos (no photos chosen yet) | Parasitic plants that tap other plants' xylem and phloem: dodder, which finds its host by smell, mistletoes that fire their seeds, and witchweed, which waits for a crop's root to call. |
| O3 | The heaviest living thing (`giant`) | Odd plants | awaiting fact check | Photos (no photos chosen yet) | Pando, a grove of aspen that is one plant, what counts as one living thing, the other contenders for biggest, how tall a tree can grow, and why Pando is shrinking. |
| O4 | Flowers that make heat (`heat`) | Odd plants | awaiting fact check | Photos (no photos chosen yet) | How skunk cabbage, the sacred lotus and titan arum burn sugar to warm their flowers, how a lotus flower holds its temperature like a thermostat, and what the warmth is for. |

## Synthesizers <a id="synthesizers"></a>

`courses/synthesizers`, version 0.3 (beta, 2026-11-08). Lessons are built on the live synth; its 28 photos of instruments and people were fetched and restored on 4 Nov. Student read-through of all 30 lessons and revisions done 7 Nov; all queued for a Gemini copy edit. For the fact check: bells says Stanford licensed FM to Yamaha in 1973 while its timeline says 1975.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | The clarinet and the flute (`timbre`) |  | awaiting fact check |  | Timbre: a note is a stack of harmonics, and the wave's shape decides which ones. |
| 2 | The buzz in your throat (`vowels`) |  | awaiting fact check |  | The filter: a bright buzz with harmonics taken away, as your mouth does to make vowels. |
| 3 | The bell with its start cut off (`tape`) |  | awaiting fact check |  | The envelope: how a note starts, holds and ends shapes what instrument we think it is. |
| 4 | Why singers wobble (`vibrato`) |  | awaiting fact check |  | The LFO: a slow oscillator that turns a knob for you, for vibrato, wah and tremolo. |
| 5 | Counting beats (`beats`) |  | awaiting fact check |  | Two oscillators: beating, detune, thickness, and the intervals of music. |
| 6 | The accidental bell (`bells`) |  | awaiting fact check |  | FM: a vibrato so fast it becomes new harmonics, and why bells clang. |
| 7 | The torn speaker (`fuzz`) |  | awaiting fact check |  | Drive: clipping a wave adds harmonics, and why distorted guitars play power chords. |
| 8 | Echoes on purpose (`echo`) |  | awaiting fact check |  | Echo: the speed of sound, slapback, delay times in step with the beat, and repeats. |
| 9 | Does the order matter? (`order`) |  | awaiting fact check |  | The signal chain: why filters and echoes can be swapped but drive can't (linearity). |
| 10 | The silent key (`silent`) |  | awaiting fact check |  | Signal flow, gate and trigger, the blank patch, and what to turn first when a key makes no sound. |
| 11 | Wind from nothing (`noise`) |  | awaiting fact check |  | Noise, and low-pass, band-pass and high-pass filters: surf, wind and a telephone voice. |
| 12 | A drum with no drum (`drums`) |  | awaiting fact check |  | An envelope sent to pitch instead of volume: a kick and a snare built from nothing. |
| 13 | The computer that burbles (`random`) |  | awaiting fact check |  | LFO shapes, sample-and-hold, tempo sync and retrigger. |
| 14 | The envelope that wouldn't stop (`cycle`) |  | awaiting fact check |  | A second envelope that loops: rise, fall, and once-a-note, looping or free-running modes. |
| 15 | The invisible patch cord (`matrix`) |  | awaiting fact check |  | The modulation matrix: sources, destinations, amounts that go both ways, key tracking. |
| 16 | Leaning on a note (`pressure`) |  | awaiting fact check |  | Velocity, pressure and the touch strip, and where each one is routed. |
| 17 | The slide (`glide`) |  | awaiting fact check |  | Mono, legato, glide and retrigger: notes that slide into each other. |
| 18 | Four fingers, one filter (`voices`) |  | awaiting fact check |  | Paraphonic and unison voices, voice stealing, and chords from one key. |
| 19 | One hand, many notes (`arp`) |  | awaiting fact check |  | The arpeggiator: modes, octave range, rate, swing and hold. |
| 20 | The bass line nobody played (`sequencer`) |  | awaiting fact check |  | The step sequencer: rests, ties, slide and accent, from Moroder to the TB-303. |
| 21 | Knobs that remember (`lanes`) |  | awaiting fact check |  | Recorded knob moves in a sequence, and controlled randomness. |
| 22 | Same knob, different job (`macros`) |  | awaiting fact check |  | Oscillator engines whose three knobs change meaning: morph, wavefolder and supersaw. |
| 23 | The blank patch (`blank`) |  | awaiting fact check |  | Five sounds built from a blank patch, saved and recalled; what this course leaves out. |
| O1 | Scanning through tables (`tables`) | Other oscillators | awaiting fact check |  | Wavetables: a stack of waves scanned by an envelope or LFO. |
| O2 | Organs by telephone (`organ`) | Other oscillators | awaiting fact check |  | Additive synthesis: the Telharmonium, Hammond drawbars and a sound built from sines. |
| O3 | A string from a delay line (`pluck`) | Other oscillators | awaiting fact check |  | Physical models: Karplus and Strong’s plucked string, and struck bars and bells. |
| O4 | The talking synth (`vocoder`) | Other oscillators | awaiting fact check |  | Formants, speech engines and Homer Dudley’s vocoder. |
| O5 | Wagon wheels and aliasing (`samples`) | Other oscillators | awaiting fact check |  | Sampling, Nyquist and why a recording played faster turns into a chipmunk. |
| O6 | Crumbs of sound (`grains`) | Other oscillators | awaiting fact check |  | Granular synthesis: grain size, density and position. |
| S1 | Sabine’s lecture hall (`rooms`) | Around the synth | awaiting fact check |  | Reverb: how a room answers, and the plates and springs that fake one. |

## Money That Lasts <a id="finance"></a>

`courses/finance`, version 0.3 (beta, 2026-11-08). Money That Lasts. Outline v2: https://claude.ai/artifact/DET1mpVWYLfSQDCU9bWzsg. US federal rules for 2026, Washington and Portugal in branches; every lesson carries a not-personal-advice note with the rules year. All 32 lessons (trunk 1-14, P, W, T, E, C, H, S) written 4 Nov 2026; student read-through and revisions done 7 Nov, all queued for a Gemini copy edit. Fact check: every 2026 number marked 'check' in src/data/rules-2026.json against irs.gov, ssa.gov, dor.wa.gov and the Portuguese tables; above all the result of Initiative 645 (3 Nov 2026) on WA's tax on incomes over $1M, the 2026 WA gains deduction (2025's $278,000 used), whether the WA estate exclusion is indexed, the AMT 28 percent line, Portugal's treatment of Social Security and Roth IRAs, the household-model figures quoted in filling-brackets ($780,000 more to heirs) and capstone, Portugal's tax on a $32,200 pension (about $2,400 in portugal-residency), WA's March 2026 estate-rate law, and SECURE/Medicare details added in the read-through revisions.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | Why the savings rate beats the return (`savings-rate`) |  | awaiting fact check |  | How the share of income saved sets the years until savings can cover spending, and why income and returns matter less. |
| 2 | Where 4 percent came from (`four-percent`) |  | awaiting fact check |  | Bengen's rule and the Trinity study, run on every start since 1871, and what a success rate does and doesn't measure. |
| 3 | The same average, a different order (`sequence`) |  | awaiting fact check |  | Sequence-of-returns risk: why the order of returns matters once you are spending, and why the first decade decides most of a retirement. |
| 4 | A fifty-year retirement (`long-retirement`) |  | awaiting fact check |  | How the safe withdrawal rate falls as retirement lengthens, what most long retirements end with, and how much the price of shares at the start tells you. |
| 5 | Spending rules that bend (`flexible-spending`) |  | awaiting fact check |  | Withdrawal rules that adjust spending to the markets (a share of the balance, guardrails, variable percentage withdrawal, a floor and ceiling) and what each trades away; floors from annuities and bond ladders. |
| 6 | Stocks, bonds and the glide path (`allocation`) |  | awaiting fact check |  | What bonds do in a portfolio that is being spent, why all-bond portfolios failed, how glide paths (falling, rising and the bond tent) fared in history, and the Japan warning. |
| 7 | How a federal return stacks (`brackets`) |  | awaiting fact check |  | How the brackets fill from the bottom, why long-term gains stacked on top can be taxed at 0 percent, and why the rate on the next dollar can differ from the bracket. |
| 8 | Four buckets (`accounts`) |  | awaiting fact check |  | Pre-tax, Roth, HSA and taxable accounts compared by the tax rate on the way in and on the way out, why pre-tax often wins for someone with low-income years ahead, and the 2026 limits. |
| 9 | Money before 59 and a half (`early-access`) |  | awaiting fact check |  | The ways to reach retirement-account money before 59½ without the 10 percent penalty (Roth contributions, a Roth conversion ladder, the rule of 55, 72(t) payments, 457(b) plans) and how a taxable account bridges the gap. |
| 10 | Filling the low brackets (`filling-brackets`) |  | awaiting fact check |  | Why low-income years are worth using on purpose: Roth conversions and 0 percent gains up to the top of a bracket, how the two compete for the same space, and what filling saves over a lifetime. |
| 11 | Health insurance before 65 (`aca`) |  | awaiting fact check |  | How ACA marketplace premium credits work as a tax on income, the 400 percent cliff in 2026, what counts as income for them, and how to plan income in the years before Medicare. |
| 12 | Which account to spend first (`withdrawal-order`) |  | awaiting fact check |  | Withdrawal order over a whole retirement: why the textbook order can cost more, required withdrawals, the Social Security tax torpedo, Medicare's income surcharge and the survivor's single brackets. |
| 13 | Social Security, worked out (`social-security`) |  | awaiting fact check |  | How the benefit is worked out from 35 years of earnings and the bend points, what stopping work early costs, how claiming age changes it, survivors' benefits, and delay as the cheapest inflation-linked income. |
| 14 | Build the plan (`capstone`) |  | awaiting fact check |  | Putting the course together for one household: a spending rate, a bridge, a yearly income target, Social Security timing, and a test against every stretch of US history. |
| P1 | Becoming a Portuguese tax resident (`portugal-residency`) | Portugal | awaiting fact check |  | When Portugal taxes you, how its income tax is built and how steeply it climbs, and what replaced the old tax break for new residents. |
| P2 | Two tax systems on one income (`portugal-two-countries`) | Portugal | awaiting fact check |  | How the US and Portugal share the tax on an American living in Portugal, what happens to each kind of US account, and the paperwork that comes with money in two countries. |
| P3 | Health, homes and heirs in Portugal (`portugal-life`) | Portugal | awaiting fact check |  | What health care costs an American in Portugal and what happens to Medicare, the taxes on buying, owning and selling a home, and what heirs pay. |
| W1 | What Washington taxes instead (`wa-taxes`) | Washington | awaiting fact check |  | Washington's taxes on a household with no state income tax: sales and property tax, the 7 percent tax on long-term gains, the coming tax on incomes above $1 million, and what changes when you move states. |
| W2 | Apple Health and Cascade Care (`wa-health`) | Washington | awaiting fact check |  | Washington's health cover for people under 65: Apple Health below 138 percent of the poverty line with no asset test, the state's own premium help above it, and what the state can recover from an estate. |
| W3 | WA Cares and the estate tax (`wa-estate`) | Washington | awaiting fact check |  | Washington's payroll premium for long-term care and what it pays, and the state estate tax, which starts at $3 million and isn't shared between spouses. |
| T1 | Where to hold what (`asset-location`) | Taxable-account craft | awaiting fact check |  | Which investments belong in pre-tax, Roth and taxable accounts, why, and how much the right placement is worth. |
| T2 | Harvesting losses and gains (`harvesting`) | Taxable-account craft | awaiting fact check |  | Selling at a loss to bank a deduction, the wash-sale rule, choosing which lots to sell, and selling at a gain in years when the rate is 0 percent. |
| T3 | Giving and heirs (`giving-heirs`) | Taxable-account craft | awaiting fact check |  | The step-up in basis at death, why each kind of account is worth a different amount to an heir, giving appreciated shares, donor-advised funds and gifts from an IRA after 70 and a half. |
| E1 | The mega backdoor and the pro-rata rule (`mega-backdoor`) | Equity pay and big-company plans | awaiting fact check |  | How high earners put money into Roth accounts above the income limits: the backdoor Roth IRA, the pro-rata rule that can spoil it, and after-tax 401(k) contributions converted to Roth. |
| E2 | RSUs and ESPP (`rsus-espp`) | Equity pay and big-company plans | awaiting fact check |  | How restricted stock units are taxed when they vest, why the tax withheld often falls short, when to sell, and how an employee stock purchase plan's discount is taxed. |
| E3 | Options and the AMT (`options`) | Equity pay and big-company plans | awaiting fact check |  | How non-qualified and incentive stock options are taxed, the alternative minimum tax that incentive options can trigger, and the 83(b) election on early exercise. |
| C1 | Two people, one plan (`filing-status`) | Couples and heirs | awaiting fact check |  | When marriage raises or lowers a couple's tax, how unmarried partners are treated for tax and health credits, and the higher tax a survivor pays on the same savings. |
| C2 | Beneficiaries and inherited accounts (`beneficiaries`) | Couples and heirs | awaiting fact check |  | Why beneficiary forms override wills, the choices a surviving spouse has with an IRA, the ten-year rule for other heirs, and how to withdraw an inherited IRA with the least tax. |
| H1 | Medicare and IRMAA (`medicare`) | Health after 65 | awaiting fact check |  | What Medicare's parts cover and cost, when to enrol and the penalties for missing it, and the income surcharges set two years in advance. |
| H2 | Long-term care (`long-term-care`) | Health after 65 | awaiting fact check |  | How likely long-term care is and what it costs, what Medicare and Medicaid pay, and the choice between insurance and paying for it from savings. |
| S1 | Coast, part-time and partial (`coast`) | Other shapes | awaiting fact check |  | How a little earned income after leaving full-time work raises the spending a portfolio can sustain, the coast number that lets saving stop early, and what part-time pay does to taxes and health credits. |
| S2 | The house (`housing`) | Other shapes | awaiting fact check |  | Paying off a mortgage against investing, what a paid-off house does to taxes and health credits, the tax-free gain on selling a home, Washington's tax on sales, and drawing on the house late in life. |

## Fungi <a id="fungi"></a>

`courses/fungi`, version 0.3 (beta, 2026-11-08). Fungi: Threads in the dark. Outline: https://claude.ai/artifact/3um9m4dasG3fu9D8U2Vthh (approved by Rob 4 Nov 2026, with one lesson on parasites and no photos of disease). Lessons are being written from 4 Nov; figures are drawn, photos come later (iNaturalist allowed, including CC BY-NC).

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | The ring in the meadow (`rings`) |  | awaiting fact check | Photos (no photos chosen yet) | A mushroom is only the fruit of a hidden net of threads; a fairy ring is one fungus spreading outward for centuries. |
| 2 | Closer to us than to plants (`kingdom`) |  | awaiting fact check | Photos (no photos chosen yet) | Why fungi are a kingdom of their own: chitin walls, digestion outside the body, and DNA that puts them beside animals. |
| 3 | Eating from the outside (`tips`) |  | awaiting fact check | Photos (no photos chosen yet) | How a hypha grows at its tip, digests food outside itself, and how a mycelium searches and moves food. |
| 4 | Seven trillion spores (`spores`) |  | awaiting fact check | Photos (no photos chosen yet) | How fungi spread by spores, how gills launch them, and why most land close while a few cross oceans. |
| 5 | Twenty thousand sexes (`sexes`) |  | awaiting fact check | Photos (no photos chosen yet) | Mating types, fused threads and the two-nucleus stage of a mushroom's life. |
| 6 | Sacs and clubs (`groups`) |  | awaiting fact check | Photos (no photos chosen yet) | The main groups of fungi told apart by how they make spores. |
| 7 | The yeast that wastes its sugar (`yeast`) |  | awaiting fact check | Photos (no photos chosen yet) | Single-celled fungi, fermentation, and why yeast makes alcohol even with oxygen. |
| 8 | The gap in the coal (`rot`) |  | awaiting fact check | Photos (no photos chosen yet) | How fungi rot wood, white rot and brown rot, and whether the late arrival of lignin-breaking fungi explains the age of coal. |
| 9 | Do trees share through fungi? (`network`) |  | awaiting fact check | Photos (no photos chosen yet) | The two kinds of root fungi and what the evidence shows about carbon passing between trees. |
| 10 | A lichen is two (or three) (`lichens`) |  | awaiting fact check | Photos (no photos chosen yet) | A fungus farming algae, and how drying out and waking lets lichens live on bare rock. |
| 11 | The spoiled plate (`mould`) |  | awaiting fact check | Photos (no photos chosen yet) | Why moulds make antibiotics, how penicillin was found and made into a medicine, and what fungi's other chemicals do. |
| 12 | Foxfire (`glow`) |  | awaiting fact check | Photos (no photos chosen yet) | Fungi that glow in the dark: how the light is made, and the experiment that asked what it is for. |
| 13 | Fungi that hunt (`hunters`) |  | awaiting fact check | Photos (no photos chosen yet) | Fungi that trap worms in soil and take over insects, and what happens when such a fungus reaches animals with no defence. |
| 14 | How big is one fungus? (`individual`) |  | awaiting fact check | Photos (no photos chosen yet) | What counts as one fungus, and how genetic markers revealed single fungi covering whole forests. |
| 15 | The trunk with no tree (`prototaxites`) |  | awaiting fact check | Photos (no photos chosen yet) | Prototaxites, an eight-metre fossil from the first land ecosystems, and how its identity has been argued from clues for over 165 years. |
| 16 | A log's afterlife (`log`) |  | awaiting fact check | Photos (no photos chosen yet) | How a fallen tree is taken apart by a succession of fungi over decades, and what the log gives the forest on the way. |
| L1 | The lichens that left the city (`bark`) | More lichens | awaiting fact check | Photos (no photos chosen yet) | How lichens vanished from smoky cities, how they were used to map sulphur in the air, and how they came back once the smoke ended. |
| L2 | Dating a moraine by its lichens (`lichenometry`) | More lichens | awaiting fact check | Photos (no photos chosen yet) | How the slow, steady growth of crust lichens is used to date rock laid bare by retreating glaciers. |
| L3 | Gardens in the canopy (`canopy`) | More lichens | awaiting fact check | Photos (no photos chosen yet) | The nitrogen-fixing lichens high in old Douglas-firs, what they add to the forest, and why young forests lack them. |
| N1 | The autumn flush (`flush`) | Northwest fungi | awaiting fact check | Photos (no photos chosen yet) | Why Northwest mushrooms come up after the first soaking autumn rain and stop with hard frost, and how fruiting seasons are shifting. |
| N2 | Gophers on the pumice (`pumice`) | Northwest fungi | awaiting fact check | Photos (no photos chosen yet) | How root fungi came back to the bare pumice of Mount St Helens after 1980, carried by gophers, wind and elk, and why plants waited for them. |
| N3 | The squirrel, the truffle and the owl (`truffles`) | Northwest fungi | awaiting fact check | Photos (no photos chosen yet) | Underground truffles, the flying squirrels that dig them up and spread their spores, and the owls that eat the squirrels. |
| M1 | A spore print and a microscope (`spore-print`) | Looking closely | awaiting fact check | Photos (no photos chosen yet) | How mycologists examine a fungus: spore prints, gills and spores under the microscope, and why they measure many spores. |
| M2 | Names written in DNA (`barcode`) | Looking closely | awaiting fact check |  | Naming fungi by a short DNA barcode, and how sequencing soil found whole groups of fungi that no one had seen. |
| M3 | How many kinds of fungi? (`how-many`) | Looking closely | awaiting fact check | Photos (no photos chosen yet) | About 150,000 kinds named against 2 to 4 million estimated, how that estimate is made, and where the unnamed fungi are. |

## Rivers and the Salish Sea <a id="rivers"></a>

`courses/rivers`, version 0.2 (beta, 2026-11-08). Rivers and the Salish Sea: why the water does what it does. Outline revised after a five-reader panel on 7 Nov 2026 (project files rivers/outline.md, reviews in rivers/review-2026-11-07/). Every lesson had one student read-through and a revision; the writers' uncertain facts are listed in rivers/writer-notes.md for the fact check. Photos are parked in tools/pending-photos.json.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | Which sea does a raindrop reach? (`watershed`) |  | awaiting fact check | Photos (2 photos parked in pending-photos.json) | Watersheds and divides, where rain goes once it lands, and snow as a reservoir. |
| 2 | The same storm, twice the flood (`floods`) |  | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Discharge, the river gauge and its hydrograph, rain on snow, and what a "100-year flood" means. |
| 3 | Where August's river comes from (`baseflow`) |  | awaiting fact check | Photos (2 photos parked in pending-photos.json) | Groundwater in the spaces between grains, Darcy's law, baseflow, and gaining and losing streams. |
| 4 | Why the river runs brown in November (`sediment`) |  | awaiting fact check |  | What a river carries, the speed a grain needs to move (Hjulström), and the Elwha's century of trapped sediment. |
| 5 | The river that changed its mind (`meanders`) |  | awaiting fact check |  | Why bends grow and cut off, braided and meandering rivers, log jams and avulsion. |
| 6 | Why the bottom of the lake stays cold (`lake`) |  | awaiting fact check |  | Density and temperature, a lake's layers, Lake Washington's one winter mixing, and seiches. |
| 7 | What a wave knows about the wind (`waves`) |  | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Waves carry energy, not water; fetch and duration, chop and swell, wave speed in deep and shallow water, and waves against a current. |
| 8 | Two tides a day (`tides`) |  | awaiting fact check |  | Why the Moon raises two bulges, the Sun's share, and spring and neap tides. |
| 9 | Why one low tide is lower (`inequality`) |  | awaiting fact check |  | The Moon's tilt, the tide as a sum of regular waves, Kelvin's tide-predicting machine, and why summer's lowest tides come in daylight. |
| 10 | Why Olympia's tide is nearly twice Port Townsend's (`olympia`) |  | awaiting fact check | Photos (2 photos parked in pending-photos.json) | The tide as a long wave, its speed in shallow water, a basin that resonates, king tides and rising sea level. |
| 11 | Why Deception Pass runs at eight knots (`narrows`) |  | awaiting fact check |  | Currents driven by a difference in level, and why slack water comes after high water. |
| 12 | Why the Sound stays cold in July (`estuary`) |  | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Salt and density, the two-layer exchange over the sills, renewal at neap tides, upwelling, and the salt wedge at a river mouth. |
| 13 | Why Hood Canal runs out of breath (`hoodcanal`) |  | awaiting fact check | Photos (2 photos parked in pending-photos.json) | A fjord's slow flushing, and how new ocean water lifts the old water to the surface. |
| 14 | Where the beach comes from (`beach`) |  | awaiting fact check | Photos (2 photos parked in pending-photos.json) | Feeder bluffs, longshore drift and spits, what a bulkhead does, and the Elwha's sand returning. |
| 101 | The hill that drained a reservoir (`cedar`) | seattle | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Where Seattle's water comes from, and the Masonry Dam's leak through glacial gravel in 1918. |
| 102 | The summer Lake Washington fell (`lowering`) | seattle | awaiting fact check | Photos (1 photo parked in pending-photos.json) | The 1916 lowering, the vanished Black River, and the locks that keep the salt out. |
| 103 | Straightening the Duwamish (`duwamish`) | seattle | awaiting fact check |  | How a meandering estuary became a waterway, and the rivers that were moved away from it. |
| C1 | The falls that went under (`celilo`) | The Columbia | awaiting fact check |  | The Columbia turned into a stair of reservoirs, and Celilo Falls drowned in 1957. |
| C2 | The town behind the embankment (`vanport`) | The Columbia | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Vanport, 1948: levees, a snowmelt flood and a regulated river. |
| C3 | The bar at the mouth (`bar`) | The Columbia | awaiting fact check | Photos (2 photos parked in pending-photos.json) | Where the Columbia meets the Pacific swell, and why the bar is one of the most dangerous in the world. |
| F1 | Reading a tide table and a current table (`tables`) | In the field | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Planning a beach walk at a minus tide and a crossing at slack water. |
| F2 | Measuring a creek (`gauge`) | In the field | awaiting fact check |  | An orange, a stopwatch and a USGS gauge page: discharge measured by hand. |

## Bats <a id="bats"></a>

`courses/bats`, version 0.2 (beta, 2026-11-08). Bats: seeing with sound. Outline v2 (7 Nov 2026), revised after a biologist, teacher, explainer and student review: project files bats/outline.md and bats/review-2026-11-07/. All 15 lessons (trunk 1-10, branches L, N, P) written 7 Nov 2026 with live figures; student read-through and revisions done the same day; queued for Gemini. Photos are queued in tools/pending-photos.json with search hints (none verified); calls are synthesised from published parameters.

| Code | Lesson | Branch | Status | Also waiting on | What it covers |
| --- | --- | --- | --- | --- | --- |
| 1 | How does a bat fly in the dark? (`dark`) |  | awaiting fact check |  | Spallanzani's and Jurine's experiments, why nobody believed them for almost 150 years, and Pierce and Griffin hearing bats' calls in 1938. |
| 2 | A hand with skin between the fingers (`hand`) |  | awaiting fact check |  | What a bat is: a wing made of a hand, one mammal species in five, closer kin to horses and cats than to mice, and how wing shape sets where each bat hunts. |
| 3 | Why so high? (`ultrasound`) |  | awaiting fact check |  | Wavelength against the size of an insect, why higher calls find smaller prey but carry less far, and the two shapes of call: sweeps and steady tones. |
| 4 | The feeding buzz (`buzz`) |  | awaiting fact check | Photos (2 photos parked in pending-photos.json) | Why a bat calls faster as it closes on prey (it waits for each echo), the buzz at 200 calls a second, and brain cells that read distance from delay. |
| 5 | Twenty million voices (`crowds`) |  | awaiting fact check | Photos (1 photo parked in pending-photos.json) | The Doppler shift and how horseshoe bats lower their call to keep the echo in their sharpest hearing, and how bats in a crowd avoid jamming each other, or jam on purpose. |
| 6 | The moth that hears the bat (`moths`) |  | awaiting fact check |  | Moth ears with two cells, turning away and diving, tiger moths that click back and jam, and the bats that answer with whispers. |
| 7 | The winter fat budget (`winter`) |  | awaiting fact check | Photos (2 photos parked in pending-photos.json) | Torpor, how two grams of fat last a little brown bat the winter, why each waking costs so much, and how white-nose syndrome starves bats. |
| 8 | Long lives, slow births (`lives`) |  | awaiting fact check |  | Why bats live several times longer than mammals their size, one pup a year and slow recovery, and what bats and viruses really show. |
| 9 | Blood, nectar and fruit (`diets`) |  | awaiting fact check | Photos (2 photos parked in pending-photos.json) | Why vampire bats feed hungry roost-mates, how bats live on blood, nectar, fruit, fish and meat, and what nectar and fruit bats do for plants. |
| 10 | The way home (`home`) |  | awaiting fact check |  | How Egyptian fruit bats find home from places they have never been, big brown bats' compass set by the sunset, and migrating tree bats and wind turbines. |
| L1 | Hearing the unhearable (`heterodyne`) | Listening in | awaiting fact check | Photos (1 photo parked in pending-photos.json) | How a heterodyne detector mixes a bat's call down into hearing, how to tune one, and how to build one on a breadboard. |
| L2 | Reading a sonogram (`sonograms`) | Listening in | awaiting fact check | Photos (1 photo parked in pending-photos.json) | Frequency division and time expansion, the parts of a sonogram, and telling Washington's bats apart by the shape and pitch of their calls. |
| N1 | Dusk at Green Lake (`green-lake`) | Northwest bats | awaiting fact check |  | Who comes out when over a Seattle lake, high flyers and water skimmers, what they eat, and the season. |
| N2 | Washington's fifteen (`washington`) | Northwest bats | awaiting fact check |  | Washington's fifteen species, where they live and roost, the dry-side bats, and what a bat house needs. |
| P1 | Bats and people (`people`) | Bats and people | awaiting fact check |  | The 1943 bat bomb, Austin's bridge colony, guano and gunpowder, what bats are worth to farms, and what to do about a bat in the house. |

## Not started

| Course | What | Promise |
| --- | --- | --- |
| Light in the sky | bridge: Clouds + Astronomy | Blue sky, red sunsets, twinkling stars, halos and the green flash. |
| Photographing the sky | bridge: Clouds + Photography: Out of Auto | Exposing for clouds, polarisers, the light near sunset, time lapses. |
| Old weather in the rocks | bridge: Clouds + Geology | Fossil dunes, ice-age winds and rain shadows written in stone. |
| Rocks from the sky | bridge: Geology + Astronomy | Meteorites, craters and where the Moon came from. |
| From rock to soil | bridge: Geology + Dirt | Weathering, wind-blown loess and the till the glaciers left. |
| How a sensor counts light | bridge: Circuitry + Photography: Out of Auto | Photodiodes, gain and where noise comes from. |
| Building an oscillator | bridge: Circuitry + Synthesizers | A 555 timer, a capacitor and a speaker: the synth's first two modules on a breadboard. |
| People of the Salish Sea | candidate course (icon only) |  |
| Music Theory | candidate course (icon only) |  |
| PNW Forests | candidate course (icon only) |  |
| Water Life | candidate course (icon only) |  |
| The Home | candidate course (icon only) |  |
| The Bicycle | candidate course (icon only) |  |
| Radio | candidate course (icon only) |  |
| Cities | candidate course (icon only) |  |
