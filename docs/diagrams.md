# Halo diagrams

Diagrams moved out of the [README](../README.md). The architecture picture is in the README; these are the flows behind it.

## Architecture

*Everything that sees a face runs inside the phone's browser; the optional Worker only ever receives text or a short audio clip.*

```mermaid
flowchart LR
  subgraph PHONE["On the phone (browser)"]
    CAM["Camera"] --> DET["Face detection<br/>and embeddings"]
    DET --> MATCH["Matcher and tracker"]
    VAULT[("Encrypted IndexedDB vault<br/>names, notes, fingerprints")]
    MATCH <--> VAULT
    MATCH --> OUT["Whisper, voice, buzz<br/>and pocket mode"]
    SW["Service worker<br/>offline cache"]
  end
  CUT{{"Cut line: faces, photos and fingerprints stay left of here"}}
  subgraph EDGE["Optional Enhanced mode: one Cloudflare Worker"]
    R1["/api/session"]
    R2["/api/voice"]
    R3["/api/translate"]
    R4["/api/write"]
    R5["/api/transcribe"]
    AI["Workers AI"]
    R2 --> AI
    R3 --> AI
    R4 --> AI
    R5 --> AI
  end
  OUT -. "text only" .-> CUT
  CUT -.-> EDGE
```

## Privacy data flow

*What stays on the phone, what Enhanced mode sends (off by default), and what is never sent.*

```mermaid
flowchart TD
  subgraph STAYS["Stays on the phone"]
    A["Camera frames: analysed in memory, never stored"]
    B["Face fingerprints: AES-GCM encrypted in IndexedDB"]
    C["Names, notes, cues, today's list, one small thumbnail"]
  end
  subgraph SENT["Sent only in Enhanced mode, and logged in the on-phone ledger"]
    D["A whisper line to voice or translate"]
    E["A typed name and note, only if you ask the cloud to write a line"]
    F["A short audio clip, only for the optional voice note"]
  end
  subgraph NEVER["Never sent"]
    G["Faces"]
    H["Photos"]
    I["Face fingerprints"]
  end
  A --> B
  B --> C
  C -. "you opt in" .-> D
  C -. "you opt in" .-> E
  C -. "you opt in" .-> F
```

## Recognition flow

*One tracked face becomes Confident, Maybe or No match, and only Confident ever speaks.*

```mermaid
flowchart TD
  F["Camera frame"] --> T["Face tracked<br/>one track per face"]
  T --> M{"Match against"}
  M -->|"Whisper mode"| V["Everyone in the vault"]
  M -->|"Event mode"| L["Only today's list"]
  V --> S{"Over time, per track"}
  L --> S
  S -->|"Closer than the confident limit, at least 0.08 ahead of the runner-up,<br/>for 1 second and 5 frames, one of them frontal"| C["Confident"]
  S -->|"Close enough, but not yet sure"| Y["Maybe"]
  S -->|"No one close enough"| N["No match"]
  C --> C2["Halo, caption and whisper<br/>or a buzz code, or nothing for Never whisper"]
  Y --> Y2["Dotted ring and a hint, never spoken"]
  N --> N2["Faint outline, nothing said,<br/>fingerprint dropped"]
```

The limits come from `STATE_LIMITS` in [`src/lib/matcher.ts`](../src/lib/matcher.ts): a lead of 0.08 and five frames in both strictness levels, one second in Careful (distance under 0.42 for Confident, 0.5 for Maybe) and 0.9 seconds in Balanced (0.47 and 0.55).

## Add someone with their yes

*The person being added reads the line and agrees, photos are taken on your phone, and a helper card carries text only.*

```mermaid
sequenceDiagram
  participant H as Helper (optional)
  participant U as You
  participant P as Person being added
  H->>U: Helper card as a link, text only
  U->>U: Check the card, type the name and note
  U->>P: Hand over the phone
  P->>P: Read the exact line, tick "I'm [name], and I agree"
  Note over P,U: Not there? They answer by link on their own phone
  U->>U: Take 3 to 5 photos on your phone
  U->>U: Fingerprints and consent record saved to the encrypted vault
```

## Build pipeline

*From the Devpost skill pack's six steps, through nine verified slices and the test and design gates, to a Cloudflare Worker.*

```mermaid
flowchart LR
  S1["1-start<br/>learner profile"] --> S2["2-scope<br/>scope.md"]
  S2 --> S3["3-prd<br/>prd.md"]
  S3 --> S4["4-spec<br/>spec.md"]
  S4 --> S5["5-build<br/>nine slices"]
  S5 --> G{"Gates"}
  G --> T1["Vitest"]
  G --> T2["Playwright"]
  G --> T3["axe"]
  G --> T4["Hallmark design pass"]
  T1 --> S6["6-ship<br/>submission checklist"]
  T2 --> S6
  T3 --> S6
  T4 --> S6
  S6 --> D["Deploy to Cloudflare Worker"]
```
