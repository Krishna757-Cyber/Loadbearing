# LoadBearing: 2:45 Video Demo Script

This script outlines the exact beats, clicks, spoken lines, and visible transitions for the hackathon video demonstration.

---

### [0:00 - 0:25] The Problem & Introduction
- **Visual**: Full-screen 3D Twilight Globe with dusk ambiance. The camera gently glides into place.
- **Narrator**: "In families spread across time zones, caring for elderly parents creates an invisible struggle. Planning piles up silently on one person, urgent tasks drop at night when caregivers are asleep, and remote siblings can't help with tasks that require someone physically present. This is **LoadBearing** — an Alexa+ MCP server and 3D globe where care is shared fairly, and nothing falls between people."
- **Action**: Hover over the three pillars: Priya in Pune (tallest pillar, 60%), Arjun in Berlin (18.6%), and Meera in Toronto (21.4%).

---

### [0:25 - 0:55] Spoken Capture & Follow-the-Sun Routing
- **Visual**: Priya's view (`View as: Priya`). The simulated Alexa+ voice surface is visible at the bottom.
- **Action**: Click the first sample phrase:
  > *"I researched clinics and booked Dadi's physiotherapy for Friday, but I can't arrange transport."*
- **Visual**:
  - Two blue contribution discs appear on Priya's pillar on the globe (one for research, one for booking).
  - Alexa+ speaks: *"I credited your research and booking. Transport is still open. Share this with Arjun and Meera?"*
- **Action**: Click **Share with Family**.
- **Visual**:
  - An arc of light flies from Pune to Berlin.
  - A pulsing amber token lands on Arjun's pillar.
  - Explanation appears: *"Arjun is awake in Berlin (18:30) and can coordinate transport."*

---

### [0:55 - 1:25] Doorstep Event & Local Presence
- **Visual**: Click **Demo (Key D)** to reveal the simulator drawer.
- **Action**: Click **Package Delivery**.
- **Narrator**: "Simulated front doorstep cameras detect a delivery on Dadi's porch. Because this requires physical presence, LoadBearing bypasses remote siblings and routes directly to local caregiver Meera in Toronto."
- **Visual**: A ripple emanates from Dadi's house marker in Toronto, and a task token hops to Meera's pillar.
- **Action**: Open Handoff Drawer (`Handoffs`). Meera is shown assigned with local time `12:30`.

---

### [1:25 - 1:50] Clock Sweeping & Daylight Terminator
- **Visual**: Top bar `ClockScrubber`.
- **Action**: Click `+6h` on the scrubber.
- **Narrator**: "As time moves forward, the global terminator sweeps across the world. Watch Pune enter night: Priya's pillar dims to Moon indigo with a sleep indicator, while Berlin and Toronto remain awake. Tasks captured during sleep hours automatically accrue a 2x time-zone tax."

---

### [1:50 - 2:15] Mutual Consent & The 3 of 3 Reveal
- **Visual**: Click on the **Privacy Chip** ("2 of 3 sharing").
- **Narrator**: "To prevent guilt and comparison, exact load shares and pillar heights remain private until all caregivers mutually agree to share."
- **Action**: Switch `View as: Priya`. Click the toggle to enable Priya's consent.
- **Visual**:
  - The privacy ring closes: **"3 of 3 sharing"** in green!
  - Ghost pillar outlines resolve into real, spring-animated light pillars revealing the complete picture.

---

### [2:15 - 2:35] Rebalance & Continuity Brief
- **Visual**: Navigate to the **Brief** view.
- **Action**: Click **Check Balance**.
  - A proposal appears suggesting that the next 2 planning tasks be routed to Arjun to relieve Priya.
  - Click **Approve 7-Day Rebalance**.
- **Action**: Click **Listen** on the Brief card.
  - Spoken Hindi audio plays: *"नमस्ते Dadi, पिछले 24 घंटों में परिवार ने 2 कार्यों को पूरा किया है... कोई भी ज़िम्मेदारी बिना देखरेख के नहीं छूटी।"*
  - Stats highlight: `Unowned: 0`.

---

### [2:35 - 2:45] Conclusion & Verification
- **Visual**: Quick cut to terminal running `npx @modelcontextprotocol/inspector`.
- **Narrator**: "Built on the official 2025-11-25 MCP specification over Streamable HTTP, powered by Amazon Bedrock and DynamoDB. LoadBearing ensures care is shared fairly, and no responsibility is left unowned."
